-- =============================================================================
-- Vade — esquema do banco de dados (PostgreSQL 15+ / Supabase)
--
-- Ainda NÃO está aplicado em nenhum banco: o aplicativo roda em modo
-- demonstração, com os dados no navegador. Este arquivo é a primeira migração
-- de quando o banco for conectado, e segue o padrão de segurança do projeto
-- (SECURITY.md). O banco é a última camada: mesmo que o site e a API falhem,
-- ele não entrega dado a quem não pode ver.
--
-- Como a proteção funciona:
--   * public   — só o que a API expõe. RLS ligado em TODAS as tabelas, com uma
--                policy por ação. Sem policy = proibido.
--   * private  — funções e tabelas internas. Nunca exposto pela API.
--   * audit    — registro de alterações, gravado por gatilho, somente inserção.
--   * Cada linha pertence a um escritório (escritorio_id). O usuário nunca
--     informa o escritório: ele é preenchido e conferido pelo banco.
--   * O que cada papel pode fazer está na tabela da seção 12.
--   * Dinheiro em centavos (inteiro). Exclusão lógica (excluido_em).
--   * CPF e CNPJ de clientes ficam cifrados, em tabela fora da API.
--
-- Fora do Supabase (teste local), é preciso criar antes o schema `auth`, a
-- função `auth.uid()` e os papéis anon, authenticated e service_role:
-- veja database/teste-isolamento.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schemas internos (fora da API)
-- ---------------------------------------------------------------------------
create schema if not exists private;
create schema if not exists audit;

revoke all on schema private from public, anon;
revoke all on schema audit from public, anon, authenticated;
-- As policies e os valores padrão usam funções de private; o servidor também.
grant usage on schema private to authenticated, service_role;
grant usage on schema audit to service_role;

-- ---------------------------------------------------------------------------
-- 2. Tipos
-- ---------------------------------------------------------------------------
create type public.plano             as enum ('profissional', 'escritorio', 'enterprise');
create type public.papel             as enum ('socio', 'advogado', 'estagiario', 'financeiro');
create type public.tipo_pessoa       as enum ('PF', 'PJ');
create type public.origem_cliente    as enum ('indicacao', 'instagram', 'google', 'whatsapp', 'outro');
create type public.status_cliente    as enum ('lead', 'ativo', 'inativo');
create type public.etapa_funil       as enum ('novo', 'consulta', 'proposta', 'contrato');
create type public.area_direito      as enum ('previdenciario', 'trabalhista', 'familia', 'consumidor', 'civel');
create type public.fase_caso         as enum ('inicial', 'instrucao', 'sentenca', 'recurso', 'execucao', 'encerrado');
create type public.tipo_andamento    as enum ('publicacao', 'andamento', 'nota');
create type public.estado_sugestao   as enum ('pendente', 'confirmada', 'descartada');
create type public.origem_prazo      as enum ('manual', 'ia');
create type public.tipo_evento       as enum ('audiencia', 'reuniao', 'consulta', 'outro');
create type public.tipo_contrato     as enum ('fixo', 'parcelado', 'mensal', 'exito', 'hibrido');
create type public.tipo_lancamento   as enum ('receita', 'despesa');
create type public.forma_pagamento   as enum ('pix', 'boleto', 'cartao', 'transferencia');
create type public.categoria_despesa as enum ('pessoal', 'aluguel', 'sistemas', 'custas', 'marketing', 'outros');
create type public.modo_conversa     as enum ('ia', 'humano');
create type public.autor_mensagem    as enum ('cliente', 'ia', 'equipe');

-- ---------------------------------------------------------------------------
-- 3. Escritórios e equipe
-- ---------------------------------------------------------------------------
create table public.escritorios (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null check (char_length(trim(nome)) between 2 and 120),
  cidade         text check (char_length(cidade) <= 120),
  -- O plano é o que o escritório paga: só o servidor altera.
  plano          public.plano not null default 'profissional',
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  excluido_em    timestamptz
);

-- Um registro por pessoa da equipe, ligado ao login (auth.users).
-- O papel fica AQUI, nunca em metadados que o próprio usuário edita.
create table public.usuarios (
  id             uuid primary key references auth.users (id) on delete cascade,
  escritorio_id  uuid not null references public.escritorios (id) on delete cascade,
  nome           text not null check (char_length(trim(nome)) between 2 and 120),
  email          text not null check (char_length(email) between 3 and 200),
  papel          public.papel not null default 'advogado',
  oab            text check (char_length(oab) <= 30),
  -- Quem sai do escritório é desativado: perde o acesso na hora, e o histórico fica.
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (escritorio_id, id)
);
create index usuarios_escritorio_idx on public.usuarios (escritorio_id);

-- ---------------------------------------------------------------------------
-- 4. Funções de permissão (caminho de busca travado, sem acesso público)
--
-- SECURITY DEFINER para poderem ler `usuarios` de dentro das policies da
-- própria tabela, sem recursão. Ficam em `private`, fora da API.
-- ---------------------------------------------------------------------------
-- O escritório de quem está logado. Nulo para usuário desativado ou de
-- escritório encerrado: sem escritório, nenhuma policy libera nada.
create function private.escritorio_atual() returns uuid
language sql stable security definer set search_path = ''
as $$
  select u.escritorio_id
  from public.usuarios u
  join public.escritorios e on e.id = u.escritorio_id
  where u.id = (select auth.uid()) and u.ativo and e.excluido_em is null
$$;

