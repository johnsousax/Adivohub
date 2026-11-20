# JustixUp

Gestão jurídica com inteligência artificial para escritórios de advocacia: casos, prazos, agenda, honorários e atendimento no WhatsApp em um só lugar.

O nome junta _Justiça_ e _Up_ (subir, avançar): o escritório um passo à frente. O símbolo é um "J" cuja ponta é uma seta para cima. Para trocar o nome, o WhatsApp de vendas, os planos e os preços, edite só `src/lib/marca.ts`.

## Situação atual

O aplicativo roda em **modo demonstração**: tudo funciona de ponta a ponta, mas os dados são de um escritório fictício e ficam no navegador de quem usa (localStorage). Ainda **não há banco de dados nem integrações externas ligadas**.

| Parte                                                         | Situação                                                                                                   |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Landing page com animações e botões para o WhatsApp de vendas | Pronta                                                                                                     |
| Política de privacidade e termos de uso                       | Publicados em `/privacidade` e `/termos`. Falta preencher razão social e CNPJ em `src/lib/marca.ts`        |
| Demonstração pública                                          | Pronta. Entra por um botão, sem senha, e nunca usa a IA paga                                               |
| Acesso privado (e-mail e senha)                               | Pronto, para uma conta, definida por variáveis de ambiente. Provisório até o provedor de autenticação      |
| Visão geral, casos, prazos, agenda, clientes, funil, finanças | Prontos, gravando no navegador                                                                             |
| Contagem de prazos em dias úteis                              | Pronta (fins de semana, feriados nacionais e recesso forense; feriados locais não entram)                  |
| Assistente do advogado e atendente de clientes                | Prontos. Sem `ANTHROPIC_API_KEY` respondem com regras locais; com a chave, usam o Claude no acesso privado |
| Segurança                                                     | Camadas ativas descritas em `docs/SEGURANCA.md`; regras do projeto em `SECURITY.md`                        |
| Banco de dados                                                | Não conectado. Esquema pronto e testado em `database/schema.sql`                                           |
| WhatsApp Business (número oficial)                            | Não conectado. O webhook existe e valida a assinatura, mas não grava nem responde mensagens ainda          |
| Pagamentos (Pix, boleto, cartão) e NFS-e                      | Não conectados. A baixa é manual e a cobrança abre o WhatsApp do usuário                                   |
| Captura de processos e publicações dos tribunais              | Não conectada. As publicações da demonstração são exemplos                                                 |

## Como rodar

Requer Node.js 20.9 ou mais recente.

```bash
npm install
cp .env.example .env.local   # e preencha AUTH_SECRET (openssl rand -base64 48)
npm run dev                  # http://localhost:3000
```

Entre em `/entrar` e use o botão **Abrir a demonstração**. Não existe senha de demonstração.

Os dados da demonstração nascem com datas relativas ao dia de hoje. Depois da primeira alteração, eles ficam gravados no navegador e as datas deixam de acompanhar o calendário. Para voltar ao estado inicial, com as datas recalculadas, use **Configurações → Restaurar a demonstração**.

| Comando                                     | O que faz                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`                               | Servidor de desenvolvimento                                                                  |
| `npm run build`                             | Compilação de produção                                                                       |
| `npm start`                                 | Sobe a versão compilada                                                                      |
| `npm test`                                  | Testes automatizados (prazos, CNJ, financeiro, IA e segurança)                               |
| `npm run lint`                              | Verificação de código                                                                        |
| `npm run typecheck`                         | Verificação de tipos                                                                         |
| `npm run format`                            | Formata o código                                                                             |
| `npm run senha`                             | Gera o hash da senha do acesso privado (`ACESSO_SENHA_HASH`)                                 |
| `node scripts/conferir-site.cjs <endereço>` | Confere, de fora, a segurança e o funcionamento de um endereço publicado (requer Playwright) |

## Variáveis de ambiente

Os nomes estão em `.env.example`. Nenhum valor real vai para o Git, e cada ambiente (produção, pré-visualização, desenvolvimento) usa valores diferentes.

- `AUTH_SECRET` — obrigatória em produção, com 32 caracteres ou mais. Sem ela não há sessão, de propósito. Trocar o valor derruba todas as sessões.
- `DEMO_PUBLICA` — defina `false` para desligar o botão da demonstração.
- `ACESSO_EMAIL`, `ACESSO_SENHA_HASH`, `ACESSO_NOME` — o acesso privado. `ACESSO_SENHA_HASH` é o hash da senha (mínimo de 12 caracteres), gerado com `npm run senha`. Sem essas variáveis, o login por senha não aceita ninguém.
- `ANTHROPIC_API_KEY` — liga a IA de verdade, **só para o acesso privado**. `ANTHROPIC_MODEL_ASSISTENTE` e `ANTHROPIC_MODEL_ATENDIMENTO` trocam os modelos (padrão: `claude-opus-5-5`). `IA_COTA_DIARIA` limita as chamadas pagas por usuário a cada 24 horas (padrão: 300).
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` — verificação e assinatura do webhook da Meta.

Quem entra pela demonstração pública recebe sempre as respostas locais da IA. Assim, nenhum visitante consegue gastar os créditos da chave, mesmo com ela cadastrada.

## Segurança

