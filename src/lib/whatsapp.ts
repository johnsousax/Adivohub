import { MARCA } from "./marca";

/** Mantém só os dígitos e garante o DDI do Brasil (55). */
export function paraE164(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

/** Link "clique para conversar" do WhatsApp, com mensagem já preenchida. */
export function linkWhatsApp(mensagem?: string, numero: string = MARCA.whatsapp.e164): string {
  const base = `https://wa.me/${paraE164(numero)}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

/** Link de compartilhamento: abre o WhatsApp para a pessoa escolher o contato. */
export function linkCompartilharWhatsApp(mensagem: string): string {
  return `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
}

export const MENSAGENS_VENDA = {
  geral: `Olá! Conheci o ${MARCA.nome} pelo site e quero contratar o sistema para o meu escritório.`,
  demonstracao: `Olá! Quero agendar uma demonstração do ${MARCA.nome} para o meu escritório.`,
  plano: (nome: string) => `Olá! Quero contratar o plano ${nome} do ${MARCA.nome} para o meu escritório.`,
} as const;

/** "Olá, Maria!" para pessoa física; "Olá!" para empresa ou contato sem cadastro. */
export function saudacao(cliente?: { nome: string; tipo: "PF" | "PJ" }): string {
  if (!cliente || cliente.tipo === "PJ") return "Olá!";
  return `Olá, ${cliente.nome.trim().split(/\s+/)[0]}!`;
}