create function private.tem_papel(p_papeis public.papel[]) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios u
    join public.escritorios e on e.id = u.escritorio_id
    where u.id = (select auth.uid()) and u.ativo and e.excluido_em is null and u.papel = any (p_papeis)
  )
$$;

-- Para as funções que o servidor chama em nome de um usuário: devolve o
-- escritório dele, se estiver ativo e tiver um dos papéis pedidos.
create function private.escritorio_de(p_usuario uuid, p_papeis public.papel[]) returns uuid
language sql stable set search_path = ''
as $$
  select u.escritorio_id
  from public.usuarios u
  join public.escritorios e on e.id = u.escritorio_id
  where u.id = p_usuario and u.ativo and e.excluido_em is null and u.papel = any (p_papeis)
$$;

-- atualizado_em automático
create function private.marcar_atualizacao() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- O escritório nunca pode ficar sem sócio ativo (ninguém conseguiria administrar).
create function private.proteger_ultimo_socio() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.papel = 'socio' and old.ativo and (new.papel <> 'socio' or not new.ativo) then
    -- Uma alteração de sócio por vez em cada escritório: dois sócios não se rebaixam ao mesmo tempo.
    perform pg_advisory_xact_lock(hashtextextended(old.escritorio_id::text, 0));
    if not exists (
      select 1 from public.usuarios u
      where u.escritorio_id = old.escritorio_id and u.id <> old.id and u.papel = 'socio' and u.ativo
    ) then
      raise exception 'O escritório precisa de pelo menos um sócio ativo' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger usuarios_ultimo_socio before update on public.usuarios
  for each row execute function private.proteger_ultimo_socio();

-- ---------------------------------------------------------------------------
-- 5. Clientes e casos
--
-- Padrão de toda tabela de dados: id impossível de adivinhar, escritorio_id
-- preenchido pelo banco, quem criou, quando, e exclusão lógica.
-- As chaves estrangeiras levam o escritório junto: um registro nunca aponta
-- para algo de outro escritório, mesmo que alguém descubra o identificador.
-- Apagar de verdade (só o servidor consegue) é bloqueado enquanto houver
-- registros ligados; apagar um usuário apenas solta o que era dele.
-- ---------------------------------------------------------------------------
create table public.clientes (
  id                   uuid primary key default gen_random_uuid(),
  escritorio_id        uuid not null default private.escritorio_atual() references public.escritorios (id) on delete cascade,
  tipo                 public.tipo_pessoa not null default 'PF',
  nome                 text not null check (char_length(trim(nome)) between 2 and 160),
  -- O CPF/CNPJ fica cifrado em private.documentos_de_clientes. Aqui só a versão
  -- mascarada para a tela (ex.: ***.456.789-**), gravada pelo servidor.
  documento_mascarado  text check (documento_mascarado ~ '^[0-9A-Z*./-]{11,18}$' and documento_mascarado like '%*%*%*%*%'),
  email                text check (char_length(email) <= 200),
  telefone             text check (char_length(telefone) <= 20),
  cidade               text check (char_length(cidade) <= 120),
  origem               public.origem_cliente not null default 'outro',
  status               public.status_cliente not null default 'ativo',
  etapa_funil          public.etapa_funil,
  area_interesse       public.area_direito,
  responsavel_id       uuid,
  observacoes          text check (char_length(observacoes) <= 4000),
  criado_por           uuid default auth.uid(),
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),
  excluido_em          timestamptz,
  unique (escritorio_id, id),
  foreign key (escritorio_id, responsavel_id) references public.usuarios (escritorio_id, id) on delete set null (responsavel_id),
  -- Etapa do funil só faz sentido para quem ainda não contratou.
  constraint etapa_so_para_lead check (status = 'lead' or etapa_funil is null)
);
create index clientes_escritorio_idx on public.clientes (escritorio_id, status) where excluido_em is null;

-- CPF e CNPJ: cifrados pela aplicação (AES-256-GCM, chave fora do banco) e
-- guardados fora da API. Só o servidor chega aqui, pelas funções da seção 10.
create table private.documentos_de_clientes (
  cliente_id         uuid primary key,
  escritorio_id      uuid not null,
  -- "v1:<iv>:<etiqueta>:<texto cifrado>", em base64url. O formato impede gravar o número aberto por engano.
  documento_cifrado  text not null check (documento_cifrado ~ '^v[0-9]{1,3}(:[A-Za-z0-9_-]+){3}$' and char_length(documento_cifrado) <= 400),
  -- HMAC-SHA256 do número, para achar o cliente pelo documento sem decifrar nada.
  documento_indice   text not null check (documento_indice ~ '^[0-9a-f]{64}$'),
  atualizado_em      timestamptz not null default now(),
  foreign key (escritorio_id, cliente_id) references public.clientes (escritorio_id, id) on delete cascade
);
create index documentos_indice_idx on private.documentos_de_clientes (escritorio_id, documento_indice);
revoke all on private.documentos_de_clientes from public, anon, authenticated;
grant select, insert, update, delete on private.documentos_de_clientes to service_role;

