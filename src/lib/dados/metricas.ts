import { addDays, addMonths, differenceInCalendarDays, isSameDay, parseISO, startOfMonth } from "date-fns";
import { paraISO } from "../datas";
import type { Andamento, AreaDireito, Caso, Cliente, DadosEscritorio, EtapaFunil, Evento, Lancamento, Prazo } from "../tipos";
import { ORDEM_FUNIL } from "../tipos";

/* -------------------------------------------------------------------------- */
/* Financeiro                                                                 */
/* -------------------------------------------------------------------------- */

export type SituacaoLancamento = "pago" | "atrasado" | "pendente";

export function situacao(lancamento: Lancamento, hoje: Date): SituacaoLancamento {
  if (lancamento.pagoEm) return "pago";
  return lancamento.vencimento < paraISO(hoje) ? "atrasado" : "pendente";
}

export function diasDeAtraso(lancamento: Lancamento, hoje: Date): number {
  return Math.max(0, differenceInCalendarDays(hoje, parseISO(lancamento.vencimento)));
}

function somar(lancamentos: Lancamento[]): number {
  return lancamentos.reduce((total, l) => total + l.valor, 0);
}

function chaveMes(dataISO: string): string {
  return dataISO.slice(0, 7);
}

export interface ResumoFinanceiro {
  recebidoMes: number;
  recebidoMesAnterior: number;
  /** Recebido no mês anterior até o mesmo dia do mês (comparação justa com o mês em curso). */
  recebidoMesAnteriorAteODia: number;
  /** Variação contra o mesmo período do mês anterior (fração), ou null se não há base. */
  variacaoRecebido: number | null;
  aReceber30Dias: number;
  parcelasAReceber30Dias: number;
  emAtraso: number;
  parcelasEmAtraso: number;
  /** Em atraso ÷ tudo o que venceu nos últimos 90 dias. */
  inadimplencia: number;
  despesasMes: number;
  resultadoMes: number;
}

export function resumoFinanceiro(lancamentos: Lancamento[], hoje: Date): ResumoFinanceiro {
  const hojeISO = paraISO(hoje);
  const mesAtual = chaveMes(hojeISO);
  const mesAnterior = chaveMes(paraISO(addMonths(startOfMonth(hoje), -1)));
  const em30Dias = paraISO(addDays(hoje, 30));
  const ha90Dias = paraISO(addDays(hoje, -90));

  const receitas = lancamentos.filter((l) => l.tipo === "receita");
  const despesas = lancamentos.filter((l) => l.tipo === "despesa");

  const recebidoMes = somar(receitas.filter((l) => l.pagoEm && chaveMes(l.pagoEm) === mesAtual));
  const recebidosMesAnterior = receitas.filter((l) => l.pagoEm && chaveMes(l.pagoEm) === mesAnterior);
  const recebidoMesAnterior = somar(recebidosMesAnterior);
  const diaDoMes = hojeISO.slice(8, 10);
  const recebidoMesAnteriorAteODia = somar(recebidosMesAnterior.filter((l) => l.pagoEm!.slice(8, 10) <= diaDoMes));

  const aReceber = receitas.filter((l) => !l.pagoEm && l.vencimento >= hojeISO && l.vencimento <= em30Dias);
  const atrasadas = receitas.filter((l) => !l.pagoEm && l.vencimento < hojeISO);

  const vencidas90 = receitas.filter((l) => l.vencimento >= ha90Dias && l.vencimento < hojeISO);
  const totalVencido90 = somar(vencidas90);
  const atrasado90 = somar(vencidas90.filter((l) => !l.pagoEm));

  // Despesas do mês pelo vencimento (competência), pagas ou não.
  const despesasMes = somar(despesas.filter((l) => chaveMes(l.vencimento) === mesAtual));

  return {
    recebidoMes,
    recebidoMesAnterior,
    recebidoMesAnteriorAteODia,
    variacaoRecebido: recebidoMesAnteriorAteODia > 0 ? recebidoMes / recebidoMesAnteriorAteODia - 1 : null,
    aReceber30Dias: somar(aReceber),
    parcelasAReceber30Dias: aReceber.length,
    emAtraso: somar(atrasadas),
    parcelasEmAtraso: atrasadas.length,
    inadimplencia: totalVencido90 > 0 ? atrasado90 / totalVencido90 : 0,
    despesasMes,
    resultadoMes: recebidoMes - despesasMes,
  };
}

export interface PontoMensal {
  /** Primeiro dia do mês (AAAA-MM-DD). */
  mes: string;
  recebido: number;
  despesas: number;
}

/** Recebido e despesas dos últimos `meses` meses, do mais antigo ao atual. */
export function serieMensal(lancamentos: Lancamento[], hoje: Date, meses = 6): PontoMensal[] {
  const pontos: PontoMensal[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const inicio = addMonths(startOfMonth(hoje), -i);
    const chave = chaveMes(paraISO(inicio));
    pontos.push({
      mes: paraISO(inicio),
      recebido: somar(lancamentos.filter((l) => l.tipo === "receita" && l.pagoEm && chaveMes(l.pagoEm) === chave)),
      despesas: somar(lancamentos.filter((l) => l.tipo === "despesa" && chaveMes(l.vencimento) === chave)),
    });
  }
  return pontos;
}

export interface FatiaArea {
  area: AreaDireito | "outros";
  valor: number;
}

