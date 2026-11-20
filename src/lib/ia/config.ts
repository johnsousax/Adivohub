import "server-only";
import type { PapelSessao } from "../auth/sessao";

/**
 * Configuração da IA no servidor.
 * Sem ANTHROPIC_API_KEY o sistema continua funcionando em "modo demonstração":
 * as respostas vêm de regras locais (ver local.ts), sem custo.
 */
export const MODELO_PADRAO = "claude-opus-5-5";

/** Chamadas pagas de IA por usuário a cada 24 horas, quando IA_COTA_DIARIA não é definida. */
export const COTA_DIARIA_PADRAO = 300;

export function configIA() {
  const cota = Number(process.env.IA_COTA_DIARIA);
  return {
    ativa: Boolean(process.env.ANTHROPIC_API_KEY),
    modeloAssistente: process.env.ANTHROPIC_MODEL_ASSISTENTE || MODELO_PADRAO,
    modeloAtendimento: process.env.ANTHROPIC_MODEL_ATENDIMENTO || MODELO_PADRAO,
    cotaDiaria: Number.isInteger(cota) && cota > 0 ? cota : COTA_DIARIA_PADRAO,
  };
}

/**
 * A IA paga só responde ao acesso privado ("equipe"). Quem entra pela
 * demonstração pública recebe sempre as respostas locais: assim nenhum
 * visitante consegue gastar os créditos da chave, mesmo que ela esteja cadastrada.
 */
export function iaPagaLiberada(papel: PapelSessao): boolean {
  return configIA().ativa && papel === "equipe";
}