create table public.casos (
  id                    uuid primary key default gen_random_uuid(),
  escritorio_id         uuid not null default private.escritorio_atual() references public.escritorios (id) on delete cascade,
  cliente_id            uuid not null,
  titulo                text not null check (char_length(trim(titulo)) between 3 and 200),
  -- Numeração única do CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO (nulo em casos consultivos).
  numero_cnj            text check (numero_cnj ~ '^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$'),
  area                  public.area_direito not null,
  tipo_acao             text not null check (char_length(tipo_acao) between 1 and 200),
  orgao                 text check (char_length(orgao) <= 200),
  parte_contraria       text check (char_length(parte_contraria) <= 200),
  fase                  public.fase_caso not null default 'inicial',
  responsavel_id        uuid,
  valor_causa_centavos  bigint not null default 0 check (valor_causa_centavos >= 0),
  descricao             text check (char_length(descricao) <= 8000),
  criado_por            uuid default auth.uid(),
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  excluido_em           timestamptz,
  unique (escritorio_id, id),
  foreign key (escritorio_id, cliente_id) references public.clientes (escritorio_id, id) on delete no action,
  foreign key (escritorio_id, responsavel_id) references public.usuarios (escritorio_id, id) on delete set null (responsavel_id)
);
create index casos_escritorio_idx on public.casos (escritorio_id, fase) where excluido_em is null;
create index casos_cliente_idx on public.casos (escritorio_id, cliente_id);
create unique index casos_cnj_unico on public.casos (escritorio_id, numero_cnj) where numero_cnj is not null and excluido_em is null;

create table public.andamentos (
  id                       uuid primary key default gen_random_uuid(),
  escritorio_id            uuid not null default private.escritorio_atual() references public.escritorios (id) on delete cascade,
  caso_id                  uuid not null,
  data                     date not null,
  tipo                     public.tipo_andamento not null default 'andamento',
  titulo                   text not null check (char_length(titulo) between 1 and 200),
  descricao                text not null default '' check (char_length(descricao) <= 8000),
  resumo_ia                text check (char_length(resumo_ia) <= 2000),
  -- Prazo sugerido pela IA a partir de uma publicação (o advogado confirma).
  sugestao_titulo          text check (char_length(sugestao_titulo) <= 200),
  sugestao_dias_uteis      integer check (sugestao_dias_uteis between 1 and 365),
  sugestao_data_fatal      date,
  sugestao_data_interna    date,
  sugestao_responsavel_id  uuid,
  sugestao_estado          public.estado_sugestao,
  criado_por               uuid default auth.uid(),
  criado_em                timestamptz not null default now(),
  atualizado_em            timestamptz not null default now(),
  excluido_em              timestamptz,
  foreign key (escritorio_id, caso_id) references public.casos (escritorio_id, id) on delete no action,
  foreign key (escritorio_id, sugestao_responsavel_id) references public.usuarios (escritorio_id, id) on delete set null (sugestao_responsavel_id)
);
create index andamentos_caso_idx on public.andamentos (escritorio_id, caso_id, data desc);
create index andamentos_pendentes_idx on public.andamentos (escritorio_id) where sugestao_estado = 'pendente' and excluido_em is null;

create table public.prazos (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null default private.escritorio_atual() references public.escritorios (id) on delete cascade,
  caso_id         uuid not null,
  titulo          text not null check (char_length(titulo) between 1 and 200),
  data_fatal      date not null,
  data_interna    date not null,
  responsavel_id  uuid,
  origem          public.origem_prazo not null default 'manual',
  concluido_em    date,
  criado_por      uuid default auth.uid(),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  excluido_em     timestamptz,
  foreign key (escritorio_id, caso_id) references public.casos (escritorio_id, id) on delete no action,
  foreign key (escritorio_id, responsavel_id) references public.usuarios (escritorio_id, id) on delete set null (responsavel_id),
  constraint interna_antes_da_fatal check (data_interna <= data_fatal)
);
create index prazos_abertos_idx on public.prazos (escritorio_id, data_fatal) where concluido_em is null and excluido_em is null;
create index prazos_caso_idx on public.prazos (escritorio_id, caso_id);

create table public.eventos (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null default private.escritorio_atual() references public.escritorios (id) on delete cascade,
  titulo          text not null check (char_length(titulo) between 1 and 200),
  tipo            public.tipo_evento not null default 'reuniao',
  inicio          timestamptz not null,
  fim             timestamptz not null,
  local           text check (char_length(local) <= 200),
  caso_id         uuid,
  cliente_id      uuid,
  responsavel_id  uuid,
  -- Só o servidor marca um compromisso como criado pela IA.
  criado_por_ia   boolean not null default false,
  criado_por      uuid default auth.uid(),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  excluido_em     timestamptz,
  foreign key (escritorio_id, caso_id) references public.casos (escritorio_id, id) on delete no action,
  foreign key (escritorio_id, cliente_id) references public.clientes (escritorio_id, id) on delete no action,
  foreign key (escritorio_id, responsavel_id) references public.usuarios (escritorio_id, id) on delete set null (responsavel_id),
  constraint fim_depois_do_inicio check (fim > inicio)
);
create index eventos_escritorio_idx on public.eventos (escritorio_id, inicio) where excluido_em is null;
create index eventos_caso_idx on public.eventos (escritorio_id, caso_id) where caso_id is not null;
create index eventos_cliente_idx on public.eventos (escritorio_id, cliente_id) where cliente_id is not null;

-- ---------------------------------------------------------------------------
-- 6. Financeiro (valores sempre em centavos, nunca em número quebrado)
-- ---------------------------------------------------------------------------
create table public.contratos (
  id                    uuid primary key default gen_random_uuid(),
  escritorio_id         uuid not null default private.escritorio_atual() references public.escritorios (id) on delete cascade,
  cliente_id            uuid not null,
  caso_id               uuid,
  tipo                  public.tipo_contrato not null,
  descricao             text not null check (char_length(descricao) between 1 and 300),
  valor_total_centavos  bigint not null default 0 check (valor_total_centavos >= 0),
  percentual_exito      numeric(5, 2) check (percentual_exito > 0 and percentual_exito <= 100),
  inicio                date not null default current_date,
  ativo                 boolean not null default true,
  criado_por            uuid default auth.uid(),
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  excluido_em           timestamptz,
  unique (escritorio_id, id),
  foreign key (escritorio_id, cliente_id) references public.clientes (escritorio_id, id) on delete no action,
  foreign key (escritorio_id, caso_id) references public.casos (escritorio_id, id) on delete no action
);
create index contratos_cliente_idx on public.contratos (escritorio_id, cliente_id);
create index contratos_caso_idx on public.contratos (escritorio_id, caso_id) where caso_id is not null;

