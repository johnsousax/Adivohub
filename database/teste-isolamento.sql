-- =============================================================================
-- Teste de segurança do esquema, em um PostgreSQL local (fora do Supabase).
--
-- Cria o que o Supabase já traz pronto (schema `auth`, auth.uid() e os papéis),
-- aplica schema.sql e simula os ataques, um por linha. Cada tentativa precisa
-- ser barrada; se alguma passar, o teste para com "FALHA DE SEGURANÇA".
--
-- Uso:
--   createdb justixup_teste
--   psql -v ON_ERROR_STOP=1 -d justixup_teste -f database/teste-isolamento.sql
--   dropdb justixup_teste
-- =============================================================================
\set QUIET on
\pset tuples_only on
\pset format unaligned
set client_min_messages = warning;

-- O que o Supabase já traz pronto
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

\ir schema.sql

-- ---------------------------------------------------------------------------
-- Ferramentas do teste (rodam com o papel de quem chama)
-- ---------------------------------------------------------------------------
create schema teste;
grant usage on schema teste to anon, authenticated, service_role;
set teste.cenarios = '0';

create function teste.ok(p_descricao text) returns text language sql
as $$
  select '  ok  ' || p_descricao
  from (select set_config('teste.cenarios', (current_setting('teste.cenarios')::int + 1)::text, false)) contador
$$;

-- O comando PRECISA falhar, com o código de erro esperado.
create function teste.barra(p_descricao text, p_sql text, p_estado text) returns text language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = p_estado then
      return teste.ok(p_descricao);
    end if;
    raise exception '%: esperava o erro %, veio % (%)', p_descricao, p_estado, sqlstate, sqlerrm;
  end;
  raise exception 'FALHA DE SEGURANÇA: % (o comando deveria ter sido barrado)', p_descricao;
end $$;

-- O comando roda, e precisa afetar exatamente p_linhas linhas (0 = o banco ignorou a tentativa).
create function teste.afeta(p_descricao text, p_sql text, p_linhas integer) returns text language plpgsql
as $$
declare v_afetadas integer;
begin
  execute p_sql;
  get diagnostics v_afetadas = row_count;
  if v_afetadas <> p_linhas then
    raise exception 'FALHA DE SEGURANÇA: % (afetou % linha(s), esperava %)', p_descricao, v_afetadas, p_linhas;
  end if;
  return teste.ok(p_descricao);
end $$;

-- A consulta precisa devolver exatamente p_esperado linhas.
create function teste.conta(p_descricao text, p_sql text, p_esperado bigint) returns text language plpgsql
as $$
declare v_total bigint;
begin
  execute format('select count(*) from (%s) consulta', p_sql) into v_total;
  if v_total <> p_esperado then
    raise exception 'FALHA DE SEGURANÇA: % (veio % linha(s), esperava %)', p_descricao, v_total, p_esperado;
  end if;
  return teste.ok(p_descricao);
end $$;

grant execute on all functions in schema teste to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Dados: dois escritórios. No A, um de cada papel e um ex-funcionário.
-- ---------------------------------------------------------------------------
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2'), ('00000000-0000-0000-0000-0000000000a3'),
  ('00000000-0000-0000-0000-0000000000a4'), ('00000000-0000-0000-0000-0000000000a5'), ('00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000ff');

insert into public.escritorios (id, nome) values
  ('10000000-0000-0000-0000-00000000000a', 'Escritório A'),
  ('10000000-0000-0000-0000-00000000000b', 'Escritório B');

insert into public.usuarios (id, escritorio_id, nome, email, papel, ativo) values
  ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a', 'Ana (sócia)', 'ana@a.example', 'socio', true),
  ('00000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'Pedro (advogado)', 'pedro@a.example', 'advogado', true),
  ('00000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', 'Marcos (estagiário)', 'marcos@a.example', 'estagiario', true),
  ('00000000-0000-0000-0000-0000000000a4', '10000000-0000-0000-0000-00000000000a', 'Carla (financeiro)', 'carla@a.example', 'financeiro', true),
  ('00000000-0000-0000-0000-0000000000a5', '10000000-0000-0000-0000-00000000000a', 'Ex-funcionário', 'saiu@a.example', 'advogado', false),
  ('00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'Bruno (sócio)', 'bruno@b.example', 'socio', true);

insert into public.clientes (id, escritorio_id, nome, observacoes) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Cliente de A', 'Segredo do cliente A'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'Cliente de B', null);

insert into public.casos (id, escritorio_id, cliente_id, titulo, numero_cnj, area, tipo_acao, responsavel_id, descricao) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'Silva × INSS', '1004521-84.2025.4.01.9999', 'previdenciario', 'Aposentadoria', '00000000-0000-0000-0000-0000000000a2', 'Detalhe sigiloso do caso'),
  ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'Caso para excluir', null, 'civel', 'Cobrança', null, null),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 'Caso de B', null, 'civel', 'Cobrança', null, null);