/** Receita recebida nos últimos 6 meses por área do direito, da maior para a menor. */
export function receitaPorArea(lancamentos: Lancamento[], casos: Caso[], hoje: Date): FatiaArea[] {
  const inicio = paraISO(addMonths(startOfMonth(hoje), -5));
  const areaDoCaso = new Map(casos.map((c) => [c.id, c.area]));
  const totais = new Map<FatiaArea["area"], number>();
  for (const l of lancamentos) {
    if (l.tipo !== "receita" || !l.pagoEm || l.pagoEm < inicio) continue;
    const area = (l.casoId && areaDoCaso.get(l.casoId)) || "outros";
    totais.set(area, (totais.get(area) ?? 0) + l.valor);
  }
  return [...totais.entries()].map(([area, valor]) => ({ area, valor })).sort((a, b) => b.valor - a.valor);
}

/* -------------------------------------------------------------------------- */
/* Prazos                                                                     */
/* -------------------------------------------------------------------------- */

export type GrupoPrazo = "atrasados" | "hoje" | "semana" | "proximos" | "concluidos";

export function grupoDoPrazo(prazo: Prazo, hoje: Date): GrupoPrazo {
  if (prazo.concluidoEm) return "concluidos";
  const dias = differenceInCalendarDays(parseISO(prazo.dataFatal), hoje);
  if (dias < 0) return "atrasados";
  if (dias === 0) return "hoje";
  if (dias <= 7) return "semana";
  return "proximos";
}

export function prazosAbertos(prazos: Prazo[]): Prazo[] {
  return prazos.filter((p) => !p.concluidoEm).sort((a, b) => a.dataFatal.localeCompare(b.dataFatal));
}

export function sugestoesPendentes(andamentos: Andamento[]): Andamento[] {
  return andamentos.filter((a) => a.sugestao?.estado === "pendente").sort((a, b) => b.data.localeCompare(a.data));
}

/* -------------------------------------------------------------------------- */
/* Agenda                                                                     */
/* -------------------------------------------------------------------------- */

export function eventosDoDia(eventos: Evento[], dia: Date): Evento[] {
  return eventos.filter((e) => isSameDay(parseISO(e.inicio), dia)).sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export function proximosEventos(eventos: Evento[], hoje: Date, limite = 5): Evento[] {
  const inicioDoDia = `${paraISO(hoje)}T00:00:00`;
  return eventos
    .filter((e) => e.inicio >= inicioDoDia)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .slice(0, limite);
}

/* -------------------------------------------------------------------------- */
/* Clientes e funil                                                           */
/* -------------------------------------------------------------------------- */

export function contagemFunil(clientes: Cliente[]): Array<{ etapa: EtapaFunil; quantidade: number }> {
  return ORDEM_FUNIL.map((etapa) => ({
    etapa,
    quantidade: clientes.filter((c) => c.status === "lead" && c.etapaFunil === etapa).length,
  }));
}

export interface ResumoClientes {
  ativos: number;
  leads: number;
  novosNoMes: number;
}

export function resumoClientes(clientes: Cliente[], hoje: Date): ResumoClientes {
  const mesAtual = chaveMes(paraISO(hoje));
  return {
    ativos: clientes.filter((c) => c.status === "ativo").length,
    leads: clientes.filter((c) => c.status === "lead").length,
    novosNoMes: clientes.filter((c) => chaveMes(c.criadoEm) === mesAtual).length,
  };
}

/* -------------------------------------------------------------------------- */
/* Briefing diário                                                            */
/* -------------------------------------------------------------------------- */

export interface Briefing {
  audienciasHoje: Evento[];
  compromissosHoje: Evento[];
  prazosHoje: Prazo[];
  prazosAtrasados: Prazo[];
  sugestoes: Andamento[];
  recebidoOntem: number;
  parcelasEmAtraso: number;
  conversasAguardando: number;
  /** Primeiro compromisso depois de hoje (para dias sem agenda, como fins de semana). */
  proximoEvento?: Evento;
  /** Primeiro prazo em aberto que vence depois de hoje. */
  proximoPrazo?: Prazo;
}

export function montarBriefing(dados: DadosEscritorio, hoje: Date): Briefing {
  const doDia = eventosDoDia(dados.eventos, hoje);
  const ontemISO = paraISO(addDays(hoje, -1));
  const hojeISO = paraISO(hoje);
  const abertos = prazosAbertos(dados.prazos);
  return {
    audienciasHoje: doDia.filter((e) => e.tipo === "audiencia"),
    compromissosHoje: doDia.filter((e) => e.tipo !== "audiencia"),
    prazosHoje: abertos.filter((p) => p.dataFatal === hojeISO),
    prazosAtrasados: abertos.filter((p) => p.dataFatal < hojeISO),
    sugestoes: sugestoesPendentes(dados.andamentos),
    recebidoOntem: somar(dados.lancamentos.filter((l) => l.tipo === "receita" && l.pagoEm === ontemISO)),
    parcelasEmAtraso: dados.lancamentos.filter((l) => l.tipo === "receita" && !l.pagoEm && l.vencimento < hojeISO).length,
    conversasAguardando: dados.conversas.filter((c) => c.naoLidas > 0).length,
    proximoEvento: [...dados.eventos].sort((a, b) => a.inicio.localeCompare(b.inicio)).find((e) => e.inicio.slice(0, 10) > hojeISO),
    proximoPrazo: abertos.find((p) => p.dataFatal > hojeISO),
  };
}