create table public.lancamentos (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null default private.escritorio_atual() references public.escritorios (id) on delete cascade,
  tipo            public.tipo_lancamento not null,
  descricao       text not null check (char_length(descricao) between 1 and 300),
  valor_centavos  bigint not null check (valor_centavos > 0),
  vencimento      date not null,
  pago_em         date,
  forma           public.forma_pagamento,
  cliente_id      uuid,
  caso_id         uuid,
  contrato_id     uuid,
  categoria       public.categoria_despesa,
  criado_por      uuid default auth.uid(),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  excluido_em     timestamptz,
  foreign key (escritorio_id, cliente_id) references public.clientes (escritorio_id, id) on delete no action,
  foreign key (escritorio_id, caso_id) references public.casos (escritorio_id, id) on delete no action,
  foreign key (escritorio_id, contrato_id) references public.contratos (escritorio_id, id) on delete no action,
  -- Categoria é de despesa; cliente, caso e contrato são de receita.
  constraint campos_por_tipo check (
    (tipo = 'despesa' and cliente_id is null and contrato_id is null)
    or (tipo = 'receita' and categoria is null)
  )
);
create index lancamentos_vencimento_idx on public.lancamentos (escritorio_id, tipo, vencimento) where excluido_em is null;
create index lancamentos_em_aberto_idx on public.lancamentos (escritorio_id, vencimento) where pago_em is null and excluido_em is null;
create index lancamentos_cliente_idx on public.lancamentos (escritorio_id, cliente_id) where cliente_id is not null;
create index lancamentos_caso_idx on public.lancamentos (escritorio_id, caso_id) where caso_id is not null;
create index lancamentos_contrato_idx on public.lancamentos (escritorio_id, contrato_id) where contrato_id is not null;

-- ---------------------------------------------------------------------------
-- 7. Atendimento (WhatsApp)
-- ---------------------------------------------------------------------------
create table public.conversas (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null default private.escritorio_atual() references public.escritorios (id) on delete cascade,
  nome           text not null check (char_length(nome) between 1 and 160),
  telefone       text not null check (telefone ~ '^\d{10,15}$'),
  cliente_id     uuid,
  modo           public.modo_conversa not null default 'ia',
  nao_lidas      integer not null default 0 check (nao_lidas >= 0),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  excluido_em    timestamptz,
  unique (escritorio_id, id),
  unique (escritorio_id, telefone),
  foreign key (escritorio_id, cliente_id) references public.clientes (escritorio_id, id) on delete no action
);
create index conversas_cliente_idx on public.conversas (escritorio_id, cliente_id) where cliente_id is not null;

-- Mensagens não são editadas nem apagadas. As do cliente e as da IA só o
-- servidor grava; a equipe só consegue gravar mensagens em nome da equipe.
create table public.mensagens (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null default private.escritorio_atual() references public.escritorios (id) on delete cascade,
  conversa_id    uuid not null,
  de             public.autor_mensagem not null,
  texto          text not null check (char_length(texto) between 1 and 4096),
  -- Identificador da mensagem no WhatsApp, para não gravar o mesmo evento duas vezes.
  id_externo     text check (char_length(id_externo) <= 256),
  criado_por     uuid default auth.uid(),
  enviada_em     timestamptz not null default now(),
  foreign key (escritorio_id, conversa_id) references public.conversas (escritorio_id, id) on delete cascade
);
create index mensagens_conversa_idx on public.mensagens (escritorio_id, conversa_id, enviada_em);
create unique index mensagens_id_externo_unico on public.mensagens (escritorio_id, id_externo) where id_externo is not null;

-- ---------------------------------------------------------------------------
-- 8. Auditoria: quem fez o quê. Somente inserção; ninguém edita nem apaga.
-- ---------------------------------------------------------------------------
create table audit.logs (
  id             bigint generated always as identity primary key,
  em             timestamptz not null default now(),
  autor          uuid,
  escritorio_id  uuid,
  acao           text not null check (char_length(acao) between 3 and 60),
  tabela         text not null check (char_length(tabela) <= 120),
  registro_id    text check (char_length(registro_id) <= 80),
  antes          jsonb,
  depois         jsonb
);
create index logs_escritorio_idx on audit.logs (escritorio_id, id desc);
revoke all on audit.logs from public, anon, authenticated;
grant select, insert on audit.logs to service_role;

-- Tira do registro o conteúdo dos campos sigilosos: fica só a marca de que existiam.
create function private.omitir_campos(p_linha jsonb, p_campos text[]) returns jsonb
language sql immutable set search_path = ''
as $$
  select coalesce(
    jsonb_object_agg(c.chave, case when c.chave = any (p_campos) and jsonb_typeof(c.valor) <> 'null' then '"[omitido]"'::jsonb else c.valor end),
    '{}'::jsonb
  )
  from jsonb_each(p_linha) as c (chave, valor)
$$;

