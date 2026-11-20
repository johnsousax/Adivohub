/**
 * Content-Security-Policy das páginas.
 *
 * - Scripts: só os que carregam o nonce da resposta (e os que eles próprios
 *   carregam, "strict-dynamic"). Sem 'unsafe-inline' e, em produção, sem 'unsafe-eval'.
 * - Tudo o mais (imagens, fontes, conexões, formulários) só do próprio site.
 *   O site não usa nenhum serviço de terceiros no navegador.
 * - Estilos: os atributos style que o app usa (larguras de gráficos, por
 *   exemplo) exigem 'unsafe-inline'; as folhas de estilo vêm só do próprio site.
 *
 * Ao adicionar um serviço externo (pixel, mapa, vídeo), o domínio dele precisa
 * entrar aqui, na diretiva certa, e na política de privacidade.
 */
export function montarCSP({ nonce, https, desenvolvimento }: { nonce: string; https: boolean; desenvolvimento: boolean }): string {
  const diretivas = [
    "default-src 'self'",
    // Em desenvolvimento o React usa eval para mostrar erros; em produção não.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${desenvolvimento ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${desenvolvimento ? " ws: wss:" : ""}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  // Só em HTTPS: em http://localhost isto quebraria os testes locais.
  if (https) diretivas.push("upgrade-insecure-requests");
  return diretivas.join("; ");
}
