import "server-only";

/**
 * Limites de uso em memória: janela por chave, espera crescente após falhas e
 * cota diária.
 *
 * Em ambiente serverless cada instância tem a sua memória, então esta é a
 * segunda camada. A primeira é o limite de requisições na borda (Firewall da
 * Vercel), que vale para todas as instâncias. Com o banco ou um Redis
 * conectado, troque estes contadores por um armazenamento compartilhado.
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

function abrirEspaco<T extends { reiniciaEm: number }>(mapa: Map<string, T>, agora: number) {
  if (mapa.size < MAXIMO_DE_CHAVES) return;
  for (const [chave, item] of mapa) if (item.reiniciaEm <= agora) mapa.delete(chave);
  // Ainda cheio: sob ataque com muitas chaves, é melhor recomeçar do que crescer sem fim.
  if (mapa.size >= MAXIMO_DE_CHAVES) mapa.clear();
}

export function consumirLimite(chave: string, maximo: number, janelaMs: number): ResultadoLimite {
  const agora = Date.now();
  const atual = janelas.get(chave);

  if (!atual || atual.reiniciaEm <= agora) {
    abrirEspaco(janelas, agora);
    janelas.set(chave, { usos: 1, reiniciaEm: agora + janelaMs });
    return { permitido: true, aguardar: 0 };
  }

  if (atual.usos >= maximo) {
    return { permitido: false, aguardar: Math.ceil((atual.reiniciaEm - agora) / 1000) };
  }
  atual.usos += 1;
  return { permitido: true, aguardar: 0 };
}

/** Cota por dia (janela de 24 horas a partir do primeiro uso). Devolve falso quando a cota acabou. */
export function consumirCota(chave: string, maximoPorDia: number): boolean {
  return consumirLimite(`cota:${chave}`, maximoPorDia, 24 * 60 * 60_000).permitido;
}

/* --------------------------- Espera crescente após falhas --------------------------- */

interface Falhas {
  quantidade: number;
  bloqueadoAte: number;
  /** Quando o histórico de falhas é esquecido. */
  reiniciaEm: number;
}

const falhas = new Map<string, Falhas>();

export const FALHAS_SEM_ESPERA = 5;
const ESPERA_INICIAL_MS = 30_000;
const ESPERA_MAXIMA_MS = 15 * 60_000;
const MEMORIA_DE_FALHAS_MS = 60 * 60_000;

/** Segundos que a chave ainda precisa esperar por causa de falhas anteriores (0 = liberada). */
export function esperaPorFalhas(chave: string, agora = Date.now()): number {
  const atual = falhas.get(chave);
  if (!atual) return 0;
  if (atual.reiniciaEm <= agora) {
    falhas.delete(chave);
    return 0;
  }
  return atual.bloqueadoAte > agora ? Math.ceil((atual.bloqueadoAte - agora) / 1000) : 0;
}

/**
 * Registra uma falha (senha errada, por exemplo). A partir da 5ª, cada nova
 * falha dobra a espera: 30 s, 1 min, 2 min... até 15 minutos.
 * Devolve a espera aplicada, em segundos.
 */
export function registrarFalha(chave: string, agora = Date.now()): number {
  let atual = falhas.get(chave);
  if (!atual || atual.reiniciaEm <= agora) {
    abrirEspaco(falhas, agora);
    atual = { quantidade: 0, bloqueadoAte: 0, reiniciaEm: 0 };
    falhas.set(chave, atual);
  }
  atual.quantidade += 1;
  atual.reiniciaEm = agora + MEMORIA_DE_FALHAS_MS;
  if (atual.quantidade < FALHAS_SEM_ESPERA) return 0;
  const espera = Math.min(ESPERA_INICIAL_MS * 2 ** (atual.quantidade - FALHAS_SEM_ESPERA), ESPERA_MAXIMA_MS);
  atual.bloqueadoAte = agora + espera;
  return Math.ceil(espera / 1000);
}

export function limparFalhas(chave: string): void {
  falhas.delete(chave);
}

/* ------------------------------------ Quem pede ------------------------------------ */

/**
 * IP de quem fez a requisição. Na Vercel, x-real-ip e x-forwarded-for são
 * escritos pela plataforma (o visitante não consegue forjar). Endereços IPv6
 * são agrupados pelo prefixo /64, que é o que um mesmo assinante controla.
 */
export function ipDaRequisicao(requisicao: Request): string {
  const bruto =
    requisicao.headers.get("x-real-ip")?.trim() || requisicao.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
  if (bruto.includes(":") && !bruto.includes(".")) {
    return `${bruto.split(":").slice(0, 4).join(":")}::/64`;
  }
  return bruto.slice(0, 64);
}

/** Só para testes: zera todos os contadores. */
export function zerarLimites(): void {
  janelas.clear();
  falhas.clear();
}
