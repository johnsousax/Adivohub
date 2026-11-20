/**
 * Refaz a imagem do painel usada no topo da landing page (public/produto/painel.png).
 *
 * Use depois de mudar o visual da visão geral:
 *   1. suba o app (npm run build && npm start);
 *   2. rode: node scripts/capturar-tela.cjs [http://localhost:3000]
 *
 * Precisa do Playwright com o Chromium instalado (npx playwright install chromium).
 * O relógio do navegador é fixado em um dia útil, para a tela sair com agenda e prazos.
 */
const { chromium } = require("playwright");

const base = process.argv[2] ?? "http://localhost:3000";
const DIA_DA_FOTO = new Date("2026-11-24T08:40:00");

(async () => {
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: "pt-BR" });
  const pagina = await contexto.newPage();
  await pagina.clock.setFixedTime(DIA_DA_FOTO);

  await pagina.goto(`${base}/entrar`, { waitUntil: "networkidle" });
  await pagina.getByRole("button", { name: /Abrir a demonstração/ }).click();
  await pagina.waitForURL("**/painel");
  await pagina.waitForLoadState("networkidle");
  await pagina.screenshot({ path: "public/produto/painel.png" });

  await navegador.close();
  console.log("Imagem salva em public/produto/painel.png");
})();
