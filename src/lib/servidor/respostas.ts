import "server-only";
import type { NextRequest } from "next/server";
import { COOKIE_SESSAO, lerSessao, type Sessao } from "../auth/sessao";
import { consumirLimite, ipDaRequisicao } from "./limite";
import { origemPermitida } from "./origem";
import { registrar, type EventoDeSeguranca } from "./registro";

/**
 * Peças comuns a todas as rotas de API. A ordem de uso em cada rota é a das
 * camadas de defesa: origem → limite de requisições → sessão → validação.
 */

const ids = new WeakMap<Request, string>();

/** Identificador da requisição: vai na resposta de erro e no log, para ligar um ao outro. */
export function idDaRequisicao(requisicao: Request): string {
  let id = ids.get(requisicao);
  if (!id) {
    // Na Vercel, x-vercel-id termina com o identificador único da requisição.
    id = requisicao.headers.get("x-vercel-id")?.split("::").pop()?.slice(0, 64) || crypto.randomUUID();
    ids.set(requisicao, id);
  }
  return id;
}

/** Dados de quem pediu, para os registros de segurança. Nunca inclui corpo, cookie ou token. */
export function contexto(requisicao: Request): { id: string; rota: string; ip: string; agente: string } {
  return {
    id: idDaRequisicao(requisicao),
    rota: new URL(requisicao.url).pathname,
    ip: ipDaRequisicao(requisicao),
    agente: (requisicao.headers.get("user-agent") ?? "").slice(0, 120),
  };
}

export function registrarEvento(
  requisicao: Request,
  evento: EventoDeSeguranca,
  dados: Record<string, string | number | boolean | null | undefined> = {},
  nivel: "info" | "aviso" | "erro" = "info",
): void {
  registrar(evento, { ...contexto(requisicao), ...dados }, nivel);
}

/** Erro para o cliente: mensagem genérica e o identificador de rastreio. O detalhe fica só no log. */
export function erro(requisicao: Request, status: number, mensagem: string, cabecalhos?: Record<string, string>): Response {
  const id = idDaRequisicao(requisicao);
  return Response.json(
    { erro: mensagem, idRastreio: id },
    { status, headers: { "Cache-Control": "no-store", "X-Request-Id": id, ...cabecalhos } },
  );
}

/**
 * Proteção contra CSRF: toda rota que altera algo (POST) só aceita chamadas
 * feitas pelo próprio site. Complementa o SameSite=Lax do cookie de sessão.
 */
export function exigirMesmaOrigem(requisicao: Request): Response | null {
  const permitida = origemPermitida({
    origin: requisicao.headers.get("origin"),
    secFetchSite: requisicao.headers.get("sec-fetch-site"),
    host: requisicao.headers.get("x-forwarded-host") ?? requisicao.headers.get("host"),
  });
  if (permitida) return null;
  registrarEvento(requisicao, "origem.recusada", { origem: (requisicao.headers.get("origin") ?? "").slice(0, 120) }, "aviso");
  return erro(requisicao, 403, "Requisição recusada.");
}

/** Toda rota de API que toca dados ou gasta crédito de IA confere a sessão aqui. Sem sessão válida = 401. */
export async function exigirSessao(requisicao: NextRequest): Promise<Sessao | Response> {
  const sessao = await lerSessao(requisicao.cookies.get(COOKIE_SESSAO)?.value);
  if (sessao) return sessao;
  // Só registra quando veio um cookie que não valeu (adulterado ou vencido); visita sem cookie é o caso comum.
  if (requisicao.cookies.has(COOKIE_SESSAO)) registrarEvento(requisicao, "sessao.negada", {}, "aviso");
  return erro(requisicao, 401, "Sessão expirada. Entre novamente.");
}

/**
 * Limite de requisições por IP e, quando informado, também por usuário.
 * Estourou qualquer um dos dois = 429.
 */
export function limitar(requisicao: Request, rota: string, maximo: number, janelaMs: number, usuario?: string): Response | null {
  const porIp = consumirLimite(`${rota}:ip:${ipDaRequisicao(requisicao)}`, maximo, janelaMs);
  const porUsuario = usuario ? consumirLimite(`${rota}:usuario:${usuario}`, maximo, janelaMs) : { permitido: true, aguardar: 0 };
  if (porIp.permitido && porUsuario.permitido) return null;
  const aguardar = Math.max(porIp.aguardar, porUsuario.aguardar, 1);
  registrarEvento(requisicao, "limite.excedido", { limite: rota, por: porIp.permitido ? "usuario" : "ip" }, "aviso");
  return erro(requisicao, 429, "Muitas requisições. Aguarde um instante e tente de novo.", { "Retry-After": String(aguardar) });
}

/** Tamanho máximo de qualquer corpo JSON aceito pela API (1 MB). Cada rota usa um teto bem menor. */
const TETO_ABSOLUTO_BYTES = 1_000_000;

/**
 * Lê o corpo JSON com limite de tamanho. Recusa antes de ler quando o
 * cabeçalho já anuncia um corpo grande demais, e exige Content-Type JSON
 * (um formulário de outro site não consegue enviar esse tipo sem permissão).
 */
export async function lerJson(requisicao: Request, limiteBytes = 64_000): Promise<unknown | Response> {
  const limite = Math.min(limiteBytes, TETO_ABSOLUTO_BYTES);
  const tipo = requisicao.headers.get("content-type") ?? "";
  if (!tipo.toLowerCase().startsWith("application/json")) return erro(requisicao, 415, "Envie os dados em JSON.");

  const anunciado = Number(requisicao.headers.get("content-length") ?? "0");
  if (Number.isFinite(anunciado) && anunciado > limite) return erro(requisicao, 413, "Requisição grande demais.");

  const texto = await requisicao.text();
  if (new TextEncoder().encode(texto).byteLength > limite) return erro(requisicao, 413, "Requisição grande demais.");
  try {
    return JSON.parse(texto);
  } catch {
    return erro(requisicao, 400, "JSON inválido.");
  }
}
