// Gera os PDFs a partir de slides.html (requer Playwright + Chromium).
//
// Versões padrão (completa e para clientes):
//   node gerar-pdf.js <caminho-absoluto>/slides.html <completa.pdf> <clientes.pdf> <pasta-para-screenshots>
//
// Versão personalizada para um cliente (só a versão para clientes, com o nome na capa e no fechamento):
//   PARA="Dr. Fulano de Tal" PARA_CURTO="Dr. Fulano" node gerar-pdf.js <slides.html> <saida.pdf> <pasta-para-screenshots>
//
// O nome entra só no PDF gerado. Não grave PDFs personalizados no repositório: ele é público.
const { chromium } = require('playwright');
(async () => {
  const para = (process.env.PARA || '').trim();
  const paraCurto = (process.env.PARA_CURTO || para).trim();
  const args = process.argv.slice(2);
  const [html] = args;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('file://' + html, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);

  const render = async (pdf, shots, prefix) => {
    await p.pdf({ path: pdf, width: '1280px', height: '720px', printBackground: true, preferCSSPageSize: true });
    const els = await p.$$('section.s');
    let n = 0;
    for (const el of els) {
      if (!(await el.isVisible())) continue;
      n++;
      await el.screenshot({ path: `${shots}/${prefix}${String(n).padStart(2, '0')}.png` });
    }
    // checagem de transbordo: algum elemento passando da borda inferior útil do slide?
    const overflow = await p.$$eval('section.s', secs => secs
      .filter(s => s.offsetParent !== null)
      .map((s, i) => {
        const sb = s.getBoundingClientRect();
        let worst = 0;
        s.querySelectorAll('*').forEach(e => {
          if (e.closest('.foot') || e.closest('.ft') || e.closest('.seal') || e.closest('.glow') || e.closest('.meta')) return;
          const r = e.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          worst = Math.max(worst, r.bottom - sb.top);
        });
        return { slide: i + 1, bottom: Math.round(worst) };
      })
      .filter(x => x.bottom > 660));
    console.log(prefix, 'slides:', n, 'overflow>660px:', JSON.stringify(overflow));
  };

  if (para) {
    const [, pdf, shots] = args;
    // textContent: o nome entra como texto, nunca como HTML.
    await p.evaluate(({ para, paraCurto }) => {
      document.body.classList.add('client', 'para');
      document.querySelectorAll('[data-para]').forEach(e => { e.textContent = para; });
      document.querySelectorAll('[data-para-curto]').forEach(e => { e.textContent = paraCurto; });
      document.title = document.title + ' · ' + para;
    }, { para, paraCurto });
    await render(pdf, shots, 'para-');
  } else {
    const [, pdfFull, pdfClient, shots] = args;
    await render(pdfFull, shots, 'full-');
    await p.evaluate(() => document.body.classList.add('client'));
    await render(pdfClient, shots, 'cli-');
  }
  await b.close();
})();
