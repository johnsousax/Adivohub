import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const moedaSemCentavos = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const numero = new Intl.NumberFormat("pt-BR");

export function brl(valor: number, opcoes: { centavos?: boolean } = {}): string {
  return (opcoes.centavos === false ? moedaSemCentavos : moeda).format(valor);
}

/** R$ 184 mil, R$ 1,2 mi — para números de destaque. */
export function brlCompacto(valor: number): string {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) {
    return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  if (abs >= 10_000) {
    return `R$ ${Math.round(valor / 1000).toLocaleString("pt-BR")} mil`;
  }
  return moedaSemCentavos.format(valor);
}

export function inteiro(valor: number): string {
  return numero.format(valor);
}

export function percentual(fracao: number, casas = 1): string {
  return `${(fracao * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

function paraData(valor: string | Date): Date {
  return typeof valor === "string" ? parseISO(valor) : valor;
}

/** 20/11/2026 */
export function dataCurta(valor: string | Date): string {
  return format(paraData(valor), "dd/MM/yyyy");
}

/** 20 nov */
export function dataDiaMes(valor: string | Date): string {
  return format(paraData(valor), "d MMM", { locale: ptBR }).replace(".", "");
}

/** sexta-feira, 20 de novembro */
export function dataLonga(valor: string | Date): string {
  return format(paraData(valor), "EEEE, d 'de' MMMM", { locale: ptBR });
}

/** sex, 20/11 */
export function dataSemana(valor: string | Date): string {
  return format(paraData(valor), "EEEEEE, dd/MM", { locale: ptBR }).replace("sab", "sáb");
}

/** 12,5 mil — para eixos de gráfico. */
export function milhares(valor: number): string {
  if (valor === 0) return "0";
  if (Math.abs(valor) < 1000) return inteiro(valor);
  return `${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
}

export function hora(valor: string | Date): string {
  return format(paraData(valor), "HH:mm");
}

export function mesAno(valor: string | Date): string {
  return format(paraData(valor), "MMMM 'de' yyyy", { locale: ptBR });
}

export function mesCurto(valor: string | Date): string {
  return format(paraData(valor), "MMM", { locale: ptBR }).replace(".", "");
}

/** "hoje", "amanhã", "em 3 dias", "há 2 dias" em relação a uma data de referência. */
export function relativo(valor: string | Date, hoje: Date): string {
  const dias = differenceInCalendarDays(paraData(valor), hoje);
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  if (dias > 1) return `em ${dias} dias`;
  return `há ${Math.abs(dias)} dias`;
}

export function iniciais(nome: string): string {
  const partes = nome
    .replace(/^(dra?\.|sr\.|sra\.)\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter((p) => !/^(da|de|do|das|dos|e|&)$/i.test(p));
  if (partes.length === 0) return "?";
  const primeira = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/** (98) 97005-0096 */
export function telefone(valor: string): string {
  let d = valor.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor;
}

export function plural(qtd: number, singular: string, pluralForma: string): string {
  return `${inteiro(qtd)} ${qtd === 1 ? singular : pluralForma}`;
}
