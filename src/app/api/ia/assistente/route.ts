import type { NextRequest } from "next/server";
import { descreverErroIA, transmitirAssistente } from "@/lib/ia/claude";
import { configIA } from "@/lib/ia/config";
import { PedidoAssistente, type ModoIA } from "@/lib/ia/esquemas";
import { responderAssistenteLocal } from "@/lib/ia/local";
import { erro, exigirSessao, lerJson, limitar } from "@/lib/servidor/respostas";

export const maxDuration = 60;

function cabecalhos(modo: ModoIA): HeadersInit {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Vade-IA": modo,
  };
}

/**
 * Assistente do advogado: recebe a conversa e um resumo dos dados do
 * escritório e devolve a resposta em fluxo de texto.
 */
export async function POST(requisicao: NextRequest) {
  const sessao = await exigirSessao(requisicao);
  if (sessao instanceof Response) return sessao;
  const bloqueio = limitar(requisicao, "ia-assistente", 30, 5 * 60_000);
  if (bloqueio) return bloqueio;

  const json = await lerJson(requisicao, 200_000);
  if (json instanceof Response) return json;
  const pedido = PedidoAssistente.safeParse(json);
  if (!pedido.success) return erro(400, "Pedido inválido.");

  const ultima = pedido.data.mensagens[pedido.data.mensagens.length - 1];
  if (ultima.papel !== "usuario") return erro(400, "A última mensagem precisa ser do usuário.");

  const respostaLocal = () => responderAssistenteLocal(ultima.texto, pedido.data.contexto);

  if (!configIA().ativa) {
    return new Response(respostaLocal(), { headers: cabecalhos("demo") });
  }

  const codificador = new TextEncoder();
  const fluxo = new ReadableStream<Uint8Array>({
    async start(controle) {
      let enviouAlgo = false;
      try {
        for await (const trecho of transmitirAssistente(pedido.data)) {
          enviouAlgo = true;
          controle.enqueue(codificador.encode(trecho));
        }
      } catch (falha) {
        console.error("[ia/assistente]", descreverErroIA(falha), falha);
        // A IA falhou: responde com as regras locais para a pessoa não ficar sem resposta.
        const aviso = `\n\n(Resposta em modo básico: ${descreverErroIA(falha)}.)`;
        controle.enqueue(codificador.encode(enviouAlgo ? aviso : `${respostaLocal()}${aviso}`));
      } finally {
        controle.close();
      }
    },
  });

  return new Response(fluxo, { headers: cabecalhos("claude") });
}
