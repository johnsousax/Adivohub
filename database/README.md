# Banco de dados

O aplicativo ainda roda sem banco (os dados ficam no navegador). Esta pasta guarda o que já está pronto para quando ele for conectado.

- `schema.sql` — a primeira migração. Tabelas, regras de acesso e auditoria, no padrão de segurança do projeto (`SECURITY.md`). Escrito para PostgreSQL 15+ no Supabase.
- `teste-isolamento.sql` — aplica o esquema em um banco local descartável e simula os ataques, um por linha. Se algum passar, o teste para.

## O que o esquema garante

| Garantia                                      | Como                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Um escritório nunca vê outro                  | Toda linha tem `escritorio_id`, preenchido e conferido pelo banco. O usuário não consegue informar esse campo            |
| Cada papel só faz o que deve                  | Regras por ação (ler, criar, editar) para sócio, advogado, estagiário e financeiro. A tabela está na seção 12 do arquivo |
| Nada vaza por identificador trocado           | As ligações entre tabelas levam o escritório junto: um caso não aponta para cliente de outro escritório                  |
| O navegador só envia campos permitidos        | Lista branca por coluna. Escritório, autor, datas de controle, exclusão e plano nunca vêm do navegador                   |
| Nada é apagado de verdade pelo usuário        | Não existe permissão de `DELETE`. Excluir é marcar `excluido_em`, pela função `excluir_registro`                         |
| Quem saiu perde o acesso na hora              | Usuário desativado e escritório encerrado deixam de enxergar qualquer dado                                               |
| Tudo que importa deixa rastro                 | Gatilhos gravam em `audit.logs` quem fez, quando, e o antes e depois. Ninguém edita nem apaga esse registro              |
| Sigilo profissional fora do registro          | Observações do cliente, descrição do caso, próximo passo e histórico do CRM não vão para a auditoria                     |
| Histórico do CRM confiável                    | `interacoes` só cresce, em nome de quem registrou. Marcos de etapa e datas do funil são gravados pelo banco              |
| CPF e CNPJ cifrados                           | Ficam em tabela fora da API, cifrados pelo servidor (`src/lib/servidor/cripto.ts`). Cada revelação gera registro         |
| Dinheiro sem erro de arredondamento           | Valores em centavos, em número inteiro                                                                                   |
| Evento de webhook não é processado duas vezes | `registrar_evento_webhook` devolve verdadeiro só na primeira vez                                                         |

## Rodar o teste

Com um PostgreSQL local:

```bash
createdb justixup_teste
psql -v ON_ERROR_STOP=1 -d justixup_teste -f database/teste-isolamento.sql
dropdb justixup_teste
```

A saída lista cada cenário conferido e termina com `OK: 217 cenários conferidos. Nenhum ataque passou.`

O teste cria o schema `auth` e os papéis `anon`, `authenticated` e `service_role`, que no Supabase já existem. Por isso, **no Supabase aplique só o `schema.sql`**. Os papéis ficam no servidor PostgreSQL local depois do `dropdb`; isso não atrapalha rodar de novo.

O teste foi conferido pelo caminho inverso: 33 regras do esquema foram enfraquecidas de propósito, uma por vez, e o teste acusou as 33.

## Ao conectar no Supabase

1. Aplique `schema.sql` como a primeira migração de um projeto novo.
2. Rode o Security Advisor do painel do Supabase. O esperado é nenhum alerta crítico; este esquema ainda não foi aplicado em um projeto real, só em PostgreSQL 16 local.
3. Cadastre no servidor as variáveis `CHAVE_DE_DADOS` e `CHAVE_DE_INDICE` (veja `.env.example`) e guarde cópia em um cofre de senhas.
4. Escritórios e usuários são criados só pelo servidor, com a chave de serviço. O papel de cada pessoa fica na tabela `usuarios`, nunca nos metadados do login.
5. Ligue os backups diários e, quando houver cobrança pelo sistema, a restauração ponto a ponto (PITR).

## O que ainda falta decidir

- **Cadastro do primeiro usuário** de cada escritório: rota do servidor que cria o escritório e o sócio.
- **Segunda etapa de login (MFA)**: exigir nas regras do banco para o papel de sócio, quando o login do Supabase estiver ligado.
- **Pagamentos**: quando um gateway for ligado, a baixa de cobranças feitas por ele deve vir só do servidor, por webhook conferido. Hoje a baixa é manual, pelo sócio ou pelo financeiro.
- **Pedido de apagamento (LGPD)**: rotina do servidor para apagar de verdade ou anonimizar os dados de um cliente. O esquema bloqueia apagar um cliente enquanto houver casos ligados a ele, para isso não acontecer por engano.
- **Prazo de guarda da auditoria e dos eventos de webhook**: o registro guarda nome, e-mail e telefone de clientes, e ninguém consegue apagar linhas dele. Defina por quanto tempo fica; o descarte do que venceu precisa de uma rotina própria do administrador do banco (por exemplo, com uma partição por mês).
- **Documentos dos casos**: onde ficam os arquivos (armazenamento privado, com endereço assinado de curta duração).
