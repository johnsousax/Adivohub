# Banco de dados

O aplicativo ainda roda sem banco (os dados ficam no navegador). Esta pasta guarda o que já está pronto para quando ele for conectado.

- `schema.sql` — tabelas, índices e as regras de Row Level Security que isolam um escritório do outro. Escrito para PostgreSQL 15+ no Supabase e espelha `src/lib/tipos.ts`.
- `teste-isolamento.sql` — aplica o esquema em um banco local descartável e confere que um escritório não vê nem altera dados de outro e que as regras de integridade recusam dados inválidos.

## Rodar o teste

Com um PostgreSQL local:

```bash
createdb vade_teste
psql -v ON_ERROR_STOP=1 -d vade_teste -f database/teste-isolamento.sql
dropdb vade_teste
```

A última linha deve ser `OK: isolamento entre escritórios e regras de integridade conferidos.`

O teste cria o esquema `auth` e o papel `authenticated`, que no Supabase já existem. Por isso, **no Supabase aplique só o `schema.sql`**.

## O que falta decidir ao conectar

- Como o primeiro usuário de um escritório é criado (hoje não há política de `insert` em `escritorios` nem em `usuarios`: o cadastro deve ser feito pelo servidor, com a chave de serviço).
- Permissões por perfil (sócio, advogado, estagiário, financeiro): o esquema isola por escritório, mas ainda não restringe o que cada perfil pode fazer.
- Onde ficam os documentos dos casos (armazenamento de arquivos).
