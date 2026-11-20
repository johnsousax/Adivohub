import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { conferirSenha, hashDeSenhaValido } from "./senha";

/**
 * Quem pode entrar enquanto não há banco de usuários:
 *
 * 1. Demonstração pública: qualquer visitante, sem senha (o botão "Abrir a
 *    demonstração"). Só vê dados fictícios, guardados no próprio navegador, e
 *    nunca usa a IA paga. Desliga com DEMO_PUBLICA=false.
 * 2. Acesso privado: uma conta, com e-mail em ACESSO_EMAIL e o HASH da senha em
 *    ACESSO_SENHA_HASH (gere com `npm run senha`). Não existe senha padrão: sem
 *    as duas variáveis, o login por senha simplesmente não aceita ninguém.
 */

/** Visitante da demonstração. O e-mail usa domínio reservado e serve só de identificação. */
export const USUARIO_DEMO = { sub: "usr-gabriel", nome: "Dr. Gabriel Ogando", email: "demo@justixup.example" } as const;

export function demoPublica(): boolean {
  return process.env.DEMO_PUBLICA !== "false";
}

export function acessoPrivadoConfigurado(): boolean {
  return Boolean(process.env.ACESSO_EMAIL?.includes("@")) && hashDeSenhaValido(process.env.ACESSO_SENHA_HASH);
}

function textosIguais(a: string, b: string): boolean {
  // Compara os hashes para não vazar o tamanho nem o conteúdo pelo tempo de resposta.
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

/** Normaliza o e-mail para comparar e para usar como chave de limite de tentativas. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Confere e-mail e senha do acesso privado. Sempre calcula o hash da senha,
 * mesmo com e-mail errado ou acesso não configurado, para o tempo de resposta
 * não revelar nada.
 */
export async function conferirAcessoPrivado(email: string, senha: string): Promise<{ nome: string; email: string } | null> {
  const configurado = acessoPrivadoConfigurado();
  const emailEsperado = normalizarEmail(process.env.ACESSO_EMAIL ?? "");
  const senhaConfere = await conferirSenha(senha, configurado ? process.env.ACESSO_SENHA_HASH : null);
  const emailConfere = textosIguais(normalizarEmail(email), emailEsperado);
  if (!configurado || !senhaConfere || !emailConfere) return null;
  return { nome: process.env.ACESSO_NOME?.trim().slice(0, 80) || USUARIO_DEMO.nome, email: emailEsperado };
}
