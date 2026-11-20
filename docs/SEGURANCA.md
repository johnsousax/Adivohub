# Relatório de segurança do JustixUp

Atualizado em 20/11/2026. Retrato do que está no ar em `justixup.vercel.app` (o endereço antigo `vade-juridico.vercel.app` abre o mesmo site), auditado contra o padrão "Segurança Máxima" adotado pelo projeto. As regras para código novo estão em [`SECURITY.md`](../SECURITY.md).

Nenhum sistema é impossível de invadir. Este relatório diz com clareza o que protege hoje, o que ainda falta e de quem depende.

## 1. Tipo de sistema e seções aplicadas

| O que o JustixUp é hoje | Seções do padrão aplicadas |
| --- | --- |
| Landing page pública | Frontend, Infraestrutura, LGPD |
| Painel de gestão em modo demonstração (sem banco: os dados ficam no navegador) | Autenticação e sessões, Autorização, API e backend, Banco de dados (como projeto), Logs |
| Assistente e atendente de IA; webhook do WhatsApp pronto, ainda não ligado | IA e WhatsApp, Webhooks |

Não se aplicam hoje, por não existirem no sistema: **Pagamentos**, **Uploads de arquivo**, **n8n**, **Jogos** e **Apps mobile**. Quando pagamentos ou uploads entrarem, as seções correspondentes do padrão passam a valer antes do lançamento.

## 2. Modelo de ameaças

**Quem atacaria.** Robôs que varrem a internet atrás de falhas conhecidas; alguém querendo usar a IA à custa da chave do projeto; um golpista interessado em trocar os links de WhatsApp do site para desviar clientes; e, quando houver banco, quem queira os dados dos clientes dos escritórios.

**O que há para roubar hoje.** Nenhum dado de cliente está no servidor. Os alvos reais são: o crédito da chave de IA, a integridade do site (os links de contato), a disponibilidade e as contas de infraestrutura (Vercel e GitHub), que dão controle total do site.

| Ameaça (STRIDE) | Por onde entraria | Camada que bloqueia |
| --- | --- | --- |
| Fingir ser outro (Spoofing) | Sessão forjada, senha adivinhada, webhook falso | Cookie assinado com prefixo `__Host-`; senha só como hash; limite e espera crescente no login; assinatura HMAC no webhook |
| Adulterar (Tampering) | Script injetado na página, campo extra em um pedido | CSP com nonce (script sem o código não roda); esquemas estritos (campo desconhecido = recusado); assinatura da sessão |
| Negar autoria (Repudiation) | "Não fui eu" | Registro estruturado de eventos de segurança, com identificador da requisição |
| Vazar informação (Disclosure) | Mensagem de erro, log, código do navegador | Erros genéricos com código de rastreio; logs sem senha, token ou conversa; nenhum segredo no navegador |
| Derrubar o serviço (DoS) | Volume de requisições, abuso da IA | Limite por IP e por usuário; cota diária de IA; bloqueio de sondagens na borda; proteção de DDoS da hospedagem |
| Ganhar privilégio (Elevation) | Visitante da demonstração tentando virar equipe | O papel vai dentro do token assinado; a demonstração nunca alcança a IA paga |

### Classificação dos dados

| Classe | O que é | Onde fica |
| --- | --- | --- |
| Público | Textos da landing, planos, preços | Site |
| Interno | Registros de segurança, configuração | Logs da hospedagem |
| Pessoal (LGPD) | IP e navegador de visitantes; número e mensagens de quem chama no WhatsApp; e-mail do acesso privado | Logs da hospedagem; WhatsApp de vendas; variável de ambiente |
| Sensível | Nenhum hoje. Com o banco: dados de clientes dos escritórios (CPF, processos), cobertos por sigilo profissional | Ainda não existe |

## 3. O que está implementado

### Frontend

