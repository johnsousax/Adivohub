-- =============================================================================
-- Vade — esquema inicial do banco de dados (PostgreSQL 15+ / Supabase)
--
-- AINDA NÃO ESTÁ APLICADO em lugar nenhum: o aplicativo roda em modo
-- demonstração, com os dados no navegador. Este arquivo é o ponto de partida
-- para conectar o banco, e espelha os tipos de src/lib/tipos.ts.
--
-- Como usar no Supabase: SQL Editor → colar e executar (ou salvar como migração).
-- Fora do Supabase, é preciso existir o esquema `auth` com a tabela `auth.users`
-- e a função `auth.uid()` (ver database/README.md).
--
-- Isolamento entre escritórios: todas as tabelas têm `escritorio_id` e Row Level
-- Security. Um usuário só enxerga as linhas do próprio escritório.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type plano            as enum ('profissional', 'escritorio', 'enterprise');
create type papel            as enum ('socio', 'advogado', 'estagiario', 'financeiro');
create type tipo_pessoa      as enum ('PF', 'PJ');
create type origem_cliente   as enum ('indicacao', 'instagram', 'google', 'whatsapp', 'outro');
create type status_cliente   as enum ('lead', 'ativo', 'inativo');
create type etapa_funil      as enum ('novo', 'consulta', 'proposta', 'contrato');
create type area_direito     as enum ('previdenciario', 'trabalhista', 'familia', 'consumidor', 'civel');
create type fase_caso        as enum ('inicial', 'instrucao', 'sentenca', 'recurso', 'execucao', 'encerrado');
create type tipo_andamento   as enum ('publicacao', 'andamento', 'nota');
create type estado_sugestao  as enum ('pendente', 'confirmada', 'descartada');
create type origem_prazo     as enum ('manual', 'ia');
create type tipo_evento      as enum ('audiencia', 'reuniao', 'consulta', 'outro');
create type tipo_contrato    as enum ('fixo', 'parcelado', 'mensal', 'exito', 'hibrido');
create type tipo_lancamento  as enum ('receita', 'despesa');
create type forma_pagamento  as enum ('pix', 'boleto', 'cartao', 'transferencia');
create type categoria_despesa as enum ('pessoal', 'aluguel', 'sistemas', 'custas', 'marketing', 'outros');
create type modo_conversa    as enum ('ia', 'humano');
create type autor_mensagem   as enum ('cliente', 'ia', 'equipe');

-- ---------------------------------------------------------------------------
-- Escritórios e usuários
-- ---------------------------------------------------------------------------
create table escritorios (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (length(trim(nome)) >= 2),
  cidade     text,
  plano      plano not null default 'profissional',
  criado_em  timestamptz not null default now()
);

-- Um registro por pessoa da equipe, ligado ao login (auth.users).
create table usuarios (
  id             uuid primary key references auth.users (id) on delete cascade,
  escritorio_id  uuid not null references escritorios (id) on delete cascade,
  nome           text not null,
  email          text not null,
  papel          papel not null default 'advogado',
  oab            text,
  criado_em      timestamptz not null default now()
);
create index usuarios_escritorio_idx on usuarios (escritorio_id);

-- Escritório do usuário logado. SECURITY DEFINER para poder ser usada dentro
-- das políticas da própria tabela `usuarios` sem recursão.
create function escritorio_atual() returns uuid
language sql stable security definer set search_path = public
as $$ select escritorio_id from usuarios where id = auth.uid() $$;

revoke all on function escritorio_atual() from public;
grant execute on function escritorio_atual() to authenticated;

-- ---------------------------------------------------------------------------
-- Clientes e casos
-- ---------------------------------------------------------------------------
create table clientes (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete cascade,
  tipo            tipo_pessoa not null default 'PF',
  nome            text not null check (length(trim(nome)) >= 2),
  documento       text,
  email           text,
  telefone        text,
  cidade          text,
  origem          origem_cliente not null default 'outro',
  status          status_cliente not null default 'ativo',
  etapa_funil     etapa_funil,
  area_interesse  area_direito,
  responsavel_id  uuid references usuarios (id) on delete set null,
  observacoes     text,
  criado_em       timestamptz not null default now(),
  -- Etapa do funil só faz sentido para quem ainda não contratou.
  constraint etapa_so_para_lead check (status = 'lead' or etapa_funil is null)
);
create index clientes_escritorio_idx on clientes (escritorio_id, status);

