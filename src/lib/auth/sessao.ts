/**
 * Sessão em cookie assinado (HMAC-SHA256), sem banco.
 * Usa só Web Crypto, então funciona tanto no proxy quanto nos Route Handlers.
 * Quando o banco entrar, este arquivo é o único ponto a trocar por um
 * provedor de autenticação (ex.: Supabase Auth).
 */

export const COOKIE_SESSAO = "vade_sessao";
export const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 12;

export interface Sessao {
  sub: string;
  nome: string;
  email: string;
  /** Expiração em segundos desde 1970 (UTC). */
  exp: number;
}

const codificador = new TextEncoder();

function segredo(): string | null {
  const valor = process.env.AUTH_SECRET;
  if (valor && valor.length >= 16) return valor;
  // Em produção, sem segredo não há sessão: melhor negar do que assinar com valor público.
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

export async function assinarSessao(dados: Omit<Sessao, "exp">): Promise<string | null> {
  const valor = segredo();
  if (!valor) return null;
  const sessao: Sessao = { ...dados, exp: Math.floor(Date.now() / 1000) + DURACAO_SESSAO_SEGUNDOS };
  const corpo = paraBase64Url(codificador.encode(JSON.stringify(sessao)));
  const assinatura = await crypto.subtle.sign("HMAC", await chaveHmac(valor), codificador.encode(corpo));
  return `${corpo}.${paraBase64Url(new Uint8Array(assinatura))}`;
}

export async function lerSessao(token: string | undefined | null): Promise<Sessao | null> {
  const valor = segredo();
  if (!valor || !token) return null;
  const [corpo, assinatura, ...resto] = token.split(".");
  if (!corpo || !assinatura || resto.length > 0) return null;
  try {
    const valida = await crypto.subtle.verify("HMAC", await chaveHmac(valor), deBase64Url(assinatura), codificador.encode(corpo));
    if (!valida) return null;
    const sessao = JSON.parse(new TextDecoder().decode(deBase64Url(corpo))) as Sessao;
    if (typeof sessao.exp !== "number" || sessao.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof sessao.sub !== "string" || typeof sessao.nome !== "string" || typeof sessao.email !== "string") return null;
    return sessao;
  } catch {
    return null;
  }
}
