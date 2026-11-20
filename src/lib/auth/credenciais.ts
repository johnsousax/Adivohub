import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Acesso de demonstração. Enquanto não há banco de usuários, existe uma única
 * conta, definida por variáveis de ambiente (ver .env.example).
 */
export function credenciaisDemo() {
  return {
    // ".example" é um domínio reservado: o endereço serve só como identificação de login.
    email: (process.env.DEMO_EMAIL || "demo@vade.example").toLowerCase(),
    senha: process.env.DEMO_SENHA || "vade2026",
    /** Se a tela de login pode mostrar e preencher o acesso de demonstração. */
    publica: process.env.DEMO_PUBLICA !== "false",
  };
}

export const USUARIO_DEMO = { sub: "usr-ana", nome: "Dra. Ana Almeida" } as const;

function iguais(a: string, b: string): boolean {
  // Compara os hashes para não vazar o tamanho nem o conteúdo pelo tempo de resposta.
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export function conferirCredenciais(email: string, senha: string): boolean {
  const demo = credenciaisDemo();
  const emailConfere = iguais(email.trim().toLowerCase(), demo.email);
  const senhaConfere = iguais(senha, demo.senha);
  return emailConfere && senhaConfere;
}