-- 250 andamentos no caso de A, antes do restante: testam o teto da auditoria e deixam
-- registros do escritório B entre os mais recentes (para o teste de vazamento valer).
insert into public.andamentos (escritorio_id, caso_id, data, titulo)
select '10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', current_date, 'Andamento ' || n
from generate_series(1, 250) n;
insert into public.andamentos (escritorio_id, caso_id, data, titulo) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a2', current_date, 'Andamento do caso excluído');

insert into public.prazos (escritorio_id, caso_id, titulo, data_fatal, data_interna) values
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'Réplica', '2026-12-15', '2026-12-11'),
  ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-0000000000a2', 'Prazo do caso excluído', '2026-12-15', '2026-12-11'),
  ('10000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-00000000000b', 'Prazo de B', '2026-12-15', '2026-12-11');

insert into public.lancamentos (escritorio_id, tipo, descricao, valor_centavos, vencimento, cliente_id) values
  ('10000000-0000-0000-0000-00000000000a', 'receita', 'Honorários de A', 150000, '2026-12-10', '20000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-00000000000b', 'receita', 'Honorários de B', 990000, '2026-12-10', '20000000-0000-0000-0000-00000000000b');

insert into public.conversas (id, escritorio_id, nome, telefone) values
  ('40000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Contato de A', '5598900000001'),
  ('40000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'Conversa para excluir', '5598900000009'),
  ('40000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'Contato de B', '5598900000002');

insert into public.mensagens (escritorio_id, conversa_id, de, texto) values
  ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-00000000000a', 'cliente', 'Olá, preciso de ajuda'),
  ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-0000000000a2', 'cliente', 'Mensagem da conversa excluída'),
  ('10000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-00000000000b', 'cliente', 'Mensagem de B');

\echo
\echo 1. Visitante sem login: não toca em nada
set role anon;
select teste.barra('Visitante lendo clientes', 'select * from public.clientes', '42501');
select teste.barra('Visitante lendo lançamentos', 'select * from public.lancamentos', '42501');
select teste.barra('Visitante lendo a equipe', 'select * from public.usuarios', '42501');
select teste.barra('Visitante gravando cliente', $$insert into public.clientes (nome) values ('Invasor')$$, '42501');
select teste.barra('Visitante chamando função interna', 'select private.escritorio_atual()', '42501');
select teste.barra('Visitante lendo a tabela de auditoria', 'select * from audit.logs', '42501');
select teste.barra('Visitante lendo a auditoria pela função', 'select * from public.ver_auditoria()', '42501');
select teste.barra('Visitante excluindo registro', $$select public.excluir_registro('clientes', '20000000-0000-0000-0000-00000000000a')$$, '42501');
select teste.barra('Visitante pedindo o documento de um cliente', $$select public.revelar_documento_do_cliente('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1')$$, '42501');
reset role;

\echo
\echo 2. Logado, mas sem escritório, e ex-funcionário desativado
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ff';
select teste.conta('Conta sem escritório não vê clientes', 'select 1 from public.clientes', 0);
select teste.conta('Conta sem escritório não vê equipe de ninguém', 'select 1 from public.usuarios', 0);
select teste.barra('Conta sem escritório não grava cliente', $$insert into public.clientes (nome) values ('Solto')$$, '42501');
select teste.barra('Conta sem escritório não exclui nada', $$select public.excluir_registro('clientes', '20000000-0000-0000-0000-00000000000a')$$, '42501');

set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a5';
select teste.conta('Ex-funcionário não vê clientes', 'select 1 from public.clientes', 0);
select teste.conta('Ex-funcionário não vê o financeiro', 'select 1 from public.lancamentos', 0);
select teste.conta('Ex-funcionário não vê nem a antiga equipe', 'select 1 from public.usuarios', 0);
select teste.barra('Ex-funcionário não grava caso', $$insert into public.casos (cliente_id, titulo, area, tipo_acao) values ('20000000-0000-0000-0000-00000000000a', 'Volta', 'civel', 'Teste')$$, '42501');

\echo
\echo 3. Ana, sócia do escritório A, tentando alcançar o escritório B
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select teste.conta('Sócia vê só o cliente do próprio escritório', 'select 1 from public.clientes', 1);
select teste.conta('Sócia vê só o próprio escritório', 'select 1 from public.escritorios', 1);
select teste.conta('Sócia vê só a própria equipe', 'select 1 from public.usuarios', 5);
select teste.conta('Cliente de B não aparece nem pelo identificador', $$select 1 from public.clientes where id = '20000000-0000-0000-0000-00000000000b'$$, 0);
select teste.conta('Lançamento de B não aparece', $$select 1 from public.lancamentos where descricao = 'Honorários de B'$$, 0);
select teste.conta('Mensagem de B não aparece', $$select 1 from public.mensagens where texto = 'Mensagem de B'$$, 0);
select teste.afeta('Alterar cliente de B não surte efeito', $$update public.clientes set nome = 'invadido' where id = '20000000-0000-0000-0000-00000000000b'$$, 0);
select teste.barra('Plantar cliente no escritório B', $$insert into public.clientes (escritorio_id, nome) values ('10000000-0000-0000-0000-00000000000b', 'Plantado')$$, '42501');
select teste.barra('Mover cliente próprio para B', $$update public.clientes set escritorio_id = '10000000-0000-0000-0000-00000000000b' where id = '20000000-0000-0000-0000-00000000000a'$$, '42501');
select teste.barra('Caso de A apontando para cliente de B', $$insert into public.casos (cliente_id, titulo, area, tipo_acao) values ('20000000-0000-0000-0000-00000000000b', 'Enxerto', 'civel', 'Teste')$$, '23503');
select teste.barra('Prazo de A apontando para caso de B', $$insert into public.prazos (caso_id, titulo, data_fatal, data_interna) values ('30000000-0000-0000-0000-00000000000b', 'Enxerto', '2026-12-15', '2026-12-11')$$, '23503');
select teste.barra('Excluir caso de B pela função', $$select public.excluir_registro('casos', '30000000-0000-0000-0000-00000000000b')$$, 'P0002');
select teste.afeta('Alterar usuário do escritório B não surte efeito', $$update public.usuarios set papel = 'estagiario' where id = '00000000-0000-0000-0000-0000000000b1'$$, 0);

\echo
\echo 4. O que a sócia pode, e o que nem ela pode
select teste.afeta('Sócia cadastra cliente (o banco preenche o escritório)', $$insert into public.clientes (nome) values ('Novo cliente de A')$$, 1);
select teste.conta('O cliente novo ficou no escritório A, em nome dela', $$select 1 from public.clientes where nome = 'Novo cliente de A' and escritorio_id = '10000000-0000-0000-0000-00000000000a' and criado_por = '00000000-0000-0000-0000-0000000000a1'$$, 1);
select teste.afeta('Sócia renomeia o escritório', $$update public.escritorios set nome = 'Escritório A Ltda'$$, 1);
select teste.afeta('Sócia altera observações de um cliente', $$update public.clientes set observacoes = 'Outro segredo' where id = '20000000-0000-0000-0000-00000000000a'$$, 1);
select teste.barra('Mudar o próprio plano sem pagar', $$update public.escritorios set plano = 'completo'$$, '42501');
select teste.barra('Forjar quem criou o registro', $$update public.clientes set criado_por = '00000000-0000-0000-0000-0000000000a2' where nome = 'Novo cliente de A'$$, '42501');
select teste.barra('Gravar o documento do cliente direto pela tabela', $$update public.clientes set documento_mascarado = '***.456.789-**' where id = '20000000-0000-0000-0000-00000000000a'$$, '42501');
select teste.barra('Ler a tabela de documentos cifrados', 'select * from private.documentos_de_clientes', '42501');
select teste.barra('Ler os eventos de webhook', 'select * from private.webhook_events', '42501');
select teste.barra('Chamar função reservada ao servidor (documento)', $$select public.revelar_documento_do_cliente('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1')$$, '42501');
select teste.barra('Chamar função reservada ao servidor (auditoria)', $$select public.registrar_auditoria('00000000-0000-0000-0000-0000000000a1', 'LOGIN_OK')$$, '42501');
select teste.barra('Chamar função reservada ao servidor (webhook)', $$select public.registrar_evento_webhook('whatsapp', 'evento-1')$$, '42501');
select teste.barra('Chamar função interna do servidor', $$select private.escritorio_de('00000000-0000-0000-0000-0000000000b1', '{socio}')$$, '42501');

\echo
\echo 5. Exclusão: só lógica, só pela função
select teste.barra('Apagar de verdade (DELETE) não existe', $$delete from public.clientes where nome = 'Novo cliente de A'$$, '42501');
select teste.barra('Marcar a exclusão direto pela tabela', $$update public.clientes set excluido_em = now() where nome = 'Novo cliente de A'$$, '42501');
select teste.afeta('Sócia exclui o cliente pela função', $$select public.excluir_registro('clientes', (select id from public.clientes where nome = 'Novo cliente de A'))$$, 1);
select teste.conta('O cliente excluído some das consultas', $$select 1 from public.clientes where nome = 'Novo cliente de A'$$, 0);
select teste.barra('Excluir cliente que ainda tem caso', $$select public.excluir_registro('clientes', '20000000-0000-0000-0000-00000000000a')$$, '23514');
select teste.afeta('Sócia exclui um caso', $$select public.excluir_registro('casos', '30000000-0000-0000-0000-0000000000a2')$$, 1);
select teste.conta('O prazo do caso excluído sai junto (não avisa mais)', $$select 1 from public.prazos where titulo = 'Prazo do caso excluído'$$, 0);
select teste.conta('O andamento do caso excluído sai junto', $$select 1 from public.andamentos where titulo = 'Andamento do caso excluído'$$, 0);
select teste.conta('Os prazos dos outros casos continuam lá', $$select 1 from public.prazos where titulo = 'Réplica'$$, 1);
select teste.barra('Excluir duas vezes o mesmo caso', $$select public.excluir_registro('casos', '30000000-0000-0000-0000-0000000000a2')$$, 'P0002');
select teste.conta('A conversa tem a mensagem dela', $$select 1 from public.mensagens where texto = 'Mensagem da conversa excluída'$$, 1);
select teste.afeta('Sócia exclui a conversa', $$select public.excluir_registro('conversas', '40000000-0000-0000-0000-0000000000a2')$$, 1);
select teste.conta('As mensagens da conversa excluída somem', $$select 1 from public.mensagens where texto = 'Mensagem da conversa excluída'$$, 0);
select teste.barra('Gravar mensagem em conversa excluída', $$insert into public.mensagens (conversa_id, de, texto) values ('40000000-0000-0000-0000-0000000000a2', 'equipe', 'Eco')$$, '42501');
select teste.barra('Tabela fora da lista na função de exclusão', $$select public.excluir_registro('usuarios', '00000000-0000-0000-0000-0000000000a2')$$, '42501');
select teste.barra('Nome de tabela malicioso na função de exclusão', $$select public.excluir_registro('clientes; drop table public.clientes', '20000000-0000-0000-0000-00000000000a')$$, '42501');

\echo
\echo 6. Auditoria vista pela sócia
select teste.barra('Ler a tabela de auditoria direto', 'select * from audit.logs', '42501');
select teste.barra('Gravar na auditoria direto', $$insert into audit.logs (acao, tabela) values ('FORJADO', 'y')$$, '42501');
select teste.conta('Sócia lê a auditoria do próprio escritório', 'select 1 from public.ver_auditoria(1)', 1);
select teste.conta('A auditoria entrega no máximo 200 linhas por consulta', 'select 1 from public.ver_auditoria(100000)', 200);
select teste.conta('Nada do escritório B aparece na auditoria de A', $$select 1 from public.ver_auditoria(200) where coalesce(antes::text, '') || coalesce(depois::text, '') ~ '(de B|Escritório B|Bruno)'$$, 0);

\echo
\echo 7. Equipe: a sócia administra, mas o escritório não fica sem sócio
select teste.afeta('Sócia promove o advogado a sócio', $$update public.usuarios set papel = 'socio' where id = '00000000-0000-0000-0000-0000000000a2'$$, 1);
select teste.afeta('e devolve ao papel de advogado', $$update public.usuarios set papel = 'advogado' where id = '00000000-0000-0000-0000-0000000000a2'$$, 1);
select teste.barra('Última sócia se rebaixando', $$update public.usuarios set papel = 'advogado' where id = '00000000-0000-0000-0000-0000000000a1'$$, '23514');
select teste.barra('Última sócia se desativando', $$update public.usuarios set ativo = false where id = '00000000-0000-0000-0000-0000000000a1'$$, '23514');
select teste.barra('Trocar o escritório de um usuário', $$update public.usuarios set escritorio_id = '10000000-0000-0000-0000-00000000000b' where id = '00000000-0000-0000-0000-0000000000a2'$$, '42501');
select teste.barra('Trocar o e-mail de login de um colega', $$update public.usuarios set email = 'invasor@x.example' where id = '00000000-0000-0000-0000-0000000000a2'$$, '42501');
select teste.barra('Criar usuário pelo navegador', $$insert into public.usuarios (id, escritorio_id, nome, email) values ('00000000-0000-0000-0000-0000000000ff', '10000000-0000-0000-0000-00000000000a', 'Fantasma', 'x@x.example')$$, '42501');
select teste.barra('Criar escritório pelo navegador', $$insert into public.escritorios (nome) values ('Escritório fantasma')$$, '42501');

\echo
\echo 8. Pedro, advogado: trabalha nos casos, só lê o financeiro, não administra
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
select teste.afeta('Advogado se promovendo a sócio não surte efeito', $$update public.usuarios set papel = 'socio' where id = '00000000-0000-0000-0000-0000000000a2'$$, 0);
select teste.afeta('Advogado renomeando o escritório não surte efeito', $$update public.escritorios set nome = 'Meu escritório'$$, 0);
select teste.conta('Advogado lê o financeiro do escritório', 'select 1 from public.lancamentos', 1);
select teste.barra('Advogado lançando valor no financeiro', $$insert into public.lancamentos (tipo, descricao, valor_centavos, vencimento) values ('receita', 'Por fora', 100, '2026-12-10')$$, '42501');
select teste.afeta('Advogado alterando valor de lançamento não surte efeito', $$update public.lancamentos set valor_centavos = 1$$, 0);
select teste.barra('Advogado excluindo lançamento', $$select public.excluir_registro('lancamentos', (select id from public.lancamentos limit 1))$$, '42501');
select teste.conta('Advogado não lê a auditoria', 'select 1 from public.ver_auditoria(200)', 0);
select teste.afeta('Advogado cadastra caso', $$insert into public.casos (cliente_id, titulo, area, tipo_acao) values ('20000000-0000-0000-0000-00000000000a', 'Novo caso', 'civel', 'Cobrança')$$, 1);

\echo
\echo 9. Marcos, estagiário: prazos e andamentos; nada de financeiro nem de cadastro
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
select teste.conta('Estagiário não vê lançamentos', 'select 1 from public.lancamentos', 0);
select teste.conta('Estagiário não vê contratos', 'select 1 from public.contratos', 0);
select teste.barra('Estagiário cadastrando cliente', $$insert into public.clientes (nome) values ('Cliente do estagiário')$$, '42501');
select teste.afeta('Estagiário alterando caso não surte efeito', $$update public.casos set titulo = 'Alterado' where id = '30000000-0000-0000-0000-00000000000a'$$, 0);
select teste.barra('Estagiário excluindo caso', $$select public.excluir_registro('casos', '30000000-0000-0000-0000-00000000000a')$$, '42501');
select teste.barra('Estagiário excluindo prazo', $$select public.excluir_registro('prazos', (select id from public.prazos limit 1))$$, '42501');
select teste.afeta('Estagiário registra prazo', $$insert into public.prazos (caso_id, titulo, data_fatal, data_interna) values ('30000000-0000-0000-0000-00000000000a', 'Juntar documentos', '2026-12-18', '2026-12-16')$$, 1);
select teste.afeta('Estagiário responde no atendimento em nome da equipe', $$insert into public.mensagens (conversa_id, de, texto) values ('40000000-0000-0000-0000-00000000000a', 'equipe', 'Bom dia!')$$, 1);
select teste.barra('Forjar mensagem como se fosse do cliente', $$insert into public.mensagens (conversa_id, de, texto) values ('40000000-0000-0000-0000-00000000000a', 'cliente', 'Autorizo tudo')$$, '42501');
select teste.barra('Forjar mensagem como se fosse da IA', $$insert into public.mensagens (conversa_id, de, texto) values ('40000000-0000-0000-0000-00000000000a', 'ia', 'Agendado')$$, '42501');
select teste.barra('Gravar mensagem em conversa do escritório B', $$insert into public.mensagens (conversa_id, de, texto) values ('40000000-0000-0000-0000-00000000000b', 'equipe', 'Oi')$$, '42501');
select teste.barra('Editar mensagem já enviada', $$update public.mensagens set texto = 'outro texto'$$, '42501');
select teste.barra('Apagar mensagem', 'delete from public.mensagens', '42501');
select teste.barra('Marcar compromisso como criado pela IA', $$insert into public.eventos (titulo, inicio, fim, criado_por_ia) values ('Falso', now(), now() + interval '1 hour', true)$$, '42501');

\echo
\echo 10. Carla, financeiro: cuida do dinheiro; não vê prazos nem conversas
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a4';
select teste.conta('Financeiro não vê prazos', 'select 1 from public.prazos', 0);
select teste.conta('Financeiro não vê andamentos', 'select 1 from public.andamentos', 0);
select teste.conta('Financeiro não vê conversas', 'select 1 from public.conversas', 0);
select teste.conta('Financeiro não vê mensagens', 'select 1 from public.mensagens', 0);
select teste.barra('Financeiro criando prazo', $$insert into public.prazos (caso_id, titulo, data_fatal, data_interna) values ('30000000-0000-0000-0000-00000000000a', 'Prazo', '2026-12-18', '2026-12-16')$$, '42501');
select teste.barra('Financeiro excluindo cliente', $$select public.excluir_registro('clientes', '20000000-0000-0000-0000-00000000000a')$$, '42501');
select teste.afeta('Financeiro lança receita', $$insert into public.lancamentos (tipo, descricao, valor_centavos, vencimento, cliente_id) values ('receita', 'Parcela 2', 50000, '2027-01-10', '20000000-0000-0000-0000-00000000000a')$$, 1);
select teste.afeta('Financeiro dá baixa no pagamento', $$update public.lancamentos set pago_em = current_date, forma = 'pix' where descricao = 'Parcela 2'$$, 1);
select teste.barra('Trocar o cliente de um lançamento já feito', $$update public.lancamentos set cliente_id = null where descricao = 'Parcela 2'$$, '42501');
select teste.barra('Lançamento com valor zero', $$insert into public.lancamentos (tipo, descricao, valor_centavos, vencimento) values ('receita', 'Zero', 0, '2026-12-10')$$, '23514');
select teste.barra('Receita ligada a cliente de B', $$insert into public.lancamentos (tipo, descricao, valor_centavos, vencimento, cliente_id) values ('receita', 'Enxerto', 100, '2026-12-10', '20000000-0000-0000-0000-00000000000b')$$, '23503');

\echo
\echo 11. Bruno, sócio do escritório B: o caminho inverso também é fechado
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select teste.conta('Sócio de B vê só o cliente de B', 'select 1 from public.clientes', 1);
select teste.conta('Sócio de B não vê casos de A', $$select 1 from public.casos where escritorio_id = '10000000-0000-0000-0000-00000000000a'$$, 0);
select teste.barra('Sócio de B excluindo caso de A', $$select public.excluir_registro('casos', '30000000-0000-0000-0000-00000000000a')$$, 'P0002');
select teste.afeta('Sócio de B alterando usuário de A não surte efeito', $$update public.usuarios set ativo = false where id = '00000000-0000-0000-0000-0000000000a1'$$, 0);
select teste.conta('Sócio de B lê a própria auditoria', 'select 1 from public.ver_auditoria(1)', 1);
select teste.conta('e nela não há nada do escritório A', $$select 1 from public.ver_auditoria(200) where coalesce(antes::text, '') || coalesce(depois::text, '') ~ '(de A|Escritório A|Ana|Pedro|INSS)'$$, 0);

reset request.jwt.claim.sub;
reset role;

\echo
\echo 12. Servidor (chave de serviço): webhook uma única vez, documento cifrado e com registro
set role service_role;
select teste.conta('Evento de webhook novo é aceito', $$select 1 where public.registrar_evento_webhook('whatsapp', 'wamid.1')$$, 1);
select teste.conta('O mesmo evento, repetido, é recusado', $$select 1 where public.registrar_evento_webhook('whatsapp', 'wamid.1')$$, 0);
select teste.conta('Outro evento é aceito', $$select 1 where public.registrar_evento_webhook('whatsapp', 'wamid.2')$$, 1);

select teste.afeta('Servidor grava o documento cifrado a pedido do advogado', $$select public.salvar_documento_do_cliente('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'v1:aXZk:ZXRpcXVldGE:Y2lmcmFkbw', repeat('ab', 32), '***.456.789-**')$$, 1);
select teste.conta('O cliente passa a mostrar só o documento mascarado', $$select 1 from public.clientes where id = '20000000-0000-0000-0000-00000000000a' and documento_mascarado = '***.456.789-**'$$, 1);
select teste.barra('Gravar o CPF aberto no lugar do cifrado', $$select public.salvar_documento_do_cliente('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', '123.456.789-09', repeat('ab', 32), '***.456.789-**')$$, '23514');
select teste.barra('Gravar máscara que mostra o CPF inteiro', $$select public.salvar_documento_do_cliente('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'v1:aXZk:ZXRpcXVldGE:Y2lmcmFkbw', repeat('ab', 32), '123.456.789-09')$$, '23514');
select teste.barra('Sócio de B gravando documento em cliente de A', $$select public.salvar_documento_do_cliente('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000b1', 'v1:aXZk:ZXRpcXVldGE:Y2lmcmFkbw', repeat('cd', 32), '***.456.789-**')$$, '42501');
select teste.barra('Estagiário gravando documento', $$select public.salvar_documento_do_cliente('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a3', 'v1:aXZk:ZXRpcXVldGE:Y2lmcmFkbw', repeat('cd', 32), '***.456.789-**')$$, '42501');
select teste.conta('Sócia pede o documento: o servidor recebe o texto cifrado', $$select 1 where public.revelar_documento_do_cliente('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1') = 'v1:aXZk:ZXRpcXVldGE:Y2lmcmFkbw'$$, 1);
select teste.conta('Sócio de B pedindo documento de cliente de A recebe nada', $$select 1 where public.revelar_documento_do_cliente('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000b1') is null$$, 1);
select teste.conta('Estagiário pedindo o documento recebe nada', $$select 1 where public.revelar_documento_do_cliente('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a3') is null$$, 1);
select teste.conta('Ex-funcionário pedindo o documento recebe nada', $$select 1 where public.revelar_documento_do_cliente('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a5') is null$$, 1);
select teste.conta('A revelação ficou registrada com o autor', $$select 1 from audit.logs where acao = 'REVELAR_DOCUMENTO' and autor = '00000000-0000-0000-0000-0000000000a1' and registro_id = '20000000-0000-0000-0000-00000000000a'$$, 1);
select teste.conta('As três tentativas recusadas também', $$select 1 from audit.logs where acao = 'REVELAR_DOCUMENTO_RECUSADO'$$, 3);
select teste.conta('Busca pelo índice acha o cliente no próprio escritório', $$select 1 from public.buscar_cliente_por_documento('00000000-0000-0000-0000-0000000000a1', repeat('ab', 32))$$, 1);
select teste.conta('A mesma busca, feita pelo escritório B, não acha nada', $$select 1 from public.buscar_cliente_por_documento('00000000-0000-0000-0000-0000000000b1', repeat('ab', 32))$$, 0);
select teste.afeta('Servidor registra evento de segurança (login)', $$select public.registrar_auditoria('00000000-0000-0000-0000-0000000000a1', 'LOGIN_OK', null, '{"origem": "teste"}')$$, 1);
select teste.barra('Evento de auditoria com nome fora do padrão', $$select public.registrar_auditoria('00000000-0000-0000-0000-0000000000a1', 'drop table')$$, '23514');
reset role;

\echo
\echo 13. Auditoria: imutável até para o administrador, e sem conteúdo sigiloso
select teste.barra('Administrador editando a auditoria', $$update audit.logs set acao = 'ADULTERADO'$$, '42501');
select teste.barra('Administrador apagando a auditoria', 'delete from audit.logs', '42501');
select teste.barra('Administrador esvaziando a auditoria', 'truncate audit.logs', '42501');
select teste.conta('Observações do cliente não vão para a auditoria', $$select 1 from audit.logs where coalesce(antes::text, '') || coalesce(depois::text, '') ~ '(Segredo do cliente A|Outro segredo)'$$, 0);
select teste.conta('Descrição do caso não vai para a auditoria', $$select 1 from audit.logs where coalesce(antes::text, '') || coalesce(depois::text, '') like '%Detalhe sigiloso do caso%'$$, 0);
select teste.conta('Documento cifrado e máscara não vão para a auditoria', $$select 1 from audit.logs where coalesce(antes::text, '') || coalesce(depois::text, '') ~ '(Y2lmcmFkbw|456\.789)'$$, 0);
select teste.conta('A auditoria marca que o campo sigiloso existia', $$select 1 from audit.logs where tabela = 'public.clientes' and acao = 'INSERT' and depois ->> 'observacoes' = '[omitido]'$$, 1);
select teste.conta('e marca quando ele foi alterado, e por quem', $$select 1 from audit.logs where tabela = 'public.clientes' and acao = 'UPDATE' and depois ->> 'observacoes' = '[alterado]' and autor = '00000000-0000-0000-0000-0000000000a1'$$, 1);
select teste.conta('Mudança de papel fica registrada, com antes e depois', $$select 1 from audit.logs where tabela = 'public.usuarios' and antes ->> 'papel' = 'advogado' and depois ->> 'papel' = 'socio' and autor = '00000000-0000-0000-0000-0000000000a1'$$, 1);
select teste.conta('Exclusão fica registrada com o autor', $$select 1 from audit.logs where tabela = 'public.clientes' and acao = 'UPDATE' and antes ->> 'excluido_em' is null and depois ->> 'excluido_em' is not null and autor = '00000000-0000-0000-0000-0000000000a1'$$, 1);
select teste.conta('Mensagens de conversa não entram na auditoria', $$select 1 from audit.logs where tabela = 'public.mensagens'$$, 0);

\echo
\echo 14. Rotinas do servidor: encerrar escritório, apagar usuário, apagar de verdade
update public.escritorios set excluido_em = now() where id = '10000000-0000-0000-0000-00000000000b';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select teste.conta('Escritório encerrado: a equipe não vê mais os clientes', 'select 1 from public.clientes', 0);
select teste.conta('nem o próprio escritório', 'select 1 from public.escritorios', 0);
select teste.barra('nem grava nada', $$insert into public.clientes (nome) values ('Depois do encerramento')$$, '42501');
reset request.jwt.claim.sub;
reset role;

select teste.afeta('Apagar o login de um usuário funciona', $$delete from auth.users where id = '00000000-0000-0000-0000-0000000000a2'$$, 1);
select teste.conta('O caso dele continua lá, só sem responsável', $$select 1 from public.casos where id = '30000000-0000-0000-0000-00000000000a' and responsavel_id is null$$, 1);
select teste.barra('Apagar de verdade um cliente que tem casos', $$delete from public.clientes where id = '20000000-0000-0000-0000-00000000000a'$$, '23503');
select teste.afeta('Apagar o escritório B inteiro', $$delete from public.escritorios where id = '10000000-0000-0000-0000-00000000000b'$$, 1);
select teste.conta('leva todos os dados de B', $$select 1 from public.clientes where escritorio_id = '10000000-0000-0000-0000-00000000000b' union all select 1 from public.mensagens where escritorio_id = '10000000-0000-0000-0000-00000000000b' union all select 1 from public.usuarios where escritorio_id = '10000000-0000-0000-0000-00000000000b'$$, 0);
select teste.conta('e não toca nos dados de A', $$select 1 from public.clientes where escritorio_id = '10000000-0000-0000-0000-00000000000a'$$, 2);

\echo
\echo 15. Integridade dos dados (regras das tabelas)
select teste.barra('Número CNJ fora do formato', $$insert into public.casos (escritorio_id, cliente_id, titulo, numero_cnj, area, tipo_acao) values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'CNJ torto', '123', 'civel', 'Teste')$$, '23514');
select teste.barra('Mesmo processo duas vezes no escritório', $$insert into public.casos (escritorio_id, cliente_id, titulo, numero_cnj, area, tipo_acao) values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'Duplicado', '1004521-84.2025.4.01.9999', 'civel', 'Teste')$$, '23505');
select teste.barra('Data interna depois da data fatal', $$insert into public.prazos (escritorio_id, caso_id, titulo, data_fatal, data_interna) values ('10000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'Invertido', '2026-12-10', '2026-12-15')$$, '23514');
select teste.barra('Evento que termina antes de começar', $$insert into public.eventos (escritorio_id, titulo, inicio, fim) values ('10000000-0000-0000-0000-00000000000a', 'Invertido', '2026-12-10 11:00-03', '2026-12-10 10:00-03')$$, '23514');
select teste.barra('Despesa ligada a cliente', $$insert into public.lancamentos (escritorio_id, tipo, descricao, valor_centavos, vencimento, cliente_id) values ('10000000-0000-0000-0000-00000000000a', 'despesa', 'Errada', 100, '2026-12-10', '20000000-0000-0000-0000-00000000000a')$$, '23514');
select teste.barra('Valor negativo', $$insert into public.lancamentos (escritorio_id, tipo, descricao, valor_centavos, vencimento) values ('10000000-0000-0000-0000-00000000000a', 'receita', 'Negativo', -500, '2026-12-10')$$, '23514');
select teste.barra('Etapa de funil em cliente ativo', $$insert into public.clientes (escritorio_id, nome, status, etapa_funil) values ('10000000-0000-0000-0000-00000000000a', 'Com etapa', 'ativo', 'proposta')$$, '23514');
select teste.barra('Telefone de conversa fora do formato', $$insert into public.conversas (escritorio_id, nome, telefone) values ('10000000-0000-0000-0000-00000000000a', 'Torto', '(98) 90000-0001')$$, '23514');
select teste.barra('Papel que não existe', $$update public.usuarios set papel = 'dono' where id = '00000000-0000-0000-0000-0000000000a3'$$, '22P02');
select teste.barra('Texto maior que o limite', $$insert into public.clientes (escritorio_id, nome, observacoes) values ('10000000-0000-0000-0000-00000000000a', 'Texto longo', repeat('x', 4001))$$, '23514');

\echo
\echo 16. Conferência geral do banco
select teste.conta('Todas as tabelas da API com RLS ligado', $$select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity$$, 0);
select teste.conta('Todas as tabelas da API têm policy', $$select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not exists (select 1 from pg_policy p where p.polrelid = c.oid)$$, 0);
select teste.conta('Toda policy vale só para usuário logado', $$select 1 from pg_policies where schemaname = 'public' and roles <> '{authenticated}'$$, 0);
select teste.conta('Nenhuma policy de exclusão (DELETE)', $$select 1 from pg_policies where schemaname = 'public' and cmd in ('DELETE', 'ALL')$$, 0);
select teste.conta('Visitante sem nenhuma permissão em tabela', $$select 1 from information_schema.role_table_grants where grantee in ('anon', 'PUBLIC') and table_schema in ('public', 'private', 'audit') union all select 1 from information_schema.column_privileges where grantee in ('anon', 'PUBLIC') and table_schema in ('public', 'private', 'audit')$$, 0);
select teste.conta('Usuário logado sem DELETE nem TRUNCATE em tabela alguma', $$select 1 from information_schema.role_table_grants where grantee = 'authenticated' and privilege_type in ('DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')$$, 0);
select teste.conta('Usuário logado não envia escritório, autor, datas de controle, exclusão nem plano', $$select 1 from information_schema.column_privileges where grantee = 'authenticated' and table_schema = 'public' and privilege_type in ('INSERT', 'UPDATE') and column_name in ('id', 'escritorio_id', 'criado_por', 'criado_em', 'atualizado_em', 'excluido_em', 'enviada_em', 'criado_por_ia', 'plano', 'documento_mascarado', 'resumo_ia', 'id_externo')$$, 0);
select teste.conta('Usuário logado sem acesso às tabelas internas', $$select 1 from information_schema.role_table_grants where grantee = 'authenticated' and table_schema in ('private', 'audit')$$, 0);
select teste.conta('Nenhuma função interna aberta ao visitante', $$select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and has_function_privilege('anon', p.oid, 'execute')$$, 0);
select teste.conta('Nenhuma função da API aberta ao visitante', $$select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')$$, 0);
select teste.conta('Funções com privilégio elevado só no schema interno', $$select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosecdef$$, 0);
select teste.conta('Todas as funções com caminho de busca travado', $$select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'private') and not coalesce(p.proconfig, '{}') @> array['search_path=""']$$, 0);

\echo
select format('OK: %s cenários conferidos. Nenhum ataque passou.', current_setting('teste.cenarios'));