create function private.auditar() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  -- Texto livre sobre o cliente e sobre o caso é sigilo profissional: não vai para o registro.
  v_sigilosos constant text[] := case tg_table_name
    when 'clientes' then array['observacoes', 'documento_mascarado']
    when 'casos'    then array['descricao']
    else array[]::text[]
  end;
  v_antes  jsonb;
  v_depois jsonb;
  v_campo  text;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_antes := private.omitir_campos(to_jsonb(old), v_sigilosos); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_depois := private.omitir_campos(to_jsonb(new), v_sigilosos); end if;

  -- Numa alteração, o registro mostra que o campo sigiloso mudou, sem mostrar o conteúdo.
  if tg_op = 'UPDATE' then
    foreach v_campo in array v_sigilosos loop
      if (to_jsonb(old) -> v_campo) is distinct from (to_jsonb(new) -> v_campo) then
        v_depois := jsonb_set(v_depois, array[v_campo], '"[alterado]"'::jsonb);
      end if;
    end loop;
  end if;

  insert into audit.logs (autor, escritorio_id, acao, tabela, registro_id, antes, depois)
  values (
    (select auth.uid()),
    coalesce(v_depois ->> 'escritorio_id', v_antes ->> 'escritorio_id', case when tg_table_name = 'escritorios' then coalesce(v_depois ->> 'id', v_antes ->> 'id') end)::uuid,
    tg_op,
    tg_table_schema || '.' || tg_table_name,
    coalesce(v_depois ->> 'id', v_antes ->> 'id'),
    v_antes,
    v_depois
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create function private.bloquear_alteracao_da_auditoria() returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'audit.logs aceita apenas inserção' using errcode = 'insufficient_privilege';
end;
$$;

create trigger logs_imutaveis before update or delete on audit.logs
  for each row execute function private.bloquear_alteracao_da_auditoria();
create trigger logs_sem_truncate before truncate on audit.logs
  for each statement execute function private.bloquear_alteracao_da_auditoria();

-- Gatilhos de atualização e de auditoria em todas as tabelas de dados.
-- (Mensagens ficam fora da auditoria: o conteúdo das conversas não vai para o registro.)
do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array['escritorios', 'usuarios', 'clientes', 'casos', 'andamentos', 'prazos', 'eventos', 'contratos', 'lancamentos', 'conversas']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function private.marcar_atualizacao()', v_tabela || '_atualizacao', v_tabela);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.auditar()', v_tabela || '_auditoria', v_tabela);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Webhooks: cada evento é processado uma única vez
-- ---------------------------------------------------------------------------
create table private.webhook_events (
  provedor     text not null check (char_length(provedor) between 1 and 40),
  evento_id    text not null check (char_length(evento_id) between 1 and 256),
  recebido_em  timestamptz not null default now(),
  primary key (provedor, evento_id)
);
revoke all on private.webhook_events from public, anon, authenticated;
grant select, insert on private.webhook_events to service_role;

-- O servidor chama esta função com a chave de serviço: devolve true só na primeira vez.
create function public.registrar_evento_webhook(p_provedor text, p_evento_id text) returns boolean
language plpgsql set search_path = ''
as $$
begin
  insert into private.webhook_events (provedor, evento_id) values (p_provedor, p_evento_id)
  on conflict do nothing;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Funções que só o servidor chama (chave de serviço)
--
-- O servidor informa em nome de qual usuário está agindo (p_autor), e o banco
-- confere de novo o escritório e o papel dele. Assim, um erro no código do
-- servidor não entrega dado de um escritório a outro.
-- ---------------------------------------------------------------------------
-- Eventos de segurança que não nascem de uma tabela: login, exportação, troca de senha...
create function public.registrar_auditoria(p_autor uuid, p_acao text, p_registro_id text default null, p_detalhes jsonb default null) returns void
language plpgsql set search_path = ''
as $$
begin
  if p_acao is null or p_acao !~ '^[A-Z][A-Z0-9_]{2,59}$' then
    raise exception 'Ação de auditoria inválida' using errcode = 'check_violation';
  end if;
  if p_detalhes is not null and pg_column_size(p_detalhes) > 8192 then
    raise exception 'Detalhes de auditoria grandes demais' using errcode = 'check_violation';
  end if;
  insert into audit.logs (autor, escritorio_id, acao, tabela, registro_id, depois)
  values (p_autor, (select u.escritorio_id from public.usuarios u where u.id = p_autor), p_acao, 'servidor', p_registro_id, p_detalhes);
end;
$$;

-- Grava (ou troca) o documento cifrado de um cliente. Sócio ou advogado do mesmo escritório.
create function public.salvar_documento_do_cliente(p_cliente_id uuid, p_autor uuid, p_cifrado text, p_indice text, p_mascarado text) returns void
language plpgsql set search_path = ''
as $$
declare
  v_escritorio uuid := private.escritorio_de(p_autor, array['socio', 'advogado']::public.papel[]);
begin
  if v_escritorio is null or not exists (
    select 1 from public.clientes c where c.id = p_cliente_id and c.escritorio_id = v_escritorio and c.excluido_em is null
  ) then
    raise exception 'Sem permissão para alterar o documento deste cliente' using errcode = 'insufficient_privilege';
  end if;

  insert into private.documentos_de_clientes (cliente_id, escritorio_id, documento_cifrado, documento_indice)
  values (p_cliente_id, v_escritorio, p_cifrado, p_indice)
  on conflict (cliente_id) do update
    set documento_cifrado = excluded.documento_cifrado, documento_indice = excluded.documento_indice, atualizado_em = now();

  update public.clientes set documento_mascarado = p_mascarado where id = p_cliente_id and escritorio_id = v_escritorio;

  insert into audit.logs (autor, escritorio_id, acao, tabela, registro_id)
  values (p_autor, v_escritorio, 'SALVAR_DOCUMENTO', 'public.clientes', p_cliente_id::text);
