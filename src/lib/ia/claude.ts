import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { configIA } from "./config";
import { RespostaAtendimento, type PedidoAssistente, type PedidoAtendimento } from "./esquemas";
import { formatarContexto, formatarPedidoAtendimento, SISTEMA_ASSISTENTE, SISTEMA_ATENDIMENTO } from "./prompts";

let cliente: Anthropic | null = null;

function obterCliente(): Anthropic {
  // Lê ANTHROPIC_API_KEY do ambiente; poucas tentativas para a tela não ficar esperando.
  cliente ??= new Anthropic({ maxRetries: 1, timeout: 60_000 });
  return cliente;
}

export function descreverErroIA(erro: unknown): string {
  if (erro instanceof Anthropic.AuthenticationError) return "chave da API inválida";
  if (erro instanceof Anthropic.RateLimitError) return "limite de uso da API atingido";
  if (erro instanceof Anthropic.APIConnectionError) return "falha de conexão com a API";
  if (erro instanceof Anthropic.APIError) return `erro ${erro.status ?? "desconhecido"} da API`;
  return "erro inesperado";
}

/**
 * Resposta do assistente, em fluxo de texto.
 * Os dados do escritório vão junto da primeira pergunta; o prompt de sistema
 * fica estável para aproveitar o cache de prompt.
 */
export async function* transmitirAssistente(pedido: PedidoAssistente): AsyncGenerator<string> {
  const { modeloAssistente } = configIA();
  const dados = formatarContexto(pedido.contexto);

  const mensagens: Anthropic.Beta.BetaMessageParam[] = pedido.mensagens.map((mensagem, indice) => ({
    role: mensagem.papel === "usuario" ? "user" : "assistant",
    content: indice === 0 ? `${dados}\n\n${mensagem.texto}` : mensagem.texto,
  }));

  const fluxo = obterCliente().beta.messages.stream({
    model: modeloAssistente,
    max_tokens: 8192,
    // Se o modelo recusar por política, a própria API tenta o modelo substituto padrão.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    cache_control: { type: "ephemeral" },
    output_config: { effort: "medium" },
    system: SISTEMA_ASSISTENTE,
    messages: mensagens,
  });

  for await (const evento of fluxo) {
    if (evento.type === "content_block_delta" && evento.delta.type === "text_delta") {
      yield evento.delta.text;
    }
  }

  const final = await fluxo.finalMessage();
  if (final.stop_reason === "refusal") {
    yield "Não consigo ajudar com esse pedido. Posso responder sobre prazos, agenda, casos, clientes e financeiro do escritório.";
  } else if (final.stop_reason === "max_tokens") {
    yield "\n\n(A resposta foi cortada por tamanho. Peça para eu continuar.)";
  }
}

/** Resposta do atendente a uma conversa de WhatsApp, já com a ação a executar. */
export async function atenderComClaude(pedido: PedidoAtendimento): Promise<RespostaAtendimento> {
  const { modeloAtendimento } = configIA();

  const resposta = await obterCliente().messages.parse({
    model: modeloAtendimento,
    max_tokens: 2048,
    system: SISTEMA_ATENDIMENTO,
    messages: [{ role: "user", content: formatarPedidoAtendimento(pedido) }],
    output_config: { effort: "low", format: zodOutputFormat(RespostaAtendimento) },
  });

  const saida = resposta.parsed_output;
  if (resposta.stop_reason === "refusal" || !saida || !saida.resposta.trim()) {
    // Recusa ou saída inválida: uma pessoa assume, que é o comportamento seguro.
    return {
      resposta: "Vou pedir para alguém da equipe continuar o atendimento com você por aqui.",
      acao: "transferir",
      horario: null,
    };
  }

  // A IA só pode agendar em horário que o sistema ofereceu.
  if (saida.acao === "agendar" && (!saida.horario || !pedido.horarios.includes(saida.horario))) {
    return { resposta: saida.resposta, acao: "nenhuma", horario: null };
  }
  return {
    resposta: saida.resposta.slice(0, 1500),
    acao: saida.acao,
    horario: saida.acao === "agendar" ? saida.horario : null,
  };
}