create table casos (
  id               uuid primary key default gen_random_uuid(),
  escritorio_id    uuid not null references escritorios (id) on delete cascade,
  cliente_id       uuid not null references clientes (id) on delete cascade,
  titulo           text not null check (length(trim(titulo)) >= 3),
  -- Numeração única do CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO (nulo em casos consultivos).
  numero_cnj       text check (numero_cnj ~ '^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$'),
  area             area_direito not null,
  tipo_acao        text not null,
  orgao            text,
  parte_contraria  text,
  fase             fase_caso not null default 'inicial',
  responsavel_id   uuid references usuarios (id) on delete set null,
  valor_causa      numeric(14, 2) not null default 0 check (valor_causa >= 0),
  descricao        text,
  criado_em        timestamptz not null default now()
);
create index casos_escritorio_idx on casos (escritorio_id, fase);
create index casos_cliente_idx on casos (cliente_id);
create unique index casos_cnj_unico on casos (escritorio_id, numero_cnj) where numero_cnj is not null;

create table andamentos (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete cascade,
  caso_id        uuid not null references casos (id) on delete cascade,
  data           date not null,
  tipo           tipo_andamento not null default 'andamento',
  titulo         text not null,
  descricao      text not null default '',
  resumo_ia      text,
  -- Prazo sugerido pela IA a partir de uma publicação (o advogado confirma).
  sugestao_titulo          text,
  sugestao_dias_uteis      integer check (sugestao_dias_uteis between 1 and 365),
  sugestao_data_fatal      date,
  sugestao_data_interna    date,
  sugestao_responsavel_id  uuid references usuarios (id) on delete set null,
  sugestao_estado          estado_sugestao,
  criado_em      timestamptz not null default now()
);
create index andamentos_caso_idx on andamentos (caso_id, data desc);
create index andamentos_pendentes_idx on andamentos (escritorio_id) where sugestao_estado = 'pendente';

create table prazos (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete cascade,
  caso_id         uuid not null references casos (id) on delete cascade,
  titulo          text not null,
  data_fatal      date not null,
  data_interna    date not null,
  responsavel_id  uuid references usuarios (id) on delete set null,
  origem          origem_prazo not null default 'manual',
  concluido_em    date,
  criado_em       timestamptz not null default now(),
  constraint interna_antes_da_fatal check (data_interna <= data_fatal)
);
create index prazos_abertos_idx on prazos (escritorio_id, data_fatal) where concluido_em is null;

create table eventos (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorios (id) on delete cascade,
  titulo          text not null,
  tipo            tipo_evento not null default 'reuniao',
  inicio          timestamptz not null,
  fim             timestamptz not null,
  local           text,
  caso_id         uuid references casos (id) on delete set null,
  cliente_id      uuid references clientes (id) on delete cascade,
  responsavel_id  uuid references usuarios (id) on delete set null,
  criado_por_ia   boolean not null default false,
  criado_em       timestamptz not null default now(),
  constraint fim_depois_do_inicio check (fim > inicio)
);
create index eventos_escritorio_idx on eventos (escritorio_id, inicio);

-- ---------------------------------------------------------------------------
-- Financeiro
-- ---------------------------------------------------------------------------
create table contratos (
  id                uuid primary key default gen_random_uuid(),
  escritorio_id     uuid not null references escritorios (id) on delete cascade,
  cliente_id        uuid not null references clientes (id) on delete cascade,
  caso_id           uuid references casos (id) on delete set null,
  tipo              tipo_contrato not null,
  descricao         text not null,
  valor_total       numeric(14, 2) not null default 0 check (valor_total >= 0),
  percentual_exito  numeric(5, 2) check (percentual_exito > 0 and percentual_exito <= 100),
  inicio            date not null default current_date,
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now()
);
create index contratos_escritorio_idx on contratos (escritorio_id);

create table lancamentos (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete cascade,
  tipo           tipo_lancamento not null,
  descricao      text not null,
  valor          numeric(14, 2) not null check (valor > 0),
  vencimento     date not null,
  pago_em        date,
  forma          forma_pagamento,
  cliente_id     uuid references clientes (id) on delete cascade,
  caso_id        uuid references casos (id) on delete set null,
  contrato_id    uuid references contratos (id) on delete set null,
  categoria      categoria_despesa,
  criado_em      timestamptz not null default now(),
  -- Categoria é de despesa; cliente, caso e contrato são de receita.
  constraint campos_por_tipo check (
    (tipo = 'despesa' and cliente_id is null and contrato_id is null)
    or (tipo = 'receita' and categoria is null)
  )
);
create index lancamentos_vencimento_idx on lancamentos (escritorio_id, tipo, vencimento);
create index lancamentos_em_aberto_idx on lancamentos (escritorio_id, vencimento) where pago_em is null;