- **Content-Security-Policy com nonce** (`src/proxy.ts`, `src/lib/servidor/csp.ts`): cada resposta leva um código único e o navegador só executa scripts com esse código. Sem `'unsafe-inline'` e sem `'unsafe-eval'` em scripts. Nenhum domínio de terceiros liberado.
- **Cabeçalhos** (`next.config.ts`): `Strict-Transport-Security` (2 anos, com subdomínios), `X-Content-Type-Options`, `X-Frame-Options: DENY` e `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy` (câmera, microfone, localização e pagamento desligados), `Cross-Origin-Opener-Policy`.
- Respostas de API com política que não carrega nada e sem cache. Arquivos SVG em modo isolado.
- Sem `X-Powered-By`, sem mapas de código em produção, sem `console.log` com dados.
- Nenhum serviço de terceiros no navegador: sem pixel, sem analytics, sem fontes externas.
- Links externos com `rel="noopener noreferrer"`. O único `dangerouslySetInnerHTML` é o bloco de dados estruturados, gerado de constantes e com `<` escapado.
- Formulário de login com campo-armadilha contra robôs.

### Autenticação e sessões

- **Demonstração sem senha**: entra por `/api/auth/demo`. Nenhuma credencial vai para o navegador ou para o Git.
- **Acesso privado**: e-mail e senha conferidos contra o **hash** da senha (scrypt), guardado em variável de ambiente. Mínimo de 12 caracteres. Não há senha padrão: sem as variáveis, ninguém entra.
- **Cookie de sessão**: `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`, 8 horas, assinado com HMAC-SHA256. Token adulterado, vencido ou com campo inválido é recusado.
- **Força bruta**: 5 tentativas por minuto por IP; depois de 5 erros, espera crescente por IP e por conta (30 s até 15 min).
- **Mensagem neutra** ("E-mail ou senha inválidos") e **tempo de resposta igual**, exista ou não a conta.
- Sem `AUTH_SECRET` forte em produção, não há sessão (falha fechada).

### Autorização

- Dois papéis no token: `demo` e `equipe`. O papel nunca vem do cliente.
- A IA paga só responde ao papel `equipe`. Testado: trocar o papel no cookie invalida a sessão.
- Não há dados de vários usuários no servidor, então ainda não há o que isolar. O isolamento por escritório e por papel está no esquema do banco (seção Banco de dados).

### API e backend

- Ordem fixa em toda rota: origem → limite → sessão → validação (`src/lib/servidor/respostas.ts`).
- **CSRF**: toda rota que altera algo confere `Origin` e `Sec-Fetch-Site`. Chamada de outro site recebe 403.
- **Validação estrita** com Zod (`z.strictObject`): campo desconhecido, texto longo demais ou lista grande demais = pedido recusado.
- **Limites**: só JSON; corpo com teto por rota (2 KB no login, até 200 KB na IA, 1 MB absoluto), recusado antes de ser lido quando o cabeçalho já anuncia o excesso.
- **Limite de requisições** por IP e por usuário em cada rota; `Retry-After` no 429.
- **Erros** com mensagem genérica e código de rastreio; o detalhe fica no log.
- Sem CORS aberto (as rotas só atendem o próprio site). Sem `eval`. Sem busca de URL informada pelo usuário.

### Webhook do WhatsApp

- Assinatura `X-Hub-Signature-256` conferida sobre o corpo cru, em tempo constante. Sem assinatura válida = 401.
- Token de verificação comparado em tempo constante; o desafio só é devolvido se for bem formado.
- Tamanho máximo, espera crescente para quem insiste com assinatura errada, e mensagens repetidas ignoradas.
- Sem os segredos configurados, a rota fica fechada (503).

### Inteligência artificial

- Mensagens de clientes e dados do escritório são tratados como informação, nunca como instrução. Os prompts mandam ignorar pedidos para mudar regras, revelar instruções, tratar de valores ou falar de outros clientes.
- A IA não tem ferramentas com efeito: só devolve texto e, no atendimento, uma de três ações. O servidor só aceita agendamento em horário que o próprio sistema ofereceu.
- Demonstração pública nunca usa a IA paga. Acesso privado tem teto diário de chamadas (`IA_COTA_DIARIA`).
- Nenhum segredo entra em prompt. Conversas não são gravadas no servidor.

### Segredos e dependências

- `.env*` fora do Git desde o início; `.env.example` só com nomes.
- `AUTH_SECRET` cadastrado na Vercel como variável sensível, com valores diferentes em produção e pré-visualização. O de produção foi trocado nesta entrega.
- `npm audit`: zero vulnerabilidades. Arquivo de travamento no Git.
- Fluxo `Segurança` no GitHub em todo push: tipos, lint, testes, `npm audit`, regras do banco contra ataques simulados, busca de segredos (gitleaks) e análise de código (CodeQL). Dependabot configurado (passa a agir quando o código estiver no ramo principal). Na primeira execução, as quatro tarefas passaram. Se a análise de código apontar algo, o aviso aparece em _Security → Code scanning_ no GitHub; essa aba não pôde ser lida daqui, vale conferir.

