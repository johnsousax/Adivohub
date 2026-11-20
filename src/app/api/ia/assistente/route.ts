import type { NextRequest } from "next/server";
import type { Sessao } from "@/lib/auth/sessao";
import { descreverErroIA, transmitirAssistente } from "@/lib/ia/claude";
import { configIA, iaPagaLiberada } from "@/lib/ia/config";
import { PedidoAssistente, type ModoIA } from "@/lib/ia/esquemas";
import { responderAssistenteLocal } from "@/lib/ia/local";
import { consumirCota } from "@/lib/servidor/limite";
import { erro, exigirMesmaOrigem, exigirSessao, idDaRequisicao, lerJson, limitar, registrarEvento } from "@/lib/servidor/respostas";

export const maxDuration = 60;

function cabecalhos(modo: ModoIA): HeadersInit {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Vade-IA": modo,
  };
}

/** Chave do limite por usuário: na demonstração todos compartilham a mesma conta, então vale a sessão. */
function chaveDoUsuario(sessao: Sessao): string {
  return sessao.papel === "demo" ? `sessao:${sessao.jti}` : `conta:${sessao.email}`;
}

/**
 * Assistente do advogado: recebe a conversa e um resumo dos dados do
 * escritório e devolve a resposta em fluxo de texto.
 */
export async function POST(requisicao: NextRequest) {
  const origem = exigirMesmaOrigem(requisicao);
  if (origem) return origem;
  const sessao = await exigirSessao(requisicao);
  if (sessao instanceof Response) return sessao;
  const bloqueio = limitar(requisicao, "ia-assistente", 30, 5 * 60_000, chaveDoUsuario(sessao));
  if (bloqueio) return bloqueio;

  const json = await lerJson(requisicao, 200_000);
  if (json instanceof Response) return json;
  const pedido = PedidoAssistente.safeParse(json);
  if (!pedido.success) {
    registrarEvento(requisicao, "pedido.invalido", {}, "aviso");
    return erro(requisicao, 400, "Pedido inválido.");
  }

  const ultima = pedido.data.mensagens[pedido.data.mensagens.length - 1];
  if (ultima.papel !== "usuario") return erro(requisicao, 400, "A última mensagem precisa ser do usuário.");

  const respostaLocal = () => responderAssistenteLocal(ultima.texto, pedido.data.contexto);

  if (!iaPagaLiberada(sessao.papel)) {
    return new Response(respostaLocal(), { headers: cabecalhos("demo") });
  }
  // Teto diário de gasto por usuário: acabou a cota, a resposta volta a ser a local.
  if (!consumirCota(`ia:${sessao.email}`, configIA().cotaDiaria)) {
    registrarEvento(requisicao, "ia.cota_esgotada", { rota_ia: "assistente" }, "aviso");
    return new Response(`${respostaLocal()}\n\n(Limite diário da IA atingido: resposta em modo básico.)`, { headers: cabecalhos("demo") });
  }

  const idRastreio = idDaRequisicao(requisicao);
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
        // O detalhe técnico fica no log; para a pessoa vai só um motivo genérico e a resposta local.
        registrarEvento(requisicao, "ia.falha", { rota_ia: "assistente", motivo: descreverErroIA(falha) }, "erro");
        const aviso = `\n\n(Resposta em modo básico: ${descreverErroIA(falha)}. Código ${idRastreio}.)`;
        controle.enqueue(codificador.encode(enviouAlgo ? aviso : `${respostaLocal()}${aviso}`));
      } finally {
        controle.close();
      }
    },
  });

  return new Response(fluxo, { headers: cabecalhos("claude") });
}