-- ---------------------------------------------------------------------------
-- Atendimento (WhatsApp)
-- ---------------------------------------------------------------------------
create table conversas (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete cascade,
  nome           text not null,
  telefone       text not null,
  cliente_id     uuid references clientes (id) on delete set null,
  modo           modo_conversa not null default 'ia',
  nao_lidas      integer not null default 0 check (nao_lidas >= 0),
  criado_em      timestamptz not null default now(),
  unique (escritorio_id, telefone)
);

create table mensagens (
  id             uuid primary key default gen_random_uuid(),
  escritorio_id  uuid not null references escritorios (id) on delete cascade,
  conversa_id    uuid not null references conversas (id) on delete cascade,
  de             autor_mensagem not null,
  texto          text not null check (length(texto) between 1 and 4096),
  -- Identificador da mensagem no WhatsApp, para não gravar o mesmo evento duas vezes.
  id_externo     text,
  enviada_em     timestamptz not null default now()
);
create index mensagens_conversa_idx on mensagens (conversa_id, enviada_em);
create unique index mensagens_id_externo_unico on mensagens (escritorio_id, id_externo) where id_externo is not null;

-- ---------------------------------------------------------------------------
-- Auditoria: quem fez o quê (inclui as ações da IA)
-- ---------------------------------------------------------------------------
create table auditoria (
  id             bigint generated always as identity primary key,
  escritorio_id  uuid not null references escritorios (id) on delete cascade,
  usuario_id     uuid references usuarios (id) on delete set null,
  feito_pela_ia  boolean not null default false,
  acao           text not null,
  entidade       text not null,
  entidade_id    uuid,
  detalhes       jsonb not null default '{}'::jsonb,
  criado_em      timestamptz not null default now()
);
create index auditoria_escritorio_idx on auditoria (escritorio_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: cada escritório só vê os próprios dados
-- ---------------------------------------------------------------------------
alter table escritorios enable row level security;
alter table usuarios    enable row level security;
alter table clientes    enable row level security;
alter table casos       enable row level security;
alter table andamentos  enable row level security;
alter table prazos      enable row level security;
alter table eventos     enable row level security;
alter table contratos   enable row level security;
alter table lancamentos enable row level security;
alter table conversas   enable row level security;
alter table mensagens   enable row level security;
alter table auditoria   enable row level security;

create policy escritorio_proprio on escritorios for select to authenticated using (id = escritorio_atual());
create policy escritorio_editar  on escritorios for update to authenticated using (id = escritorio_atual()) with check (id = escritorio_atual());

create policy equipe_ver on usuarios for select to authenticated using (escritorio_id = escritorio_atual());

create policy isolar on clientes    for all to authenticated using (escritorio_id = escritorio_atual()) with check (escritorio_id = escritorio_atual());
create policy isolar on casos       for all to authenticated using (escritorio_id = escritorio_atual()) with check (escritorio_id = escritorio_atual());
create policy isolar on andamentos  for all to authenticated using (escritorio_id = escritorio_atual()) with check (escritorio_id = escritorio_atual());
create policy isolar on prazos      for all to authenticated using (escritorio_id = escritorio_atual()) with check (escritorio_id = escritorio_atual());
create policy isolar on eventos     for all to authenticated using (escritorio_id = escritorio_atual()) with check (escritorio_id = escritorio_atual());
create policy isolar on contratos   for all to authenticated using (escritorio_id = escritorio_atual()) with check (escritorio_id = escritorio_atual());
create policy isolar on lancamentos for all to authenticated using (escritorio_id = escritorio_atual()) with check (escritorio_id = escritorio_atual());
create policy isolar on conversas   for all to authenticated using (escritorio_id = escritorio_atual()) with check (escritorio_id = escritorio_atual());
create policy isolar on mensagens   for all to authenticated using (escritorio_id = escritorio_atual()) with check (escritorio_id = escritorio_atual());

-- Auditoria: a equipe lê e registra, mas ninguém altera nem apaga.
create policy auditoria_ler      on auditoria for select to authenticated using (escritorio_id = escritorio_atual());
create policy auditoria_registrar on auditoria for insert to authenticated with check (escritorio_id = escritorio_atual());

grant select, update on escritorios to authenticated;
grant select on usuarios to authenticated;
grant select, insert, update, delete on clientes, casos, andamentos, prazos, eventos, contratos, lancamentos, conversas, mensagens to authenticated;
grant select, insert on auditoria to authenticated;