### Infraestrutura

- HTTPS obrigatório (Vercel). Funções em São Paulo.
- Pré-visualizações protegidas por login da Vercel; só o endereço de produção é público.
- Bloqueio na borda (`vercel.json`) de caminhos que só robôs de ataque pedem e de métodos HTTP que o site não usa. Conferido em produção: `/wp-admin`, `/.env`, `/.git/config` e semelhantes recebem 403 antes de chegar ao site.
- A proteção automática da Vercel também agiu durante os testes: depois de algumas sondagens em sequência, ela passou a exigir verificação do computador que as fazia, antes de responder qualquer página.
- Conferência externa depois de cada publicação: `node scripts/conferir-site.cjs <endereço>` abre o site em um navegador e confere 50 pontos (cabeçalhos, CSP, bloqueios, cookie, demonstração, preços e animações).

### Banco de dados (projeto, ainda não conectado)

- `database/schema.sql` segue o padrão: schemas `private` e `audit`; RLS em todas as tabelas, com uma policy por ação e só para usuário logado; quatro papéis por escritório; lista branca de campos por coluna; dinheiro em centavos; exclusão lógica por função; auditoria por gatilho, somente inserção; evento de webhook processado uma única vez.
- **CPF e CNPJ** ficam cifrados (AES-256-GCM, `src/lib/servidor/cripto.ts`) em tabela fora da API, com índice cego para busca. Cada revelação, atendida ou recusada, gera registro. O banco confere de novo o escritório e o papel de quem pede, mesmo quando o pedido vem do servidor.
- **Sigilo profissional:** observações do cliente e descrição do caso não entram na auditoria. Fica só a marca de que existiam ou mudaram.
- **Quem sai perde o acesso na hora:** usuário desativado e escritório encerrado deixam de enxergar qualquer dado.
- `database/teste-isolamento.sql` tenta 172 ataques e regras em PostgreSQL 16, e todos são barrados. Exemplos: escritório A lendo o B, estagiário abrindo o financeiro, advogado se promovendo, sócio mudando o próprio plano sem pagar, visitante sem login, mensagem forjada em nome do cliente, edição da auditoria, evento de webhook repetido. O teste roda em todo push.
- **Prova inversa:** 33 regras do esquema foram enfraquecidas de propósito, uma por vez, e o teste acusou as 33.
- Falta o que só um projeto real mostra: aplicar no Supabase e rodar o Security Advisor.

### Logs, LGPD e incidentes

- Eventos de segurança em JSON (`src/lib/servidor/registro.ts`): login certo e errado, bloqueios, origem recusada, limite excedido, pedido inválido, webhook recusado, falha de IA. E-mail mascarado; nunca senha, token, cookie ou conversa.
- **Política de privacidade** e **termos de uso** publicados e versionados (`/privacidade`, `/termos`), fiéis ao que o site faz hoje.
- Sem banner de cookies, por decisão: o único cookie é o de sessão, estritamente necessário.
- `/.well-known/security.txt` com o contato para avisos de falha.

## 4. O que depende de você

