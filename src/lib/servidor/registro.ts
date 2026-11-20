import "server-only";

/**
 * Registro de eventos de segurança, em JSON, uma linha por evento.
 * Vai para os logs do servidor (na Vercel, a aba Logs do projeto).
 *
 * Regra: nunca registrar senha, token, cookie, corpo de requisição nem texto
 * de conversa. E-mail entra mascarado.
 */

type Nivel = "info" | "aviso" | "erro";
type Valor = string | number | boolean | null | undefined;

export type EventoDeSeguranca =
  | "login.ok"
  | "login.falha"
  | "login.bloqueado"
  | "login.robo"
  | "login.indisponivel"
  | "demo.inicio"
  | "demo.desligada"
  | "logout"
  | "sessao.negada"
  | "origem.recusada"
  | "limite.excedido"
  | "pedido.invalido"
  | "ia.cota_esgotada"
  | "ia.falha"
  | "webhook.assinatura_invalida"
  | "webhook.recebido"
  | "webhook.repetido";

export function registrar(evento: EventoDeSeguranca, dados: Record<string, Valor> = {}, nivel: Nivel = "info"): void {
  const linha = JSON.stringify({ t: new Date().toISOString(), nivel, evento, ...dados });
  if (nivel === "erro") console.error(linha);
  else if (nivel === "aviso") console.warn(linha);
  else console.log(linha);
}

/** "ana.almeida@escritorio.com.br" → "a***@escritorio.com.br". */
export function mascararEmail(email: string): string {
  const [usuario, dominio] = email.split("@");
  if (!usuario || !dominio) return "***";
  return `${usuario[0]}***@${dominio.slice(0, 60)}`;
}
