import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

/**
 * Proteção de dados sensíveis guardados no banco (CPF e CNPJ de clientes).
 * Só roda no servidor. Sem dependência do Next, para poder ser testado isoladamente.
 *
 * - O dado é cifrado com AES-256-GCM: quem copia o banco não lê nada sem a chave.
 * - Para achar um cliente pelo documento sem decifrar, guarda-se junto um "índice cego"
 *   (HMAC-SHA256 do número), feito com outra chave.
 * - As chaves ficam em variáveis de ambiente, nunca no banco nem no Git.
 *
 * Ainda não é usado: entra em cena quando o banco for conectado
 * (database/schema.sql, funções salvar_documento_do_cliente e revelar_documento_do_cliente).
 */

/** Versão do formato. Ao trocar a chave, a nova versão convive com a antiga até tudo ser recifrado. */
const VERSAO = "v1";
const BYTES_DO_IV = 12;
const BYTES_DA_ETIQUETA = 16;

type NomeDeChave = "CHAVE_DE_DADOS" | "CHAVE_DE_INDICE";

/** Chave de 32 bytes em base64 (openssl rand -base64 32). Sem chave válida, nada é cifrado. */
function chave(nome: NomeDeChave): Buffer {
  const bytes = Buffer.from(process.env[nome] ?? "", "base64");
  if (bytes.length !== 32) {
    throw new Error(`${nome} ausente ou inválida. Gere com: openssl rand -base64 32`);
  }
  return bytes;
}

/**
 * Cifra um texto. O resultado tem o formato "v1:<iv>:<etiqueta>:<texto cifrado>".
 * `contexto` amarra o dado ao lugar dele (ex.: "cliente:<id>"): copiado para outro
 * registro, ele não decifra.
 */
export function cifrar(texto: string, contexto = ""): string {
  const iv = randomBytes(BYTES_DO_IV);
  const cifra = createCipheriv("aes-256-gcm", chave("CHAVE_DE_DADOS"), iv, { authTagLength: BYTES_DA_ETIQUETA });
  cifra.setAAD(Buffer.from(contexto, "utf8"));
  const corpo = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return [VERSAO, iv.toString("base64url"), cifra.getAuthTag().toString("base64url"), corpo.toString("base64url")].join(":");
}

/** Decifra o que `cifrar` produziu. Lança erro se o dado foi adulterado, trocado de lugar ou é de outra chave. */
export function decifrar(pacote: string, contexto = ""): string {
  const [versao, ivTexto, etiquetaTexto, corpoTexto, ...sobra] = pacote.split(":");
  const iv = Buffer.from(ivTexto ?? "", "base64url");
  const etiqueta = Buffer.from(etiquetaTexto ?? "", "base64url");
  if (versao !== VERSAO || sobra.length > 0 || iv.length !== BYTES_DO_IV || etiqueta.length !== BYTES_DA_ETIQUETA || !corpoTexto) {
    throw new Error("Dado cifrado em formato desconhecido");
  }
  const decifra = createDecipheriv("aes-256-gcm", chave("CHAVE_DE_DADOS"), iv, { authTagLength: BYTES_DA_ETIQUETA });
  decifra.setAAD(Buffer.from(contexto, "utf8"));
  decifra.setAuthTag(etiqueta);
  return Buffer.concat([decifra.update(Buffer.from(corpoTexto, "base64url")), decifra.final()]).toString("utf8");
}

/** CPF e CNPJ sem pontuação e em maiúsculas (o CNPJ pode ter letras). */
export function normalizarDocumento(documento: string): string {
  return documento.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function documentoValido(limpo: string): boolean {
  return /^\d{11}$/.test(limpo) || /^[0-9A-Z]{12}\d{2}$/.test(limpo);
}

/**
 * Índice cego: o mesmo documento gera sempre o mesmo código, com ou sem pontuação,
 * e o código não revela o número. Serve para buscar e para evitar cadastro em dobro.
 */
export function indiceCego(documento: string): string {
  const limpo = normalizarDocumento(documento);
  if (!documentoValido(limpo)) throw new Error("Documento com formato inválido");
  return createHmac("sha256", chave("CHAVE_DE_INDICE")).update(limpo, "utf8").digest("hex");
}

/** Versão para a tela: ***.456.789-** (CPF) ou **.345.678/****-** (CNPJ). */
export function mascararDocumento(documento: string): string {
  const limpo = normalizarDocumento(documento);
  if (!documentoValido(limpo)) throw new Error("Documento com formato inválido");
  if (limpo.length === 11) return `***.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-**`;
  return `**.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/****-**`;
}
