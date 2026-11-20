import { addDays, format, isWeekend, parseISO } from "date-fns";

/**
 * Contagem de prazos em dias úteis (CPC, art. 219).
 *
 * É uma ESTIMATIVA: considera fins de semana, feriados nacionais, Carnaval,
 * Sexta-feira Santa, Corpus Christi e o recesso forense de 20/12 a 20/01
 * (CPC, art. 220). Feriados locais e suspensões de expediente de cada tribunal
 * não entram na conta — por isso todo prazo sugerido precisa da confirmação
 * do advogado antes de valer.
 */

export function paraISO(data: Date): string {
  return format(data, "yyyy-MM-dd");
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

const FERIADOS_FIXOS: Array<[mes: number, dia: number, nome: string]> = [
  [1, 1, "Confraternização Universal"],
  [4, 21, "Tiradentes"],
  [5, 1, "Dia do Trabalho"],
  [9, 7, "Independência"],
  [10, 12, "Nossa Senhora Aparecida"],
  [11, 2, "Finados"],
  [11, 15, "Proclamação da República"],
  [11, 20, "Consciência Negra"],
  [12, 25, "Natal"],
];

const cacheFeriados = new Map<number, Map<string, string>>();

/** Feriados nacionais e pontos facultativos forenses do ano: ISO → nome. */
export function feriados(ano: number): Map<string, string> {
  const emCache = cacheFeriados.get(ano);
  if (emCache) return emCache;

  const mapa = new Map<string, string>();
  for (const [mes, dia, nome] of FERIADOS_FIXOS) {
    mapa.set(paraISO(new Date(ano, mes - 1, dia)), nome);
  }
  const domingoDePascoa = pascoa(ano);
  mapa.set(paraISO(addDays(domingoDePascoa, -48)), "Carnaval");
  mapa.set(paraISO(addDays(domingoDePascoa, -47)), "Carnaval");
  mapa.set(paraISO(addDays(domingoDePascoa, -2)), "Sexta-feira Santa");
  mapa.set(paraISO(addDays(domingoDePascoa, 60)), "Corpus Christi");

  cacheFeriados.set(ano, mapa);
  return mapa;
}

/** Recesso forense: 20 de dezembro a 20 de janeiro, inclusive. */
export function emRecessoForense(data: Date): boolean {
  const mes = data.getMonth() + 1;
  const dia = data.getDate();
  return (mes === 12 && dia >= 20) || (mes === 1 && dia <= 20);
}

export function ehDiaUtil(data: Date, opcoes: { recesso?: boolean } = {}): boolean {
  if (isWeekend(data)) return false;
  if (feriados(data.getFullYear()).has(paraISO(data))) return false;
  if (opcoes.recesso && emRecessoForense(data)) return false;
  return true;
}

function normalizar(data: Date | string): Date {
  const base = typeof data === "string" ? parseISO(data) : data;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate());
}

/**
 * Soma dias úteis a partir de uma data, sem contar o dia inicial.
 * Com `quantidade` negativa, volta no calendário (usado na data interna, D-2).
 */
export function somarDiasUteis(inicio: Date | string, quantidade: number, opcoes: { recesso?: boolean } = {}): Date {
  let atual = normalizar(inicio);
  const passo = quantidade >= 0 ? 1 : -1;
  let restantes = Math.abs(quantidade);
  while (restantes > 0) {
    atual = addDays(atual, passo);
    if (ehDiaUtil(atual, opcoes)) restantes -= 1;
  }
  return atual;
}

/** Primeiro dia útil igual ou posterior à data informada. */
export function proximoDiaUtil(data: Date | string, opcoes: { recesso?: boolean } = {}): Date {
  let atual = normalizar(data);
  while (!ehDiaUtil(atual, opcoes)) atual = addDays(atual, 1);
  return atual;
}

/**
 * Sugere a data fatal e a data interna de um prazo processual em dias úteis.
 * A contagem começa no primeiro dia útil seguinte à intimação e considera o recesso.
 */
export function sugerirPrazo(dataIntimacao: Date | string, diasUteis: number, folgaInterna = 2) {
  const fatal = somarDiasUteis(dataIntimacao, diasUteis, { recesso: true });
  const interna = somarDiasUteis(fatal, -folgaInterna, { recesso: true });
  return { dataFatal: paraISO(fatal), dataInterna: paraISO(interna) };
}
