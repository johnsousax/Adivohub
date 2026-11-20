import "server-only";

/**
 * Configuração da IA no servidor.
 * Sem ANTHROPIC_API_KEY o sistema continua funcionando em "modo demonstração":
 * as respostas vêm de regras locais (ver local.ts), sem custo.
 */
export const MODELO_PADRAO = "claude-opus-5-5";

export function configIA() {
  return {
    ativa: Boolean(process.env.ANTHROPIC_API_KEY),
    modeloAssistente: process.env.ANTHROPIC_MODEL_ASSISTENTE || MODELO_PADRAO,
    modeloAtendimento: process.env.ANTHROPIC_MODEL_ATENDIMENTO || MODELO_PADRAO,
  };
}
