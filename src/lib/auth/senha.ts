import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Hash de senha com scrypt (nativo do Node, recomendado pela OWASP).
 * A senha nunca fica guardada: só o hash, no formato
 *   scrypt:<log2 N>:<r>:<p>:<sal em base64>:<hash em base64>
 * O separador é ":" porque arquivos .env tratam o cifrão como referência a outra variável.
 *
 * Só existe enquanto o acesso privado é uma conta única definida por variável
 * de ambiente. Com o provedor de autenticação, este arquivo deixa de ser usado.
 */

export const TAMANHO_MINIMO_DA_SENHA = 12;

const PARAMETROS = { logN: 15, r: 8, p: 3 } as const;
const BYTES_DO_HASH = 64;
const MEMORIA_MAXIMA = 96 * 1024 * 1024;

function derivar(senha: string, sal: Buffer, logN: number, r: number, p: number, tamanho: number): Promise<Buffer> {
  return new Promise((resolver, rejeitar) => {
    scrypt(senha.normalize("NFKC"), sal, tamanho, { N: 2 ** logN, r, p, maxmem: MEMORIA_MAXIMA }, (falha, chave) =>
      falha ? rejeitar(falha) : resolver(chave),
    );
  });
}

export async function gerarHashDeSenha(senha: string): Promise<string> {
  if (senha.length < TAMANHO_MINIMO_DA_SENHA) throw new Error(`A senha precisa ter pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`);
  const sal = randomBytes(16);
  const { logN, r, p } = PARAMETROS;
  const hash = await derivar(senha, sal, logN, r, p, BYTES_DO_HASH);
  return ["scrypt", logN, r, p, sal.toString("base64"), hash.toString("base64")].join(":");
}

interface HashLido {
  logN: number;
  r: number;
  p: number;
  sal: Buffer;
  hash: Buffer;
}

function lerHash(guardado: string): HashLido | null {
  const partes = guardado.split(":");
  if (partes.length !== 6 || partes[0] !== "scrypt") return null;
  const [logN, r, p] = partes.slice(1, 4).map(Number);
  // Faixas fixas: um hash adulterado não pode pedir um custo absurdo (negação de serviço) nem um custo fraco.
  if (!Number.isInteger(logN) || logN < 14 || logN > 17) return null;
  if (!Number.isInteger(r) || r !== 8) return null;
  if (!Number.isInteger(p) || p < 1 || p > 4) return null;
  const sal = Buffer.from(partes[4], "base64");
  const hash = Buffer.from(partes[5], "base64");
  if (sal.length < 16 || hash.length < 32 || hash.length > 128) return null;
  return { logN, r, p, sal, hash };
}

export function hashDeSenhaValido(guardado: string | undefined | null): guardado is string {
  return Boolean(guardado && lerHash(guardado));
}

/** Hash de referência, usado quando não há conta: a resposta leva o mesmo tempo, exista ou não o acesso. */
const HASH_DE_REFERENCIA = [
  "scrypt",
  PARAMETROS.logN,
  PARAMETROS.r,
  PARAMETROS.p,
  Buffer.alloc(16, 7).toString("base64"),
  Buffer.alloc(BYTES_DO_HASH, 9).toString("base64"),
].join(":");

/**
 * Confere a senha em tempo constante. Com hash ausente ou inválido, faz o mesmo
 * trabalho e devolve falso: quem mede o tempo não descobre se a conta existe.
 */
export async function conferirSenha(senha: string, guardado: string | undefined | null): Promise<boolean> {
  const lido = guardado ? lerHash(guardado) : null;
  const alvo = lido ?? lerHash(HASH_DE_REFERENCIA)!;
  try {
    const calculado = await derivar(senha, alvo.sal, alvo.logN, alvo.r, alvo.p, alvo.hash.length);
    const confere = timingSafeEqual(calculado, alvo.hash);
    return Boolean(lido) && confere;
  } catch {
    return false;
  }
}