1. **Verificação em duas etapas** em todas as contas: Vercel, GitHub, Supabase, WhatsApp/Meta, e-mail e, quando houver, registrador de domínio e gateway de pagamento. É a proteção de maior efeito e não pode ser ligada por aqui.
2. **Repositório público.** Hoje qualquer pessoa lê o código. Para um produto comercial, torne-o privado em _Settings → General → Change visibility_.
3. **Arquivo antigo `index (1).html`.** É de outro projeto (site de ingressos) e traz o endereço e a chave pública de um banco Supabase que não está na conta conectada a esta sessão. Chave pública pode ficar à vista, mas só é segura se todas as tabelas daquele banco tiverem regras de acesso (RLS). Rode o _Security Advisor_ daquele projeto e, se o arquivo não for mais necessário, remova-o do repositório.
4. **Firewall da Vercel.** A conexão usada aqui não tem acesso a essa área. No painel do projeto (_Firewall_): ligue o _Bot Protection_ em modo "log" e observe por alguns dias; crie uma regra de limite para `/api/auth` e `/api/ia` (60 por minuto por IP); e saiba onde fica o _Attack Challenge Mode_, para ligar em caso de ataque. Não ponha o _Bot Protection_ em modo "challenge" sem liberar `/api/whatsapp/webhook`, e teste antes a prévia do link no WhatsApp.
5. **Dados legais.** Preencha razão social, CNPJ e e-mail de privacidade em `src/lib/marca.ts` (aparecem sozinhos nas páginas) e peça a um advogado para revisar os dois textos.
6. **GitHub.** Em _Settings → Code security_, ligue _Secret scanning_, _Push protection_ e _Dependabot alerts_. Proteja o ramo `main` contra push direto.
7. **Acesso privado e IA.** Gere o hash com `npm run senha`, cadastre `ACESSO_EMAIL`, `ACESSO_SENHA_HASH` e, quando quiser a IA de verdade, `ANTHROPIC_API_KEY`.
8. **Troca de segredos a cada 90 dias** (próxima: fevereiro de 2027) e sempre que alguém sair do projeto.
9. **Domínio próprio.** Ao registrar: bloqueio de transferência, registros SPF, DKIM, DMARC e CAA.
10. **Antes do primeiro cliente real:** banco com Supabase Auth e verificação em duas etapas, chaves `CHAVE_DE_DADOS` e `CHAVE_DE_INDICE` geradas e guardadas em cofre de senhas, backup diário com restauração testada, alertas (Sentry ou similar), guarda dos registros de acesso por 6 meses (Marco Civil, art. 15), um scanner (OWASP ZAP) e, se possível, um teste de invasão.

## 5. Riscos que sobraram

| Risco | Tamanho hoje | Como reduzir |
| --- | --- | --- |
| Limite de requisições guardado na memória de cada instância: um ataque distribuído passa mais do que o limite sugere | Médio | Regra de limite no Firewall da Vercel ou Redis compartilhado (Upstash) |
| Sessão própria, sem verificação em duas etapas, e sem como derrubar uma sessão só (apenas todas, trocando `AUTH_SECRET`) | Médio para o acesso privado | Supabase Auth, no mesmo passo do banco |
| Sem alertas automáticos: os eventos ficam no log, que o plano atual da Vercel guarda por pouco tempo | Médio | Envio dos logs para um serviço de alertas |
| Páginas geradas a cada visita (exigência do nonce): um ataque de volume custa mais do que em site estático | Baixo | Regra de limite no Firewall; a proteção de DDoS da Vercel já atua |
| `style-src 'unsafe-inline'`, exigido pelos atributos de estilo do app | Baixo | Trocar atributos por classes e apertar a diretiva |
| Dados da demonstração no `localStorage`, legíveis por extensões do navegador do visitante | Baixo (dados fictícios; a tela avisa para não cadastrar clientes reais) | Some quando os dados forem para o banco |
| Injeção de instruções na IA nunca é 100% evitável | Baixo (a IA não tem ferramentas com efeito) | Manter a validação no servidor ao criar ferramentas |
| Eventos repetidos do webhook são lembrados só em memória | Baixo (o processamento ainda não está ligado) | Tabela `private.webhook_events`, já no esquema |
| Repositório público e textos legais sem revisão de advogado | A resolver | Itens 2 e 5 da seção anterior |
| Esquema do banco testado em PostgreSQL local, ainda não em um projeto Supabase | A resolver ao conectar | Aplicar em um projeto novo e rodar o Security Advisor |
| Preço mais baixo deixa a margem apertada; o atendente de IA no modelo padrão custaria quase a mensalidade inteira | Risco de negócio | Seção 8 de `docs/PLANO.md`: limites por plano, modelo do atendente e cotação do fornecedor de processos |
| O Next.js anuncia que o modo de cache parcial será obrigatório na próxima versão maior; ele não combina com nonce | Futuro | Manter o Next 16 e rever a CSP antes de migrar |

## 6. Decisões registradas