end;
$$;

-- Devolve o documento cifrado (o servidor decifra). Sócio, advogado ou financeiro
-- do mesmo escritório. Toda tentativa fica registrada, a atendida e a recusada.
create function public.revelar_documento_do_cliente(p_cliente_id uuid, p_autor uuid) returns text
language plpgsql set search_path = ''
as $$
declare
  v_escritorio uuid := private.escritorio_de(p_autor, array['socio', 'advogado', 'financeiro']::public.papel[]);
  v_cifrado    text;
begin
  if v_escritorio is not null then
    select d.documento_cifrado into v_cifrado
    from private.documentos_de_clientes d
    join public.clientes c on c.id = d.cliente_id and c.escritorio_id = d.escritorio_id
    where d.cliente_id = p_cliente_id and d.escritorio_id = v_escritorio and c.excluido_em is null;
  end if;

  insert into audit.logs (autor, escritorio_id, acao, tabela, registro_id)
  values (
    p_autor,
    (select u.escritorio_id from public.usuarios u where u.id = p_autor),
    case when v_cifrado is null then 'REVELAR_DOCUMENTO_RECUSADO' else 'REVELAR_DOCUMENTO' end,
    'public.clientes',
    p_cliente_id::text
  );
  return v_cifrado;
end;
$$;

-- Acha clientes do escritório de quem pede pelo índice do documento (sem decifrar nada).
create function public.buscar_cliente_por_documento(p_autor uuid, p_indice text) returns setof uuid
language sql stable set search_path = ''
as $$
  select d.cliente_id
  from private.documentos_de_clientes d
  join public.clientes c on c.id = d.cliente_id and c.escritorio_id = d.escritorio_id
  where d.escritorio_id = private.escritorio_de(p_autor, array['socio', 'advogado', 'estagiario', 'financeiro']::public.papel[])
    and d.documento_indice = p_indice
    and c.excluido_em is null
$$;

-- ---------------------------------------------------------------------------
-- 11. Exclusão lógica e leitura da auditoria (o trabalho fica em private)
-- ---------------------------------------------------------------------------
-- Excluir = marcar excluido_em. A linha some das consultas, mas continua no
-- banco e na auditoria. Não existe permissão de DELETE para os usuários.
create function private.excluir_registro(p_tabela text, p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_escritorio uuid := private.escritorio_atual();
  v_agora      timestamptz := now();
  v_papeis     public.papel[];
  v_afetadas   integer;
begin
  v_papeis := case p_tabela
    when 'clientes'    then array['socio', 'advogado']::public.papel[]
    when 'casos'       then array['socio', 'advogado']::public.papel[]
    when 'andamentos'  then array['socio', 'advogado']::public.papel[]
    when 'prazos'      then array['socio', 'advogado']::public.papel[]
    when 'eventos'     then array['socio', 'advogado']::public.papel[]
    when 'conversas'   then array['socio', 'advogado']::public.papel[]
    when 'contratos'   then array['socio', 'financeiro']::public.papel[]
    when 'lancamentos' then array['socio', 'financeiro']::public.papel[]
  end;
  -- Tabela fora da lista, usuário sem escritório ou papel sem permissão: negado.
  if v_papeis is null or v_escritorio is null or not private.tem_papel(v_papeis) then
    raise exception 'Sem permissão para excluir' using errcode = 'insufficient_privilege';
  end if;

  -- Cliente com caso ou contrato em aberto não é excluído: evita apagar em massa por engano.
  if p_tabela = 'clientes' and (
    exists (select 1 from public.casos c where c.escritorio_id = v_escritorio and c.cliente_id = p_id and c.excluido_em is null)
    or exists (select 1 from public.contratos k where k.escritorio_id = v_escritorio and k.cliente_id = p_id and k.excluido_em is null)
  ) then
    raise exception 'Exclua antes os casos e os contratos deste cliente' using errcode = 'check_violation';
  end if;

  execute format('update public.%I set excluido_em = $1 where id = $2 and escritorio_id = $3 and excluido_em is null', p_tabela)
    using v_agora, p_id, v_escritorio;
  get diagnostics v_afetadas = row_count;
  if v_afetadas = 0 then
    raise exception 'Registro não encontrado' using errcode = 'no_data_found';
  end if;

  -- Andamentos e prazos não existem sem o caso: saem junto, para nenhum prazo continuar avisando.
  if p_tabela = 'casos' then
    update public.andamentos set excluido_em = v_agora where escritorio_id = v_escritorio and caso_id = p_id and excluido_em is null;
    update public.prazos     set excluido_em = v_agora where escritorio_id = v_escritorio and caso_id = p_id and excluido_em is null;
  end if;
end;
$$;

create function public.excluir_registro(p_tabela text, p_id uuid) returns void
language sql set search_path = ''
as $$ select private.excluir_registro(p_tabela, p_id) $$;

-- Só sócios leem a auditoria, só a do próprio escritório, e no máximo 200 linhas por vez.
create function private.ver_auditoria(p_limite integer, p_antes_de bigint) returns setof audit.logs
language sql stable security definer set search_path = ''
as $$
  select l.* from audit.logs l
  where private.tem_papel(array['socio']::public.papel[])
    and l.escritorio_id = private.escritorio_atual()
    and (p_antes_de is null or l.id < p_antes_de)
  order by l.id desc
  limit least(greatest(coalesce(p_limite, 50), 1), 200)
$$;

create function public.ver_auditoria(p_limite integer default 50, p_antes_de bigint default null)
returns table (id bigint, em timestamptz, autor uuid, acao text, tabela text, registro_id text, antes jsonb, depois jsonb)
language sql stable set search_path = ''
as $$
  select l.id, l.em, l.autor, l.acao, l.tabela, l.registro_id, l.antes, l.depois from private.ver_auditoria(p_limite, p_antes_de) l
$$;

-- ---------------------------------------------------------------------------
-- 12. Row Level Security: tudo fechado; abre só o necessário, por ação
--
--  Papel       | clientes, casos | andamentos, prazos | eventos    | financeiro  | conversas  | equipe e escritório
--  ------------+-----------------+--------------------+------------+-------------+------------+--------------------
--  socio       | lê e edita      | lê e edita         | lê e edita | lê e edita  | lê e edita | lê e edita
--  advogado    | lê e edita      | lê e edita         | lê e edita | só lê       | lê e edita | só lê
--  estagiario  | só lê           | lê e edita         | lê e edita | nada        | lê e edita | só lê
--  financeiro  | só lê           | nada               | só lê      | lê e edita  | nada       | só lê
--
--  Excluir (lógico) é pela função excluir_registro, com regra própria por tabela.
--  Criar escritório e usuário, e mudar o plano, é só pelo servidor (chave de serviço).
-- ---------------------------------------------------------------------------
alter table public.escritorios enable row level security;
alter table public.usuarios    enable row level security;
alter table public.clientes    enable row level security;
alter table public.casos       enable row level security;
alter table public.andamentos  enable row level security;
alter table public.prazos      enable row level security;
alter table public.eventos     enable row level security;
alter table public.contratos   enable row level security;
alter table public.lancamentos enable row level security;
alter table public.conversas   enable row level security;
alter table public.mensagens   enable row level security;

-- Escritório: a equipe vê o seu; só sócio edita.
create policy escritorios_ver on public.escritorios for select to authenticated
  using (id = (select private.escritorio_atual()) and excluido_em is null);
create policy escritorios_editar on public.escritorios for update to authenticated
  using (id = (select private.escritorio_atual()) and (select private.tem_papel('{socio}')))
  with check (id = (select private.escritorio_atual()) and (select private.tem_papel('{socio}')));

-- Equipe: todos veem os colegas do próprio escritório; só sócio altera (papel, ativo, nome, OAB).
create policy usuarios_ver on public.usuarios for select to authenticated
  using (escritorio_id = (select private.escritorio_atual()));
create policy usuarios_editar on public.usuarios for update to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio}')))
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio}')));

