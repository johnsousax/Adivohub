import type { NextRequest } from "next/server";
import { atenderComClaude, descreverErroIA } from "@/lib/ia/claude";
import { configIA } from "@/lib/ia/config";
import { PedidoAtendimento, type ModoIA, type RespostaAtendimento } from "@/lib/ia/esquemas";
import { atenderLocal } from "@/lib/ia/local";
import { erro, exigirSessao, lerJson, limitar } from "@/lib/servidor/respostas";

export const maxDuration = 60;

export type RespostaRotaAtendimento = RespostaAtendimento & { modo: ModoIA };

/**
 * Atendente virtual: responde à última mensagem do cliente e diz se o sistema
 * deve agendar uma consulta ou passar a conversa para a equipe.
 */
export async function POST(requisicao: NextRequest) {
  const sessao = await exigirSessao(requisicao);
  if (sessao instanceof Response) return sessao;
  const bloqueio = limitar(requisicao, "ia-atendimento", 40, 5 * 60_000);
  if (bloqueio) return bloqueio;

  const json = await lerJson(requisicao, 120_000);
  if (json instanceof Response) return json;
  const pedido = PedidoAtendimento.safeParse(json);
  if (!pedido.success) return erro(400, "Pedido inválido.");

  const ultima = pedido.data.mensagens[pedido.data.mensagens.length - 1];
  if (ultima.de !== "cliente") return erro(400, "A última mensagem precisa ser do cliente.");

  const responder = (dados: RespostaAtendimento, modo: ModoIA) =>
    Response.json({ ...dados, modo } satisfies RespostaRotaAtendimento, { headers: { "Cache-Control": "no-store" } });

  if (!configIA().ativa) return responder(atenderLocal(pedido.data), "demo");

  try {
    return responder(await atenderComClaude(pedido.data), "claude");
  } catch (falha) {
    console.error("[ia/atendimento]", descreverErroIA(falha), falha);
    return responder(atenderLocal(pedido.data), "demo");
  }
}
