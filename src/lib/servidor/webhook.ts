import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Verificações do webhook da WhatsApp Business Platform (Cloud API da Meta).
 * Sem dependência do Next, para poder ser testado isoladamente.
 */

/** Compara dois textos sem vazar, pelo tempo de resposta, onde eles diferem. */
export function textosIguais(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/** Confere o cabeçalho X-Hub-Signature-256 ("sha256=<hex>") sobre o corpo cru da requisição. */
export function assinaturaValida(corpo: string, assinatura: string | null, segredo: string): boolean {
  if (!segredo || !assinatura?.startsWith("sha256=")) return false;
  const recebida = assinatura.slice("sha256=".length);
  if (!/^[0-9a-f]{64}$/i.test(recebida)) return false;
  const esperada = createHmac("sha256", segredo).update(corpo, "utf8").digest();
  return timingSafeEqual(esperada, Buffer.from(recebida, "hex"));
}

/** O desafio de verificação da Meta é um número; qualquer outra coisa não é devolvida. */
export function desafioValido(desafio: string | null): desafio is string {
  return Boolean(desafio && /^[A-Za-z0-9_-]{1,128}$/.test(desafio));
}

// A Meta acrescenta campos novos com frequência: aqui o esquema lê só o que o sistema usa e ignora o resto.
const Evento = z.object({
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              value: z
                .object({
                  messages: z
                    .array(
                      z.object({
                        id: z.string().min(1).max(256),
                        from: z.string().max(32).optional(),
                        timestamp: z.string().regex(/^\d{1,12}$/),
                        type: z.string().max(32).optional(),
                      }),
                    )
                    .max(100)
                    .optional(),
                })
                .optional(),
            }),
          )
          .max(50)
          .optional(),
      }),
    )
    .max(50)
    .optional(),
});

export interface MensagemRecebida {
  id: string;
  /** Momento do envio pelo cliente, em segundos desde 1970. */
  enviadaEm: number;
  tipo: string;
}

/** Extrai as mensagens de um evento. Devolve null se o formato não for o esperado. */
export function extrairMensagens(evento: unknown): MensagemRecebida[] | null {
  const lido = Evento.safeParse(evento);
  if (!lido.success) return null;
  return (lido.data.entry ?? [])
    .flatMap((entrada) => entrada.changes ?? [])
    .flatMap((mudanca) => mudanca.value?.messages ?? [])
    .map((mensagem) => ({ id: mensagem.id, enviadaEm: Number(mensagem.timestamp), tipo: mensagem.type ?? "desconhecido" }));
}

/**
 * A Meta reenvia eventos por dias quando o servidor falha, então mensagem
 * antiga é legítima e não pode ser descartada. Mas resposta automática só faz
 * sentido para mensagem recente: as antigas vão para a equipe.
 */
export const IDADE_MAXIMA_PARA_RESPOSTA_AUTOMATICA_S = 5 * 60;

export function mensagemRecente(mensagem: MensagemRecebida, agoraMs = Date.now()): boolean {
  const idade = agoraMs / 1000 - mensagem.enviadaEm;
  // Tolerância de um minuto para relógios dessincronizados.
  return idade >= -60 && idade <= IDADE_MAXIMA_PARA_RESPOSTA_AUTOMATICA_S;
}

/**
 * Memória de eventos já processados, para ignorar repetições.
 * Em memória é só "melhor esforço": com o banco, o registro definitivo é a
 * tabela private.webhook_events (ver database/schema.sql).
 */
export function criarMemoriaDeEventos(maximo = 5000) {
  const vistos = new Set<string>();
  return {
    /** Devolve true se o identificador já tinha sido visto; senão, registra e devolve false. */
    jaProcessado(id: string): boolean {
      if (vistos.has(id)) return true;
      if (vistos.size >= maximo) {
        // Descarta os mais antigos (a ordem de inserção é preservada pelo Set).
        let sobra = vistos.size - maximo + 1;
        for (const antigo of vistos) {
          vistos.delete(antigo);
          if (--sobra <= 0) break;
        }
      }
      vistos.add(id);
      return false;
    },
  };
}