-- Clientes
create policy clientes_ver on public.clientes for select to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null);
create policy clientes_criar on public.clientes for insert to authenticated
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,advogado}')));
create policy clientes_editar on public.clientes for update to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,advogado}')))
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,advogado}')));

-- Casos
create policy casos_ver on public.casos for select to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null);
create policy casos_criar on public.casos for insert to authenticated
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,advogado}')));
create policy casos_editar on public.casos for update to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,advogado}')))
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,advogado}')));

-- Andamentos
create policy andamentos_ver on public.andamentos for select to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,advogado,estagiario}')));
create policy andamentos_criar on public.andamentos for insert to authenticated
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,advogado,estagiario}')));
create policy andamentos_editar on public.andamentos for update to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,advogado,estagiario}')))
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,advogado,estagiario}')));

-- Prazos
create policy prazos_ver on public.prazos for select to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,advogado,estagiario}')));
create policy prazos_criar on public.prazos for insert to authenticated
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,advogado,estagiario}')));
create policy prazos_editar on public.prazos for update to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,advogado,estagiario}')))
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,advogado,estagiario}')));

-- Eventos
create policy eventos_ver on public.eventos for select to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null);
create policy eventos_criar on public.eventos for insert to authenticated
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,advogado,estagiario}')));
create policy eventos_editar on public.eventos for update to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,advogado,estagiario}')))
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,advogado,estagiario}')));

-- Financeiro: estagiário não vê; advogado só lê; sócio e financeiro editam.
create policy contratos_ver on public.contratos for select to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,financeiro,advogado}')));
create policy contratos_criar on public.contratos for insert to authenticated
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,financeiro}')));
create policy contratos_editar on public.contratos for update to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,financeiro}')))
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,financeiro}')));

create policy lancamentos_ver on public.lancamentos for select to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,financeiro,advogado}')));
create policy lancamentos_criar on public.lancamentos for insert to authenticated
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,financeiro}')));
create policy lancamentos_editar on public.lancamentos for update to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,financeiro}')))
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,financeiro}')));

-- Atendimento: financeiro não participa. A equipe só grava mensagem em nome da equipe,
-- e as mensagens de uma conversa excluída somem junto com ela.
create policy conversas_ver on public.conversas for select to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,advogado,estagiario}')));
create policy conversas_criar on public.conversas for insert to authenticated
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,advogado,estagiario}')));
create policy conversas_editar on public.conversas for update to authenticated
  using (escritorio_id = (select private.escritorio_atual()) and excluido_em is null and (select private.tem_papel('{socio,advogado,estagiario}')))
  with check (escritorio_id = (select private.escritorio_atual()) and (select private.tem_papel('{socio,advogado,estagiario}')));

