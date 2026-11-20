import type { NextRequest } from "next/server";
import { atenderComClaude, descreverErroIA } from "@/lib/ia/claude";
import { configIA, iaPagaLiberada } from "@/lib/ia/config";
import { PedidoAtendimento, type ModoIA, type RespostaAtendimento } from "@/lib/ia/esquemas";
import { atenderLocal } from "@/lib/ia/local";
import { consumirCota } from "@/lib/servidor/limite";
import { erro, exigirMesmaOrigem, exigirSessao, lerJson, limitar, registrarEvento } from "@/lib/servidor/respostas";

export const maxDuration = 60;

export type RespostaRotaAtendimento = RespostaAtendimento & { modo: ModoIA };

/**
 * Atendente virtual: responde à última mensagem do cliente e diz se o sistema
 * deve agendar uma consulta ou passar a conversa para a equipe.
 */
export async function POST(requisicao: NextRequest) {
  const origem = exigirMesmaOrigem(requisicao);
  if (origem) return origem;
  const sessao = await exigirSessao(requisicao);
  if (sessao instanceof Response) return sessao;
  const usuario = sessao.papel === "demo" ? `sessao:${sessao.jti}` : `conta:${sessao.email}`;
  const bloqueio = limitar(requisicao, "ia-atendimento", 40, 5 * 60_000, usuario);
  if (bloqueio) return bloqueio;

  const json = await lerJson(requisicao, 120_000);
  if (json instanceof Response) return json;
  const pedido = PedidoAtendimento.safeParse(json);
  if (!pedido.success) {
    registrarEvento(requisicao, "pedido.invalido", {}, "aviso");
    return erro(requisicao, 400, "Pedido inválido.");
  }

  const ultima = pedido.data.mensagens[pedido.data.mensagens.length - 1];
  if (ultima.de !== "cliente") return erro(requisicao, 400, "A última mensagem precisa ser do cliente.");

  const responder = (dados: RespostaAtendimento, modo: ModoIA) =>
    Response.json({ ...dados, modo } satisfies RespostaRotaAtendimento, { headers: { "Cache-Control": "no-store" } });

  if (!iaPagaLiberada(sessao.papel)) return responder(atenderLocal(pedido.data), "demo");
  // Teto diário de gasto por usuário: acabou a cota, quem responde são as regras locais.
  if (!consumirCota(`ia:${sessao.email}`, configIA().cotaDiaria)) {
    registrarEvento(requisicao, "ia.cota_esgotada", { rota_ia: "atendimento" }, "aviso");
    return responder(atenderLocal(pedido.data), "demo");
  }

  try {
    return responder(await atenderComClaude(pedido.data), "claude");
  } catch (falha) {
    registrarEvento(requisicao, "ia.falha", { rota_ia: "atendimento", motivo: descreverErroIA(falha) }, "erro");
    return responder(atenderLocal(pedido.data), "demo");
  }
}
