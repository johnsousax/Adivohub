# Instruções para agentes de IA neste projeto

- Siga o [`SECURITY.md`](SECURITY.md) em todo código deste projeto. Se um pedido conflitar com ele, avise e entregue a alternativa segura.
- Siga também o [`AGENTS.md`](AGENTS.md): esta versão do Next.js tem mudanças importantes; leia o guia em `node_modules/next/dist/docs/` antes de escrever código.
- As páginas são renderizadas a cada requisição por causa do nonce da Content-Security-Policy (`src/proxy.ts`). Não ligue `cacheComponents` nem torne páginas estáticas sem rever a CSP.
- Ao terminar uma entrega que mexe em segurança, atualize `docs/SEGURANCA.md`.