- **CSP com nonce em vez de `'unsafe-inline'`.** Custo: as páginas deixam de ser estáticas e `cacheComponents` fica desligado.
- **Demonstração sem senha e IA paga só no acesso privado.** Antes havia uma senha de demonstração no código; ela foi removida.
- **scrypt** para o hash de senha (nativo do Node, aceito pela OWASP), em vez de Argon2id ou bcrypt, para não adicionar dependência a um mecanismo provisório.
- **Mensagens antigas do WhatsApp não são recusadas**, ao contrário da regra geral de 5 minutos: a Meta reenvia por dias quando o servidor falha. Elas irão para a equipe, sem resposta automática. A defesa contra repetição é o identificador da mensagem.
- **Sem banner de cookies**, porque não há cookie além do necessário.
- **CPF e CNPJ em tabela fora da API**, e não em coluna da tabela de clientes: assim o navegador nunca recebe o dado cifrado, e só o servidor consegue gravá-lo.
- **Excluir cliente com caso ou contrato em aberto é recusado**, em vez de apagar tudo em cascata como a demonstração faz hoje: evita perda em massa por engano.
- **A barra de comentários da Vercel fica bloqueada nas pré-visualizações**, porque a CSP não libera nenhum domínio de terceiros. Para usá-la, seria preciso liberar `vercel.live` só nesse ambiente.
- **`SECURITY.md` escrito para este projeto**, e não o texto original do padrão, porque o repositório é público.
- **Bot Protection não foi ligado em modo "challenge"**: poderia quebrar a prévia do link no WhatsApp, principal canal de venda.

## 7. Se acontecer um incidente

1. **Conter.** Ligue o _Attack Challenge Mode_ no Firewall da Vercel. Para fechar a demonstração, defina `DEMO_PUBLICA=false` e publique de novo. Em último caso, pause o projeto.
2. **Trancar.** Troque `AUTH_SECRET` (derruba todas as sessões) e toda chave que possa ter vazado.
3. **Preservar.** Exporte os logs da Vercel antes de mexer em qualquer coisa.
4. **Corrigir** a causa e publicar.
5. **Comunicar.** Havendo risco ou dano relevante a titulares de dados, avise a ANPD e os afetados em até 3 dias úteis (agentes de pequeno porte têm prazo em dobro).
6. **Registrar** o que houve, guardar por 5 anos e acrescentar a `SECURITY.md` a regra que evitaria a repetição.

## 8. Checklist de publicação

| Item | Situação |
| --- | --- |
| RLS em 100% das tabelas e Security Advisor sem alerta crítico | Não se aplica ainda: banco não conectado. O esquema pronto tem RLS em todas as tabelas e passa nos 172 cenários do teste. O Security Advisor só roda depois de aplicado no Supabase |
| Usuário A não lê nem edita dado do B; empresa A não vê a B | Não se aplica ainda (sem dados no servidor). Coberto pelo teste do esquema |
| Usuário comum recebe 403 nas ações de administrador | Não se aplica ainda (não há área de administrador). Coberto pelo teste do esquema |
| Nenhum segredo no frontend, no app ou no Git | Feito. Busca no histórico sem achados do projeto; ver item 3 da seção 4 sobre o arquivo antigo |
| Preço, total, saldo e status de pagamento só no servidor | Não se aplica: não há pagamentos |
| Webhooks com assinatura, idempotência e reconsulta | Assinatura e repetição: feito. Reconsulta: não se aplica (não é pagamento) |
| Limite em login, cadastro, reset de senha, IA e rotas caras | Feito para login, demonstração e IA, em memória. Cadastro e reset não existem. Limite na borda: depende de você (item 4) |
| MFA nas contas de administração e de infraestrutura | Depende de você (item 1) |
| Cabeçalhos de segurança ativos | Feito e testado em produção |
| Uploads com tipo real, tamanho máximo e bucket privado | Não se aplica: não há uploads |
| Erros sem stack trace; logs sem senha, token ou CPF | Feito e testado |
| Backup automático e restauração testada | Não se aplica ainda: não há banco |
| `npm audit` sem vulnerabilidade alta ou crítica | Feito: zero vulnerabilidades |
| Política de privacidade, termos e consentimento de cookies | Publicados. Sem banner, por não haver cookie além do necessário. Falta preencher os dados legais (item 5) |
| Alertas configurados | Pendente: há registro dos eventos, mas não alerta automático (seção 5) |
| Preview protegido e produção com chaves próprias | Feito |
