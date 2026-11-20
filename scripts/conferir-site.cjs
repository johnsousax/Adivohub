/**
 * Conferência de um endereço publicado: segurança e funcionamento, vistos de fora.
 *
 * Abre o site em um navegador de verdade e confere cabeçalhos, política de conteúdo
 * (CSP), bloqueios na borda, cookie de sessão, recusa de pedidos de outro site,
 * a demonstração, os preços e as animações da landing page.
 *
 * Uso, depois de cada publicação:
 *   node scripts/conferir-site.cjs https://justixup.vercel.app
 *
 * Precisa do Playwright com o Chromium instalado (npx playwright install chromium).
 * Os bloqueios na borda só existem na Vercel: em um servidor local, essas dez
 * checagens falham e as outras passam.
 * Para uma pré-visualização protegida, passe o link de compartilhamento em SHARE.
 */
const { chromium, devices } = require("playwright");
const BASE = (process.argv[2] || process.env.BASE || "").replace(/[/]+$/, "");
if (!BASE) {
  console.log("Informe o endereço: node scripts/conferir-site.cjs https://exemplo.com");
  process.exit(1);
}
const SHARE = process.env.SHARE || BASE;
const ok = [];
const bad = [];
const t = (nome, cond, det) => {
  if (cond) ok.push(nome);
  else bad.push(nome + " [" + String(det).slice(0, 170) + "]");
};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => {
    if (m.type() === "error") errs.push(m.text().slice(0, 150));
  });
  page.on("pageerror", (e) => errs.push("JS " + String(e).slice(0, 150)));

  const r0 = await page.goto(SHARE, { waitUntil: "networkidle" });
  if (r0.status() === 403 && r0.headers()["x-vercel-mitigated"] === "challenge") {
    console.log("A Vercel exigiu verificação deste endereço de teste antes de responder (proteção contra robôs).");
    console.log("Espere alguns minutos ou rode de outra rede.");
    await b.close();
    process.exit(2);
  }
  t("landing 200", r0.status() === 200, r0.status());
  const h = r0.headers();
  const csp = h["content-security-policy"] || "";
  const scripts =
    csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src")) || "";
  t(
    "csp com nonce",
    scripts.includes("nonce-") &&
      scripts.includes("strict-dynamic") &&
      !scripts.includes("unsafe-inline") &&
      !scripts.includes("unsafe-eval"),
    scripts,
  );
  t(
    "csp fecha molduras e objetos",
    csp.includes("frame-ancestors") && csp.includes("object-src") && csp.includes("base-uri"),
    csp.slice(0, 150),
  );
  t("hsts", (h["strict-transport-security"] || "").includes("max-age=63072000"), h["strict-transport-security"]);
  t("x-frame-options", h["x-frame-options"] === "DENY", h["x-frame-options"]);
  t("nosniff", h["x-content-type-options"] === "nosniff", h["x-content-type-options"]);
  t("referrer-policy", h["referrer-policy"] === "strict-origin-when-cross-origin", h["referrer-policy"]);
  t("permissions-policy", (h["permissions-policy"] || "").includes("camera=()"), h["permissions-policy"]);
  t("sem x-powered-by", !h["x-powered-by"], h["x-powered-by"]);
  // Nas pré-visualizações a Vercel injeta a barra de comentários dela (vercel.live), que a CSP do site bloqueia.
  const semNonce = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll("script")).filter(
        (s) => (s.src || s.textContent.trim()) && s.type !== "application/ld+json" && !s.nonce && !s.src.includes("vercel.live"),
      ).length,
  );
  t("todo script com nonce", semNonce === 0, semNonce);

  const rq = ctx.request;
  const pedir = (caminho, o) => rq.fetch(BASE + caminho, Object.assign({ maxRedirects: 0, failOnStatusCode: false }, o || {}));
  const nonceDe = async () => ((await pedir("/")).headers()["content-security-policy"] || "").split("nonce-")[1] || "";
  const n1 = await nonceDe();
  const n2 = await nonceDe();
  t("nonce muda a cada resposta", n1.length > 10 && n1.slice(0, 22) !== n2.slice(0, 22), n1.slice(0, 22));

  for (const c of ["/privacidade", "/termos", "/entrar", "/robots.txt", "/sitemap.xml", "/icon.svg", "/api/health"]) {
    const r = await pedir(c);
    t("abre " + c, r.status() === 200, r.status());
  }
  const st = await pedir("/.well-known/security.txt");
  t("security.txt", st.status() === 200 && (await st.text()).includes("Contact:"), st.status());

  const pn = await pedir("/painel");
  t(
    "painel sem sessao vai ao login",
    [302, 307, 308].includes(pn.status()) && (pn.headers()["location"] || "").includes("/entrar"),
    pn.status() + " " + pn.headers()["location"],
  );
  const json = { "content-type": "application/json" };
  const demo = await pedir("/api/auth/demo", { method: "POST", headers: Object.assign({ origin: BASE }, json), data: {} });
  const cookie =
    (demo.headersArray().find((x) => x.name.toLowerCase() === "set-cookie" && x.value.includes("justixup_sessao")) || {}).value || "";
  t("demonstracao abre sem senha", demo.status() === 200, demo.status() + " " + (await demo.text()).slice(0, 90));
  t(
    "cookie __Host- HttpOnly Secure SameSite",
    cookie.startsWith("__Host-justixup_sessao=") &&
      cookie.includes("HttpOnly") &&
      cookie.includes("Secure") &&
      cookie.includes("SameSite=Lax") &&
      cookie.includes("Path=/") &&
      !cookie.toLowerCase().includes("domain="),
    cookie.replace(/=[^;]+/, "=<token>").slice(0, 120),
  );
  const ss = await pedir("/api/auth/sessao");
  const ssTexto = await ss.text();
  t("sessao tem papel demo", ss.status() === 200 && ssTexto.includes("demo"), ss.status() + " " + ssTexto.slice(0, 90));
  const iaDemo = await pedir("/api/integracoes");
  const iaTexto = await iaDemo.text();
  t("integracoes nao expoe chave", iaDemo.status() === 200 && !iaTexto.includes("sk-ant"), iaDemo.status());
  await ctx.clearCookies({ name: "__Host-justixup_sessao" });

  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const texto = await page.evaluate(() => document.body.innerText);
  t(
    "planos e precos na landing",
    (await page.locator("#planos").count()) === 1 && texto.includes("2.999") && texto.includes("4.497") && texto.includes("5.997"),
    "planos",
  );
  t(
    "secao de seguranca e links legais",
    (await page.locator("#seguranca").count()) === 1 && (await page.locator("a[href$=privacidade]").count()) > 0,
    "secao",
  );
  const antes = await page.evaluate(() => document.querySelectorAll("[data-revelar=oculto]").length);
  const altura = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= altura; y += 500) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(110);
  }
  await page.waitForTimeout(900);
  const depois = await page.evaluate(() => document.querySelectorAll("[data-revelar=oculto]").length);
  t("animacao de rolagem: aguardam e depois aparecem", antes > 5 && depois === 0, antes + " -> " + depois);
  const invisiveis = await page.evaluate(
    () => Array.from(document.querySelectorAll("[data-revelar]")).filter((e) => Number(getComputedStyle(e).opacity) < 0.99).length,
  );
  t("nenhum bloco fica invisivel", invisiveis === 0, invisiveis);
  const zaps = await page.evaluate(
    () => Array.from(document.querySelectorAll("a")).filter((a) => a.href.includes("wa.me/5598983385000")).length,
  );
  t("whatsapp de vendas nos botoes", zaps >= 5, zaps);

  await page.goto(BASE + "/entrar", { waitUntil: "networkidle" });
  const botao = page.getByRole("button", { name: /demonstra/i });
  t("botao da demonstracao aparece", (await botao.count()) === 1, (await page.evaluate(() => document.body.innerText)).slice(0, 120));
  if ((await botao.count()) === 1) {
    await botao.click();
    await page.waitForURL((u) => u.pathname.startsWith("/painel"), { timeout: 20000 }).catch(() => {});
    t("botao da demonstracao abre o painel", new URL(page.url()).pathname.startsWith("/painel"), page.url());
    await page.waitForTimeout(1500);
    const painel = await page.evaluate(() => document.body.innerText);
    t("painel mostra os dados da demonstracao", painel.includes("Dr. Gabriel") && painel.includes("Prazos"), painel.slice(0, 80));
    await page.goto(BASE + "/painel/financeiro", { waitUntil: "networkidle" });
    t("financeiro abre", (await page.evaluate(() => document.body.innerText)).includes("receber"), page.url());
  }

  const cel = await b.newContext(devices["iPhone 13"]);
  if (SHARE !== BASE) await cel.addCookies((await ctx.cookies()).filter((c) => c.name.startsWith("_vercel")));
  const pc = await cel.newPage();
  pc.on("console", (m) => {
    if (m.type() === "error") errs.push("cel " + m.text().slice(0, 140));
  });
  await pc.goto(BASE + "/", { waitUntil: "networkidle" });
  const largura = await pc.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  t("celular sem rolagem lateral", largura <= 1, largura);

  const graves = errs.filter((e) => !e.includes("401") && !e.includes("403") && !e.includes("vercel.live"));
  t("console sem erros nem violacao de CSP", graves.length === 0, graves.join(" | "));

  // Pedidos que o site deve recusar. Ficam no fim de propósito: depois de alguns deles, a Vercel
  // passa a desconfiar do endereço de quem testa e exige uma verificação antes de responder.
  await ctx.clearCookies({ name: "__Host-justixup_sessao" });
  const ia = await pedir("/api/ia/assistente", {
    method: "POST",
    headers: Object.assign({ origin: BASE }, json),
    data: { pergunta: "oi" },
  });
  t("ia sem sessao 401", ia.status() === 401, ia.status());
  const fora = await pedir("/api/auth/demo", {
    method: "POST",
    headers: Object.assign({ origin: "https://evil.example" }, json),
    data: {},
  });
  t("post de outro site 403", fora.status() === 403, fora.status());
  const lg = await pedir("/api/auth/login", {
    method: "POST",
    headers: Object.assign({ origin: BASE }, json),
    data: { email: "ninguem@escritorio.example", senha: "senha errada de teste" },
  });
  const lgTexto = await lg.text();
  t(
    "login errado: 401 e mensagem neutra",
    lg.status() === 401 && lgTexto.includes("inv") && !lgTexto.includes("stack"),
    lg.status() + " " + lgTexto.slice(0, 90),
  );
  const extra = await pedir("/api/auth/login", {
    method: "POST",
    headers: Object.assign({ origin: BASE }, json),
    data: { email: "a@b.example", senha: "x", papel: "equipe" },
  });
  t("campo extra recusado 400", extra.status() === 400, extra.status());
  const wh = await pedir("/api/whatsapp/webhook", { method: "POST", headers: json, data: { entry: [] } });
  t("webhook fechado sem assinatura", [401, 503].includes(wh.status()), wh.status());

  for (const c of ["/wp-admin", "/wp-login.php", "/.env", "/.git/config", "/phpmyadmin", "/backup.sql", "/cgi-bin/test.cgi"]) {
    const r = await pedir(c);
    t(
      "borda nega " + c,
      r.status() === 403 && r.headers()["x-vercel-mitigated"] === "deny",
      r.status() + " " + r.headers()["x-vercel-mitigated"],
    );
  }
  for (const m of ["PUT", "DELETE", "PATCH"]) {
    const r = await pedir("/api/auth/sessao", { method: m });
    t("borda nega metodo " + m, r.status() === 403, r.status());
  }
  await b.close();
  console.log("PASSARAM " + ok.length + " de " + (ok.length + bad.length));
  if (bad.length) console.log("FALHAS:" + bad.map((x) => " # " + x).join(""));
  else console.log("OK: " + ok.join("; "));
  process.exit(bad.length ? 1 : 0);
})().catch((e) => {
  console.log("ERRO " + String((e && e.stack) || e).slice(0, 600));
  console.log("Até o erro: " + ok.length + " passaram" + (bad.length ? "; FALHAS:" + bad.map((x) => " # " + x).join("") : ""));
  process.exit(1);
});
