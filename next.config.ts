import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança de todas as respostas.
 * A Content-Security-Policy das páginas é montada a cada requisição em
 * src/proxy.ts, porque leva um código único (nonce). Aqui ficam os cabeçalhos
 * fixos e as políticas das respostas que não são páginas (API e arquivos).
 */
const cabecalhosDeSeguranca = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Origin-Agent-Cluster", value: "?1" },
];

/** Respostas de API são dados: nunca devem ser exibidas como página nem guardadas em cache. */
const cabecalhosDeApi = [
  { key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

/** Arquivos estáticos abertos direto no navegador (um SVG, por exemplo) não executam nada. */
const cabecalhosDeArquivo = [{ key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'; sandbox" }];

const nextConfig: NextConfig = {
  // As páginas são renderizadas a cada requisição: é o que permite o nonce da CSP (ver src/proxy.ts).
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // O endereço antigo (do nome anterior, Vade) leva ao endereço com o nome atual, mantendo o caminho.
  async redirects() {
    return [
      {
        source: "/:caminho*",
        has: [{ type: "host", value: "vade-juridico.vercel.app" }],
        destination: "https://justixup.vercel.app/:caminho*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: cabecalhosDeSeguranca },
      { source: "/api/:path*", headers: cabecalhosDeApi },
      { source: "/:arquivo(.*\\.svg)", headers: cabecalhosDeArquivo },
    ];
  },
};

export default nextConfig;
