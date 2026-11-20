import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { erro } from "@/lib/servidor/respostas";

/**
 * Webhook da WhatsApp Business Platform (Cloud API da Meta).
 *
 * Já faz o que a Meta exige para cadastrar o endereço:
 *  - GET: confirma a verificação com WHATSAPP_VERIFY_TOKEN;
 *  - POST: confere a assinatura X-Hub-Signature-256 com WHATSAPP_APP_SECRET.
 *
 * O que falta para atender clientes reais (depende do banco de dados):
 * gravar a mensagem recebida, chamar o atendente de IA e responder pela API
 * de mensagens. O ponto exato está marcado abaixo.
 */

export async function GET(requisicao: NextRequest) {
  const parametros = requisicao.nextUrl.searchParams;
  const tokenEsperado = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!tokenEsperado) return erro(503, "WhatsApp ainda não configurado.");

  if (parametros.get("hub.mode") === "subscribe" && parametros.get("hub.verify_token") === tokenEsperado) {
    return new Response(parametros.get("hub.challenge") ?? "", { status: 200 });
  }
  return erro(403, "Token de verificação inválido.");
}

function assinaturaValida(corpo: string, assinatura: string | null, segredo: string): boolean {
  if (!assinatura?.startsWith("sha256=")) return false;
  const esperada = Buffer.from(createHmac("sha256", segredo).update(corpo).digest("hex"));
  const recebida = Buffer.from(assinatura.slice("sha256=".length));
  return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
}

export async function POST(requisicao: NextRequest) {
  const segredo = process.env.WHATSAPP_APP_SECRET;
  if (!segredo) return erro(503, "WhatsApp ainda não configurado.");

  const corpo = await requisicao.text();
  if (!assinaturaValida(corpo, requisicao.headers.get("x-hub-signature-256"), segredo)) {
    return erro(401, "Assinatura inválida.");
  }

  let evento: { entry?: Array<{ changes?: Array<{ value?: { messages?: unknown[] } }> }> };
  try {
    evento = JSON.parse(corpo);
  } catch {
    return erro(400, "JSON inválido.");
  }

  const recebidas = (evento.entry ?? []).flatMap((e) => e.changes ?? []).flatMap((c) => c.value?.messages ?? []);
  // PRÓXIMO PASSO (com o banco conectado): salvar cada mensagem, localizar a
  // conversa e o cliente, chamar o atendente e enviar a resposta pela Cloud API.
  console.info(`[whatsapp] ${recebidas.length} mensagem(ns) recebida(s); processamento ainda não ligado.`);

  // A Meta exige 200 rápido, senão reenvia o evento.
  return Response.json({ recebido: true });
}