O resumo: defesa em camadas, tudo fechado por padrão, e nada secreto no navegador ou no Git.

- **Regras do projeto:** [`SECURITY.md`](SECURITY.md). Vale para todo código novo.
- **Retrato atual:** [`docs/SEGURANCA.md`](docs/SEGURANCA.md), com modelo de ameaças, o que está feito, o que depende de você, riscos que sobraram e o checklist.
- **Páginas renderizadas a cada requisição.** A Content-Security-Policy usa um código único (nonce) por resposta, montado em `src/proxy.ts`. Por isso `cacheComponents` fica desligado: não religue sem rever a CSP.
- **Verificação automática.** O fluxo `Segurança` do GitHub roda em todo push: tipos, lint, testes, `npm audit`, busca de segredos e análise de código.

## Estrutura

```
src/
  app/                  rotas (Next.js App Router)
    page.tsx            landing page
    privacidade/, termos/  textos legais
    entrar/             login
    painel/             telas do sistema (protegidas pelo proxy)
    api/                back-end: auth, IA, integrações, webhook do WhatsApp
    .well-known/        security.txt
  proxy.ts              sessão do painel e Content-Security-Policy com nonce
  components/
    landing/            seções da landing page e animações (Revelar)
    painel/             moldura do painel, busca, avisos, formulários
    telas/              uma tela por arquivo (Casos, Prazos, Financeiro...)
    graficos/           indicadores e gráficos
    ui/                 botões, campos, janelas, etiquetas
  lib/
    marca.ts            nome, WhatsApp de vendas, planos, preços e dados legais
    tipos.ts            modelo de dados
    datas.ts            dias úteis, feriados e recesso forense
    cnj.ts              numeração única de processos (dígito verificador)
    dados/              dados de demonstração, loja (estado) e métricas
    auth/               sessão, hash de senha e credenciais
    ia/                 prompts, chamadas ao Claude e respostas locais
    servidor/           CSP, origem (CSRF), limites, registros e webhook
database/               esquema SQL e teste de isolamento entre escritórios
docs/                   plano do produto, segurança e apresentações
vercel.json             bloqueios na borda (sondagens de invasores)
```

## Como a IA funciona

- **Assistente** (`/api/ia/assistente`): o painel envia a pergunta e um resumo dos dados do escritório; a resposta volta em fluxo de texto. Hoje ele só lê e responde; não executa ações.
- **Atendente** (`/api/ia/atendimento`): recebe a conversa e devolve a mensagem e uma ação (`nenhuma`, `agendar` ou `transferir`). O sistema só agenda em horários que ele mesmo ofereceu.
- As regras de conduta (identificar-se como atendimento virtual, não dar parecer, não prometer resultado, não fazer captação ativa, não tratar de valores, passar para um humano) estão em `src/lib/ia/prompts.ts` e também nas respostas locais (`src/lib/ia/local.ts`).
- Mensagens de clientes e dados do escritório são tratados como informação, nunca como instrução.
- Se a API falhar, ou a cota diária acabar, as duas rotas respondem com as regras locais, para ninguém ficar sem resposta.

## Deploy na Vercel

O projeto `vade-juridico` na Vercel está ligado a este repositório. O site público é **https://justixup.vercel.app**. O endereço antigo, `vade-juridico.vercel.app`, redireciona para ele (configurado em `next.config.ts`).

- **Como a produção foi publicada:** a partir do branch de trabalho (`ccr-5a8e530d-0rzeun`), com um deploy de produção disparado à mão, porque o branch principal (`main`) ainda não tem o aplicativo.
- **Depois que o trabalho for para o `main`:** cada push no `main` publica em produção sozinho. Os outros branches geram versões de pré-visualização.
- **Região:** as funções rodam em São Paulo (`gru1`).
- **Quem consegue abrir:** só `justixup.vercel.app` (e um domínio próprio, quando houver) é aberto ao público. Os endereços longos de cada versão pedem login da Vercel; é a proteção padrão da conta.
- **Bloqueios na borda:** `vercel.json` nega caminhos que só robôs de ataque pedem (`.php`, `.env`, `/wp-admin`...) e métodos HTTP que o site não usa.

Variável já cadastrada no projeto: `AUTH_SECRET`, com um valor para produção e outro para pré-visualização.

Para usar um domínio próprio, adicione-o em _Settings → Domains_ do projeto. No deploy seguinte, os links de compartilhamento e o sitemap passam a usar o domínio novo sozinhos; `NEXT_PUBLIC_SITE_URL` só é necessária para forçar um endereço específico.

## Próximos passos

1. **Banco de dados e usuários reais**: aplicar `database/schema.sql` (Supabase/PostgreSQL), trocar `src/lib/auth/` pelo Supabase Auth (com verificação em duas etapas) e o corpo das ações em `src/lib/dados/loja.ts` por chamadas à API. As telas não precisam mudar.
2. **Limite de requisições compartilhado**: ligar um Redis (Upstash) ou as regras de limite do Firewall da Vercel. Hoje o limite fica na memória de cada instância.
3. **WhatsApp oficial**: completar o webhook (gravar a mensagem, chamar o atendente, responder pela Cloud API).
4. **Pagamentos** e **tribunais**: ligar um gateway (Pix, boleto) e um provedor de dados processuais.

O plano completo do produto está em `docs/PLANO.md`.
