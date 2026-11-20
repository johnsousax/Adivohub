import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerSessao } from "@/lib/auth/sessao";

/**
 * Checagem otimista de sessão antes de renderizar:
 * - /painel sem sessão válida → vai para o login;
 * - /entrar com sessão válida → vai direto para o painel.
 * A verificação definitiva é refeita em cada rota de API.
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/painel/:path*", "/entrar"],
};
