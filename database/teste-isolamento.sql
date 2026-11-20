-- =============================================================================
-- Teste do esquema em um PostgreSQL local (fora do Supabase).
--
-- Cria um banco descartável, simula o que o Supabase fornece (esquema `auth` e
-- o papel `authenticated`), aplica schema.sql e confere:
--   1. que um escritório não enxerga nem altera dados de outro (RLS);
--   2. que as regras de integridade recusam dados inválidos.
--
-- Uso:  createdb vade_teste && psql -v ON_ERROR_STOP=1 -d vade_teste -f database/teste-isolamento.sql
-- =============================================================================

-- O que o Supabase já traz pronto
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role authenticated nologin;
grant usage on schema public, auth to authenticated;
grant execute on function auth.uid() to authenticated;

\ir schema.sql

-- Dois escritórios, um usuário em cada
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into escritorios (id, nome) values
  ('10000000-0000-0000-0000-000000000001', 'Escritório A'),
  ('10000000-0000-0000-0000-000000000002', 'Escritório B');
insert into usuarios (id, escritorio_id, nome, email, papel) values
  ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'Ana', 'ana@a.test', 'socio'),
  ('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002', 'Bruno', 'bruno@b.test', 'socio');
insert into clientes (id, escritorio_id, nome) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Cliente de A'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Cliente de B');

-- ---------------------------------------------------------------------------
-- 1. Isolamento: logada como Ana (escritório A)
-- ---------------------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

do $$
declare
  quantidade integer;
  afetadas integer;
begin
  select count(*) into quantidade from clientes;
  assert quantidade = 1, format('Ana deveria ver 1 cliente, viu %s', quantidade);

  select count(*) into quantidade from escritorios;
  assert quantidade = 1, format('Ana deveria ver 1 escritório, viu %s', quantidade);

  select count(*) into quantidade from usuarios;
  assert quantidade = 1, format('Ana deveria ver só a própria equipe, viu %s pessoas', quantidade);

  update clientes set nome = 'invadido' where id = '20000000-0000-0000-0000-000000000002';
  get diagnostics afetadas = row_count;
  assert afetadas = 0, 'Ana não pode alterar cliente do escritório B';

  delete from clientes where id = '20000000-0000-0000-0000-000000000002';
  get diagnostics afetadas = row_count;
  assert afetadas = 0, 'Ana não pode apagar cliente do escritório B';

  begin
    insert into clientes (escritorio_id, nome) values ('10000000-0000-0000-0000-000000000002', 'Plantado em B');
    raise exception 'FALHA: Ana conseguiu inserir cliente no escritório B';
  exception when insufficient_privilege then
    null; -- esperado: a política de RLS recusa
  end;

  -- No próprio escritório, tudo funciona
  insert into clientes (escritorio_id, nome) values ('10000000-0000-0000-0000-000000000001', 'Novo cliente de A');
  select count(*) into quantidade from clientes;
  assert quantidade = 2, 'Ana deveria conseguir cadastrar no próprio escritório';

  -- Auditoria: registra, mas não altera nem apaga
  insert into auditoria (escritorio_id, acao, entidade) values ('10000000-0000-0000-0000-000000000001', 'criar', 'cliente');
  begin
    delete from auditoria;
    raise exception 'FALHA: a auditoria pôde ser apagada';
  exception when insufficient_privilege then
    null; -- esperado: não há permissão de DELETE
  end;
end $$;

-- Sem usuário logado, nada aparece
reset request.jwt.claim.sub;
do $$
declare quantidade integer;
begin
  select count(*) into quantidade from clientes;
  assert quantidade = 0, format('Sem login não deveria ver nada, viu %s', quantidade);
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 2. Integridade (como administrador, para testar só as regras das tabelas)
-- ---------------------------------------------------------------------------
do $$
declare
  escritorio constant uuid := '10000000-0000-0000-0000-000000000001';
  cliente constant uuid := '20000000-0000-0000-0000-000000000001';
  caso uuid;
begin
  insert into casos (escritorio_id, cliente_id, titulo, numero_cnj, area, tipo_acao)
  values (escritorio, cliente, 'Silva × INSS', '1004521-84.2025.4.01.3700', 'previdenciario', 'Aposentadoria por idade')
  returning id into caso;

  begin
    insert into casos (escritorio_id, cliente_id, titulo, numero_cnj, area, tipo_acao)
    values (escritorio, cliente, 'CNJ torto', '123', 'civel', 'Teste');
    raise exception 'FALHA: aceitou número CNJ fora do formato';
  exception when check_violation then null;
  end;

  begin
    insert into casos (escritorio_id, cliente_id, titulo, numero_cnj, area, tipo_acao)
    values (escritorio, cliente, 'Duplicado', '1004521-84.2025.4.01.3700', 'civel', 'Teste');
    raise exception 'FALHA: aceitou o mesmo processo duas vezes no escritório';
  exception when unique_violation then null;
  end;

  begin
    insert into prazos (escritorio_id, caso_id, titulo, data_fatal, data_interna)
    values (escritorio, caso, 'Prazo invertido', '2026-12-10', '2026-12-15');
    raise exception 'FALHA: aceitou data interna depois da data fatal';
  exception when check_violation then null;
  end;

  begin
    insert into eventos (escritorio_id, titulo, inicio, fim)
    values (escritorio, 'Evento invertido', '2026-12-10 11:00-03', '2026-12-10 10:00-03');
    raise exception 'FALHA: aceitou evento que termina antes de começar';
  exception when check_violation then null;
  end;

  begin
    insert into lancamentos (escritorio_id, tipo, descricao, valor, vencimento)
    values (escritorio, 'receita', 'Valor zero', 0, '2026-12-10');
    raise exception 'FALHA: aceitou lançamento com valor zero';
  exception when check_violation then null;
  end;

  begin
    insert into lancamentos (escritorio_id, tipo, descricao, valor, vencimento, cliente_id)
    values (escritorio, 'despesa', 'Despesa com cliente', 100, '2026-12-10', cliente);
    raise exception 'FALHA: aceitou despesa ligada a cliente';
  exception when check_violation then null;
  end;

  begin
    insert into clientes (escritorio_id, nome, status, etapa_funil) values (escritorio, 'Cliente com etapa', 'ativo', 'proposta');
    raise exception 'FALHA: aceitou etapa de funil em cliente ativo';
  exception when check_violation then null;
  end;

  -- Apagar o cliente leva junto os casos e prazos dele
  insert into prazos (escritorio_id, caso_id, titulo, data_fatal, data_interna) values (escritorio, caso, 'Réplica', '2026-12-15', '2026-12-11');
  delete from clientes where id = cliente;
  assert not exists (select 1 from casos where id = caso), 'Os casos do cliente deveriam ter sido apagados';
  assert not exists (select 1 from prazos where caso_id = caso), 'Os prazos do caso deveriam ter sido apagados';
end $$;

\echo 'OK: isolamento entre escritórios e regras de integridade conferidos.'
