import "server-only";
import type { NextRequest } from "next/server";
import { COOKIE_SESSAO, lerSessao, type Sessao } from "../auth/sessao";
import { consumirLimite, ipDaRequisicao } from "./limite";

export function erro(status: number, mensagem: string, cabecalhos?: HeadersInit): Response {
  return Response.json({ erro: mensagem }, { status, headers: cabecalhos });
}

/** Toda rota de API que toca dados ou gasta crédito de IA confere a sessão aqui. */
export async function exigirSessao(requisicao: NextRequest): Promise<Sessao | Response> {
  const sessao = await lerSessao(requisicao.cookies.get(COOKIE_SESSAO)?.value);
  return sessao ?? erro(401, "Sessão expirada. Entre novamente.");
}

export function limitar(requisicao: Request, rota: string, maximo: number, janelaMs: number): Response | null {
  const resultado = consumirLimite(`${rota}:${ipDaRequisicao(requisicao)}`, maximo, janelaMs);
  if (resultado.permitido) return null;
  return erro(429, "Muitas requisições. Aguarde um instante e tente de novo.", {
    "Retry-After": String(resultado.aguardar),
  });
}

/** Lê o corpo JSON com limite de tamanho, para ninguém enviar megabytes. */
export async function lerJson(requisicao: Request, limiteBytes = 64_000): Promise<unknown | Response> {
  const texto = await requisicao.text();
  if (texto.length > limiteBytes) return erro(413, "Requisição grande demais.");
  try {
    return JSON.parse(texto);
  } catch {
    return erro(400, "JSON inválido.");
  }
}
