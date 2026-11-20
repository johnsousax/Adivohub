/**
 * Sessão em cookie assinado (HMAC-SHA256), sem banco.
 * Usa só Web Crypto, então funciona tanto no proxy quanto nos Route Handlers.
 *
 * É uma solução provisória para a fase de demonstração. Quando o banco entrar,
 * este arquivo é o único ponto a trocar por um provedor de autenticação
 * (Supabase Auth), que traz verificação em duas etapas, troca de senha e
 * revogação de sessão. Até lá: trocar AUTH_SECRET derruba todas as sessões.
 */

/**
 * Em produção o cookie usa o prefixo "__Host-": o navegador só o aceita com
 * Secure, Path=/ e sem Domain, então um subdomínio não consegue forjar a sessão.
 */
export const COOKIE_SESSAO = process.env.NODE_ENV === "production" ? "__Host-justixup_sessao" : "justixup_sessao";
export const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 8;

/** "demo": visitante da demonstração pública. "equipe": acesso privado, com senha. */
export type PapelSessao = "demo" | "equipe";

export interface Sessao {
  /** Identificador da sessão, para os registros de segurança. */
  jti: string;
  sub: string;
  nome: string;
  email: string;
  papel: PapelSessao;
  /** Emissão e expiração, em segundos desde 1970 (UTC). */
  iat: number;
  exp: number;
}

const codificador = new TextEncoder();

function segredo(): string | null {
  const valor = process.env.AUTH_SECRET;
  if (valor && valor.length >= 32) return valor;
  // Em produção, sem segredo forte não há sessão: melhor negar do que assinar com valor fraco.
  if (process.env.NODE_ENV === "production") return null;
  return "segredo-somente-para-desenvolvimento-local";
}

export function sessaoDisponivel(): boolean {
  return segredo() !== null;
}

function paraBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array<ArrayBuffer> {
  const base64 = texto.replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function chaveHmac(valor: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", codificador.encode(valor), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function assinarSessao(dados: Pick<Sessao, "sub" | "nome" | "email" | "papel">): Promise<string | null> {
  const valor = segredo();
  if (!valor) return null;
  const agora = Math.floor(Date.now() / 1000);
  const sessao: Sessao = { ...dados, jti: crypto.randomUUID(), iat: agora, exp: agora + DURACAO_SESSAO_SEGUNDOS };
  const corpo = paraBase64Url(codificador.encode(JSON.stringify(sessao)));
  const assinatura = await crypto.subtle.sign("HMAC", await chaveHmac(valor), codificador.encode(corpo));
  return `${corpo}.${paraBase64Url(new Uint8Array(assinatura))}`;
}

function ehTexto(valor: unknown, maximo: number): valor is string {
  return typeof valor === "string" && valor.length > 0 && valor.length <= maximo;
}

/** Devolve a sessão só se a assinatura confere, não expirou e todos os campos são válidos. Qualquer dúvida = sem sessão. */
export async function lerSessao(token: string | undefined | null): Promise<Sessao | null> {
  const valor = segredo();
  if (!valor || !token || token.length > 2048) return null;
  const [corpo, assinatura, ...resto] = token.split(".");
  if (!corpo || !assinatura || resto.length > 0) return null;
  try {
    const valida = await crypto.subtle.verify("HMAC", await chaveHmac(valor), deBase64Url(assinatura), codificador.encode(corpo));
    if (!valida) return null;
    const sessao = JSON.parse(new TextDecoder().decode(deBase64Url(corpo))) as Partial<Sessao>;
    const agora = Math.floor(Date.now() / 1000);
    if (typeof sessao.exp !== "number" || sessao.exp < agora) return null;
    // Tolerância de um minuto para relógios dessincronizados; emissão no futuro ou duração maior que a permitida é inválida.
    if (typeof sessao.iat !== "number" || sessao.iat > agora + 60 || sessao.exp - sessao.iat > DURACAO_SESSAO_SEGUNDOS) return null;
    if (!ehTexto(sessao.jti, 64) || !ehTexto(sessao.sub, 64) || !ehTexto(sessao.nome, 120) || !ehTexto(sessao.email, 200)) return null;
    if (sessao.papel !== "demo" && sessao.papel !== "equipe") return null;
    return sessao as Sessao;
  } catch {
    return null;
  }
}

function atributosDoCookie(maxAge: number): string {
  return ["Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`, process.env.NODE_ENV === "production" ? "Secure" : ""]
    .filter(Boolean)
    .join("; ");
}

/** Cabeçalho Set-Cookie que grava a sessão. */
export function cookieDeSessao(token: string): string {
  return `${COOKIE_SESSAO}=${token}; ${atributosDoCookie(DURACAO_SESSAO_SEGUNDOS)}`;
}

/** Cabeçalho Set-Cookie que apaga a sessão. */
export function cookieDeSaida(): string {
  return `${COOKIE_SESSAO}=; ${atributosDoCookie(0)}`;
}
