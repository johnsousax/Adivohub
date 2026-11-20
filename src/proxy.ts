import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerSessao } from "@/lib/auth/sessao";
import { montarCSP } from "@/lib/servidor/csp";

/**
 * Roda antes de toda página e faz duas coisas:
 *
 * 1. Sessão (checagem otimista): /painel sem sessão válida vai para o login;
 *    /entrar com sessão válida vai direto para o painel. A verificação
 *    definitiva é refeita em cada rota de API.
 *
 * 2. Content-Security-Policy com nonce: cada resposta leva um código único, e
 *    o navegador só executa scripts que carregam esse código. Um script
 *    injetado por um invasor não tem o código e não roda. Por causa disso as
 *    páginas são renderizadas a cada requisição (ver src/app/layout.tsx).
 */
export async function proxy(requisicao: NextRequest) {
  const { pathname, search } = requisicao.nextUrl;
  const sessao = await lerSessao(requisicao.cookies.get(COOKIE_SESSAO)?.value);

  if (pathname.startsWith("/painel") && !sessao) {
    const destino = new URL("/entrar", requisicao.url);
    destino.searchParams.set("de", `${pathname}${search}`);
    return NextResponse.redirect(destino);
  }

  if (pathname === "/entrar" && sessao) {
    return NextResponse.redirect(new URL("/painel", requisicao.url));
  }

  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
  const https = requisicao.nextUrl.protocol === "https:" || requisicao.headers.get("x-forwarded-proto") === "https";
  const politica = montarCSP({ nonce, https, desenvolvimento: process.env.NODE_ENV === "development" });

  // O Next lê a política no cabeçalho da requisição e aplica o nonce aos próprios scripts.
  const cabecalhos = new Headers(requisicao.headers);
  cabecalhos.set("x-nonce", nonce);
  cabecalhos.set("Content-Security-Policy", politica);

  const resposta = NextResponse.next({ request: { headers: cabecalhos } });
  resposta.headers.set("Content-Security-Policy", politica);
  return resposta;
}

export const config = {
  matcher: [
    /*
     * Todas as páginas. Ficam de fora: rotas de API (têm política própria e
     * conferem a sessão sozinhas) e arquivos estáticos.
     */
    "/((?!api/|_next/static|_next/image|produto/|\\.well-known/|favicon\\.ico|icon\\.svg|opengraph-image|robots\\.txt|sitemap\\.xml).*)",
  ],
};
