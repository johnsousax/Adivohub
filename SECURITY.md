# Segurança do Vade

Este arquivo tem duas partes: como avisar de uma falha e as regras que todo código do projeto segue.
O retrato atual da segurança (o que está feito, o que falta e os riscos que sobraram) está em [`docs/SEGURANCA.md`](docs/SEGURANCA.md).

## Encontrou uma falha?

- **Não abra uma issue pública.** Avise em particular pelo WhatsApp de contato do projeto: https://wa.me/5598970050096
- Diga o que encontrou, como reproduzir e o impacto que você enxerga. Respondemos em até 3 dias úteis.
- Pedimos que você não acesse dados de terceiros, não derrube o serviço e nos dê tempo de corrigir antes de divulgar.

O mesmo contato está em `/.well-known/security.txt` no site.

## Regras de ouro

Valem acima de pressa, estética ou atalho. Se um pedido conflitar com elas, avise e entregue a alternativa segura.

1. **Nunca confie no navegador.** Preço, permissão, papel do usuário e qualquer decisão que importe são definidos e conferidos no servidor.
2. **Negar por padrão.** Tudo começa fechado; só abre o que tem regra explícita.
3. **Menor privilégio.** Cada usuário, chave e função acessa o mínimo necessário.
4. **Defesa em camadas:** firewall → limite de requisições → origem → sessão → validação → regras do banco (RLS). Se uma falhar, a próxima segura.
5. **Falhar fechado.** Erro em uma verificação significa acesso negado.
6. **Segredo nunca no navegador, no Git ou em log.** Só variáveis de ambiente do servidor.
7. **Rastro.** O que importa para a segurança gera registro; o registro nunca traz senha, token, cookie ou conteúdo de conversa.

## Como isso aparece no código

### Rotas de API (`src/app/api`)

Toda rota que altera algo segue esta ordem, com as peças de `src/lib/servidor/respostas.ts`:

```ts
const origem = exigirMesmaOrigem(requisicao); // CSRF: só o próprio site chama
if (origem) return origem;
const sessao = await exigirSessao(requisicao); // sem sessão válida = 401
if (sessao instanceof Response) return sessao;
const bloqueio = limitar(requisicao, "nome-da-rota", 30, 5 * 60_000, usuario); // por IP e por usuário
if (bloqueio) return bloqueio;
const json = await lerJson(requisicao, 64_000); // só JSON, com teto de tamanho
if (json instanceof Response) return json;
const pedido = Esquema.safeParse(json); // z.strictObject: campo desconhecido = recusado
if (!pedido.success) return erro(requisicao, 400, "Pedido inválido.");
```

- Esquemas com `z.strictObject` e tamanho máximo em todo texto e toda lista.
- Erros com mensagem genérica e código de rastreio (`erro(...)`). Detalhe técnico só no log (`registrarEvento`).
- Nunca passe o corpo inteiro adiante: escolha os campos. O cliente nunca define papel, dono ou escritório de um dado.
- Webhooks não usam a checagem de origem: a autenticação é a assinatura, conferida sobre o corpo cru e em tempo constante.

### Sessão e acesso (`src/lib/auth`)

- Cookie `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`. Nunca token em `localStorage`.
- Senha nunca é guardada: só o hash (scrypt). Não existe senha padrão no código.
- Mensagem de erro de login sempre neutra, e o tempo de resposta é o mesmo exista ou não a conta.
- A sessão própria é provisória. Com o banco, ela dá lugar a um provedor de autenticação (Supabase Auth) com verificação em duas etapas.

### Páginas e navegador

- A Content-Security-Policy é montada em `src/lib/servidor/csp.ts` e aplicada em `src/proxy.ts`, com um código único (nonce) por resposta. Sem `'unsafe-inline'` e sem `'unsafe-eval'` em scripts.
- Serviço de terceiros no navegador (pixel, mapa, vídeo, analytics): só com o domínio liberado na CSP, consentimento do visitante e atualização da política de privacidade.
- Proibido `dangerouslySetInnerHTML` com conteúdo de usuário. Links externos com `rel="noopener noreferrer"`.
- Nada sensível em `localStorage`, `sessionStorage` ou na URL.

### Inteligência artificial (`src/lib/ia`)

- Mensagem de cliente e dado de sistema são informação, nunca instrução. Os prompts dizem isso e as ações são validadas no servidor.
- A IA só agenda em horário que o sistema ofereceu e nunca decide preço, desconto ou pagamento.
- A demonstração pública nunca usa a IA paga. O acesso privado tem teto diário de chamadas.
- Nenhum segredo, e nenhum dado de outro escritório, entra em um prompt.

### Banco de dados (`database/`)

- Toda tabela com dados de escritório tem `escritorio_id`, RLS ligado e uma policy por ação. O navegador só envia os campos da lista branca de cada tabela.
- Dinheiro em centavos (inteiro). Exclusão lógica, pela função `excluir_registro`. Auditoria gravada por gatilho, somente inserção e sem texto sigiloso.
- CPF e CNPJ: cifrados pelo servidor (`src/lib/servidor/cripto.ts`) e guardados fora da API. Revelar gera registro.
- Função com privilégio elevado (`security definer`) só no schema `private`, com caminho de busca travado.
- A chave de serviço do banco só existe no servidor.
- Toda mudança é uma migração versionada. Nada de editar produção à mão.
- Mudou o esquema? Acrescente o ataque correspondente em `database/teste-isolamento.sql`. O teste roda em todo push.

### Segredos e dependências

- `.env*` fora do Git; `.env.example` só com os nomes.
- Um valor diferente por ambiente (produção, pré-visualização, desenvolvimento). Troca a cada 90 dias e sempre que alguém sair do projeto.
- O fluxo `Segurança` do GitHub roda em todo push: tipos, lint, testes, `npm audit`, regras do banco contra ataques simulados, busca de segredos e análise de código.

## Antes de publicar

- `npm run typecheck && npm run lint && npm test` sem falhas.
- `npm audit --audit-level=high` sem achados.
- Nenhuma variável nova com segredo no navegador (`NEXT_PUBLIC_` é público).
- Mudou o que o site coleta ou com quem compartilha? Atualize `/privacidade` e a versão em `src/lib/marca.ts`.
- Revise o checklist de `docs/SEGURANCA.md`.

Depois de publicar, confira o endereço de fora: `node scripts/conferir-site.cjs https://vade-juridico.vercel.app`.