create policy mensagens_ver on public.mensagens for select to authenticated
  using (
    escritorio_id = (select private.escritorio_atual())
    and (select private.tem_papel('{socio,advogado,estagiario}'))
    and exists (select 1 from public.conversas c where c.id = mensagens.conversa_id and c.excluido_em is null)
  );
create policy mensagens_criar on public.mensagens for insert to authenticated
  with check (
    escritorio_id = (select private.escritorio_atual())
    and de = 'equipe'
    and (select private.tem_papel('{socio,advogado,estagiario}'))
    and exists (select 1 from public.conversas c where c.id = mensagens.conversa_id and c.excluido_em is null)
  );

-- ---------------------------------------------------------------------------
-- 13. Permissões (lista branca)
--
-- O usuário só consegue enviar os campos listados aqui. Escritório, quem criou,
-- datas de controle e exclusão nunca vêm do navegador.
-- Não há nenhum GRANT de DELETE, e nenhum GRANT para o visitante sem login.
-- ---------------------------------------------------------------------------
revoke all on
  public.escritorios, public.usuarios, public.clientes, public.casos, public.andamentos, public.prazos,
  public.eventos, public.contratos, public.lancamentos, public.conversas, public.mensagens
from public, anon, authenticated;

grant select on
  public.escritorios, public.usuarios, public.clientes, public.casos, public.andamentos, public.prazos,
  public.eventos, public.contratos, public.lancamentos, public.conversas, public.mensagens
to authenticated;

grant update (nome, cidade) on public.escritorios to authenticated;
grant update (nome, oab, papel, ativo) on public.usuarios to authenticated;

grant insert (tipo, nome, email, telefone, cidade, origem, status, etapa_funil, area_interesse, responsavel_id, observacoes),
      update (tipo, nome, email, telefone, cidade, origem, status, etapa_funil, area_interesse, responsavel_id, observacoes)
  on public.clientes to authenticated;

grant insert (cliente_id, titulo, numero_cnj, area, tipo_acao, orgao, parte_contraria, fase, responsavel_id, valor_causa_centavos, descricao),
      update (cliente_id, titulo, numero_cnj, area, tipo_acao, orgao, parte_contraria, fase, responsavel_id, valor_causa_centavos, descricao)
  on public.casos to authenticated;

grant insert (caso_id, data, tipo, titulo, descricao, sugestao_titulo, sugestao_dias_uteis, sugestao_data_fatal, sugestao_data_interna, sugestao_responsavel_id, sugestao_estado),
      update (data, tipo, titulo, descricao, sugestao_estado)
  on public.andamentos to authenticated;

grant insert (caso_id, titulo, data_fatal, data_interna, responsavel_id, origem),
      update (titulo, data_fatal, data_interna, responsavel_id, concluido_em)
  on public.prazos to authenticated;

grant insert (titulo, tipo, inicio, fim, local, caso_id, cliente_id, responsavel_id),
      update (titulo, tipo, inicio, fim, local, caso_id, cliente_id, responsavel_id)
  on public.eventos to authenticated;

grant insert (cliente_id, caso_id, tipo, descricao, valor_total_centavos, percentual_exito, inicio, ativo),
      update (descricao, valor_total_centavos, percentual_exito, inicio, ativo)
  on public.contratos to authenticated;

grant insert (tipo, descricao, valor_centavos, vencimento, pago_em, forma, cliente_id, caso_id, contrato_id, categoria),
      update (descricao, valor_centavos, vencimento, pago_em, forma, categoria)
  on public.lancamentos to authenticated;

grant insert (nome, telefone, cliente_id, modo),
      update (nome, cliente_id, modo, nao_lidas)
  on public.conversas to authenticated;

grant insert (conversa_id, de, texto) on public.mensagens to authenticated;

-- O servidor (chave de serviço) passa por cima do RLS, mas precisa das permissões de tabela.
grant all on
  public.escritorios, public.usuarios, public.clientes, public.casos, public.andamentos, public.prazos,
  public.eventos, public.contratos, public.lancamentos, public.conversas, public.mensagens
to service_role;

-- Funções: nenhuma fica aberta por padrão. Primeiro fecha tudo, depois abre uma a uma.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.escritorio_atual() to authenticated, service_role;
grant execute on function private.tem_papel(public.papel[]) to authenticated, service_role;
grant execute on function private.excluir_registro(text, uuid) to authenticated;
grant execute on function private.ver_auditoria(integer, bigint) to authenticated;
grant execute on function private.escritorio_de(uuid, public.papel[]) to service_role;

-- Para a equipe logada
revoke all on function public.excluir_registro(text, uuid) from public, anon;
revoke all on function public.ver_auditoria(integer, bigint) from public, anon;
grant execute on function public.excluir_registro(text, uuid) to authenticated;
grant execute on function public.ver_auditoria(integer, bigint) to authenticated;

-- Só para o servidor
revoke all on function public.registrar_evento_webhook(text, text) from public, anon, authenticated;
revoke all on function public.registrar_auditoria(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.salvar_documento_do_cliente(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.revelar_documento_do_cliente(uuid, uuid) from public, anon, authenticated;
revoke all on function public.buscar_cliente_por_documento(uuid, text) from public, anon, authenticated;
grant execute on function public.registrar_evento_webhook(text, text) to service_role;
grant execute on function public.registrar_auditoria(uuid, text, text, jsonb) to service_role;
grant execute on function public.salvar_documento_do_cliente(uuid, uuid, text, text, text) to service_role;
grant execute on function public.revelar_documento_do_cliente(uuid, uuid) to service_role;
grant execute on function public.buscar_cliente_por_documento(uuid, text) to service_role;
