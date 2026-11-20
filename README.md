# Vade

Gestão jurídica com inteligência artificial para escritórios de advocacia: casos, prazos, agenda, honorários e atendimento no WhatsApp em um só lugar.

O nome vem de _Vade Mecum_ ("vai comigo"). Para trocar o nome, o WhatsApp de vendas ou os planos, edite só `src/lib/marca.ts`.

## Situação atual

O aplicativo roda em **modo demonstração**: tudo funciona de ponta a ponta, mas os dados são de um escritório fictício e ficam no navegador de quem usa (localStorage). Ainda **não há banco de dados nem integrações externas ligadas**.

| Parte                                                         | Situação                                                                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Landing page com botões para o WhatsApp de vendas             | Pronta                                                                                                |
| Login com sessão em cookie assinado e rotas protegidas        | Pronto (uma conta de demonstração, definida por variável de ambiente)                                 |
| Visão geral, casos, prazos, agenda, clientes, funil, finanças | Prontos, gravando no navegador                                                                        |
| Contagem de prazos em dias úteis                              | Pronta (fins de semana, feriados nacionais e recesso forense; feriados locais não entram)             |
| Assistente do advogado e atendente de clientes                | Prontos. Sem `ANTHROPIC_API_KEY` respondem com regras locais; com a chave, usam o Claude              |
| Banco de dados                                                | Não conectado. Esquema pronto e testado em `database/schema.sql`                                      |
| WhatsApp Business (número oficial)                            | Não conectado. O webhook existe (`/api/whatsapp/webhook`), mas não grava nem responde mensagens ainda |
| Pagamentos (Pix, boleto, cartão) e NFS-e                      | Não conectados. A baixa é manual e a cobrança abre o WhatsApp do usuário                              |
| Captura de processos e publicações dos tribunais              | Não conectada. As publicações da demonstração são exemplos                                            |

## Como rodar

Requer Node.js 20.9 ou mais recente.

```bash
npm install
cp .env.example .env.local   # e preencha AUTH_SECRET (openssl rand -base64 32)
npm run dev                  # http://localhost:3000
```

Entre em `/entrar` e use o botão **Abrir a demonstração** (ou `demo@vade.app` / `vade2026`).

| Comando             | O que faz                                           |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                         |
| `npm run build`     | Compilação de produção                              |
| `npm start`         | Sobe a versão compilada                             |
| `npm test`          | Testes automatizados (prazos, CNJ, financeiro e IA) |
| `npm run lint`      | Verificação de código                               |
| `npm run typecheck` | Verificação de tipos                                |
| `npm run format`    | Formata o código                                    |

## Variáveis de ambiente

Todas estão descritas em `.env.example`.

- `AUTH_SECRET` — obrigatória em produção. Sem ela o login fica desativado, de propósito.
- `DEMO_EMAIL`, `DEMO_SENHA`, `DEMO_PUBLICA` — a conta de demonstração. Com `DEMO_PUBLICA=false`, a tela de login deixa de mostrar o botão da demonstração.
- `ANTHROPIC_API_KEY` — liga a IA de verdade. `ANTHROPIC_MODEL_ASSISTENTE` e `ANTHROPIC_MODEL_ATENDIMENTO` trocam os modelos (padrão: `claude-opus-5-5`).
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` — verificação e assinatura do webhook da Meta.

> **Antes de ligar a chave da IA em um site público:** troque `DEMO_SENHA` e defina `DEMO_PUBLICA=false`. As rotas de IA exigem login e têm limite de requisições, mas, com a demonstração aberta, qualquer visitante poderia gastar seus créditos.

## Estrutura

```
src/
  app/                  rotas (Next.js App Router)
    page.tsx            landing page
    entrar/             login
    painel/             telas do sistema (protegidas pelo proxy)
    api/                back-end: auth, IA, integrações, webhook do WhatsApp
  proxy.ts              protege /painel e redireciona quem já está logado
  components/
    landing/            seções da landing page
    painel/             moldura do painel, busca, avisos, formulários
    telas/              uma tela por arquivo (Casos, Prazos, Financeiro...)
    graficos/           indicadores e gráficos
    ui/                 botões, campos, janelas, etiquetas
  lib/
    marca.ts            nome, WhatsApp de vendas e planos
    tipos.ts            modelo de dados
    datas.ts            dias úteis, feriados e recesso forense
    cnj.ts              numeração única de processos (dígito verificador)
    dados/              dados de demonstração, loja (estado) e métricas
    auth/               sessão e credenciais
    ia/                 prompts, chamadas ao Claude e respostas locais
    servidor/           limite de requisições e respostas de API
database/               esquema SQL e teste de isolamento entre escritórios
docs/                   plano do produto e apresentações
```

## Como a IA funciona

- **Assistente** (`/api/ia/assistente`): o painel envia a pergunta e um resumo dos dados do escritório; a resposta volta em fluxo de texto. Hoje ele só lê e responde; não executa ações.
- **Atendente** (`/api/ia/atendimento`): recebe a conversa e devolve a mensagem e uma ação (`nenhuma`, `agendar` ou `transferir`). O sistema só agenda em horários que ele mesmo ofereceu.
- As regras de conduta (identificar-se como atendimento virtual, não dar parecer, não prometer resultado, não fazer captação ativa, passar para um humano) estão em `src/lib/ia/prompts.ts` e também nas respostas locais (`src/lib/ia/local.ts`).
- Se a API falhar, as duas rotas respondem com as regras locais, para ninguém ficar sem resposta.

## Deploy na Vercel

O projeto `vade-juridico` está ligado a este repositório. Cada push gera uma versão de pré-visualização; a produção acompanha o branch principal.

Variáveis a cadastrar no projeto: `AUTH_SECRET` (obrigatória) e, quando for ligar a IA, `ANTHROPIC_API_KEY`.

## Próximos passos

1. **Banco de dados**: aplicar `database/schema.sql` (Supabase/PostgreSQL) e trocar o corpo das ações em `src/lib/dados/loja.ts` por chamadas à API. As telas não precisam mudar.
2. **Usuários reais**: substituir `src/lib/auth/` por um provedor de autenticação (por exemplo, Supabase Auth), com convites e perfis.
3. **WhatsApp oficial**: completar o webhook (gravar a mensagem, chamar o atendente, responder pela Cloud API).
4. **Pagamentos** e **tribunais**: ligar um gateway (Pix, boleto) e um provedor de dados processuais.

O plano completo do produto está em `docs/PLANO.md`.
