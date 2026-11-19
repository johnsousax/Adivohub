// Gera os PDFs a partir de slides.html (requer Playwright + Chromium).
// Uso: node gerar-pdf.js <caminho-absoluto>/slides.html <completa.pdf> <clientes.pdf> <pasta-para-screenshots>
const { chromium } = require('playwright');
(async () => {
  const [html, pdfFull, pdfClient, shots] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('file://' + html, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);

  const render = async (pdf, prefix) => {
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
          if (e.closest('.foot') || e.classList.contains('seal') || e.closest('.seal')) return;
          const r = e.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          worst = Math.max(worst, r.bottom - sb.top);
        });
        return { slide: i + 1, bottom: Math.round(worst) };
      })
      .filter(x => x.bottom > 660));
    console.log(prefix, 'slides:', n, 'overflow>660px:', JSON.stringify(overflow));
  };

  await render(pdfFull, 'full-');
  await p.evaluate(() => document.body.classList.add('client'));
  await render(pdfClient, 'cli-');
  await b.close();
})();
