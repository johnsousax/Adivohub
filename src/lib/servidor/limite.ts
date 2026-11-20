import "server-only";

/**
 * Limite de requisições em memória, por chave (IP + rota).
 * Em ambiente serverless cada instância tem a sua memória, então isto é uma
 * proteção de "melhor esforço" contra abuso — suficiente enquanto não há
 * banco/Redis. Com o banco conectado, troque por um contador persistente.
 */

interface Janela {
  usos: number;
  reiniciaEm: number;
}

const janelas = new Map<string, Janela>();
const MAXIMO_DE_CHAVES = 5000;

export interface ResultadoLimite {
  permitido: boolean;
  /** Segundos até poder tentar de novo (0 quando permitido). */
  aguardar: number;
}

export function consumirLimite(chave: string, maximo: number, janelaMs: number): ResultadoLimite {
  const agora = Date.now();
  const atual = janelas.get(chave);

  if (!atual || atual.reiniciaEm <= agora) {
    if (janelas.size >= MAXIMO_DE_CHAVES) {
      for (const [k, janela] of janelas) if (janela.reiniciaEm <= agora) janelas.delete(k);
      if (janelas.size >= MAXIMO_DE_CHAVES) janelas.clear();
    }
    janelas.set(chave, { usos: 1, reiniciaEm: agora + janelaMs });
    return { permitido: true, aguardar: 0 };
  }

  if (atual.usos >= maximo) {
    return { permitido: false, aguardar: Math.ceil((atual.reiniciaEm - agora) / 1000) };
  }
  atual.usos += 1;
  return { permitido: true, aguardar: 0 };
}

export function ipDaRequisicao(requisicao: Request): string {
  const encaminhado = requisicao.headers.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();
  return requisicao.headers.get("x-real-ip") ?? "desconhecido";
}
