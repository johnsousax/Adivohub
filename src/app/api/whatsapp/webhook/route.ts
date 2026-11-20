import type { NextRequest } from "next/server";
import { esperaPorFalhas, ipDaRequisicao, registrarFalha } from "@/lib/servidor/limite";
import { erro, registrarEvento } from "@/lib/servidor/respostas";
import {
  assinaturaValida,
  criarMemoriaDeEventos,
  desafioValido,
  extrairMensagens,
  mensagemRecente,
  textosIguais,
} from "@/lib/servidor/webhook";

/**
 * Webhook da WhatsApp Business Platform (Cloud API da Meta).
 *
 * Já faz o que a Meta exige e o que o padrão de segurança pede:
 *  - GET: confirma a verificação com WHATSAPP_VERIFY_TOKEN (comparação em tempo constante);
 *  - POST: confere a assinatura X-Hub-Signature-256 com WHATSAPP_APP_SECRET sobre o corpo cru,
 *    limita o tamanho, ignora mensagens repetidas e separa as antigas das recentes.
 *
 * Esta rota não usa a checagem de origem das outras: quem chama é o servidor
 * da Meta, não um navegador, e a autenticação é a assinatura.
 *
 * O que falta para atender clientes reais (depende do banco de dados): gravar a
 * mensagem, chamar o atendente de IA e responder pela API de mensagens. O ponto
 * exato está marcado abaixo.
 */

const TAMANHO_MAXIMO_BYTES = 512_000;
const eventos = criarMemoriaDeEventos();

export async function GET(requisicao: NextRequest) {
  const parametros = requisicao.nextUrl.searchParams;
  const tokenEsperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!tokenEsperado) return erro(requisicao, 503, "WhatsApp ainda não configurado.");

  const chave = `webhook:${ipDaRequisicao(requisicao)}`;
  if (esperaPorFalhas(chave) > 0) return erro(requisicao, 429, "Muitas tentativas.");

  const desafio = parametros.get("hub.challenge");
  const tokenConfere = textosIguais(parametros.get("hub.verify_token") ?? "", tokenEsperado);
  if (parametros.get("hub.mode") === "subscribe" && tokenConfere && desafioValido(desafio)) {
    return new Response(desafio, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
  registrarFalha(chave);
  registrarEvento(requisicao, "webhook.assinatura_invalida", { etapa: "verificacao" }, "aviso");
  return erro(requisicao, 403, "Token de verificação inválido.");
}

export async function POST(requisicao: NextRequest) {
  const segredo = process.env.WHATSAPP_APP_SECRET;
  if (!segredo) return erro(requisicao, 503, "WhatsApp ainda não configurado.");

  // Quem insiste com assinatura errada passa a esperar, antes mesmo de o corpo ser lido.
  const chave = `webhook:${ipDaRequisicao(requisicao)}`;
  if (esperaPorFalhas(chave) > 0) return erro(requisicao, 429, "Muitas tentativas.");

  const anunciado = Number(requisicao.headers.get("content-length") ?? "0");
  if (Number.isFinite(anunciado) && anunciado > TAMANHO_MAXIMO_BYTES) return erro(requisicao, 413, "Requisição grande demais.");

  // Corpo cru, antes de qualquer interpretação: é sobre ele que a assinatura é calculada.
  const corpo = await requisicao.text();
  if (Buffer.byteLength(corpo, "utf8") > TAMANHO_MAXIMO_BYTES) return erro(requisicao, 413, "Requisição grande demais.");

  if (!assinaturaValida(corpo, requisicao.headers.get("x-hub-signature-256"), segredo)) {
    registrarFalha(chave);
    registrarEvento(requisicao, "webhook.assinatura_invalida", { etapa: "evento" }, "aviso");
    return erro(requisicao, 401, "Assinatura inválida.");
  }

  let json: unknown;
  try {
    json = JSON.parse(corpo);
  } catch {
    return erro(requisicao, 400, "JSON inválido.");
  }
  const mensagens = extrairMensagens(json);
  if (!mensagens) return erro(requisicao, 400, "Evento em formato inesperado.");

  const novas = mensagens.filter((mensagem) => !eventos.jaProcessado(mensagem.id));
  const recentes = novas.filter((mensagem) => mensagemRecente(mensagem));
  if (novas.length < mensagens.length) {
    registrarEvento(requisicao, "webhook.repetido", { repetidas: mensagens.length - novas.length });
  }

  // PRÓXIMO PASSO (com o banco conectado): registrar cada mensagem em
  // private.webhook_events, localizar a conversa e o cliente, e:
  //  - mensagens recentes: chamar o atendente e responder pela Cloud API;
  //  - mensagens antigas (reentrega da Meta): entregar à equipe, sem resposta automática.
  // O conteúdo e o telefone nunca vão para o log: só as contagens.
  registrarEvento(requisicao, "webhook.recebido", {
    novas: novas.length,
    recentes: recentes.length,
    antigas: novas.length - recentes.length,
  });

  // A Meta exige 200 rápido, senão reenvia o evento.
  return Response.json({ recebido: true }, { headers: { "Cache-Control": "no-store" } });
}
