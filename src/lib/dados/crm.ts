import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { paraISO } from "../datas";
import { ORDEM_FUNIL, type Cliente, type EtapaFunil, type MotivoPerda, type OrigemCliente } from "../tipos";

/**
 * Contas do CRM: funil de captação, retornos combinados e indicadores de conversão.
 * Funções puras, sem dependência de tela, para poderem ser testadas.
 */

/** Contatos em negociação: ainda no funil, nem fechados nem perdidos. */
export function contatosAbertos(clientes: Cliente[]): Cliente[] {
  return clientes.filter((c) => c.status === "lead");
}

export function diasNaEtapa(contato: Cliente, hoje: Date): number {
  const desde = contato.etapaDesde ?? contato.criadoEm;
  return Math.max(0, differenceInCalendarDays(hoje, parseISO(desde)));
}

/* -------------------------------- Retornos -------------------------------- */

export type GrupoRetorno = "atrasados" | "hoje" | "semana" | "depois";

export const GRUPOS_RETORNO: Record<GrupoRetorno, string> = {
  atrasados: "Atrasados",
  hoje: "Hoje",
  semana: "Próximos 7 dias",
  depois: "Mais adiante",
};

export function grupoDoRetorno(data: string, hoje: Date): GrupoRetorno {
  const hojeISO = paraISO(hoje);
  if (data < hojeISO) return "atrasados";
  if (data === hojeISO) return "hoje";
  if (data <= paraISO(addDays(hoje, 7))) return "semana";
  return "depois";
}

/** Contatos em aberto com próximo passo marcado, do mais antigo para o mais novo. */
export function retornos(clientes: Cliente[]): Cliente[] {
  return contatosAbertos(clientes)
    .filter((c) => c.proximoPasso)
    .sort((a, b) => a.proximoPasso!.data.localeCompare(b.proximoPasso!.data) || a.nome.localeCompare(b.nome));
}

/** Contatos em aberto sem nenhum próximo passo: são os que costumam esfriar. */
export function semProximoPasso(clientes: Cliente[]): Cliente[] {
  return contatosAbertos(clientes).filter((c) => !c.proximoPasso);
}

/* ------------------------------- Indicadores ------------------------------ */

export interface ResumoCRM {
  emAberto: number;
  /** Soma dos honorários estimados dos contatos em aberto. */
  emNegociacao: number;
  quentes: number;
  retornosAtrasados: number;
  retornosHoje: number;
  /** Fechados e perdidos na janela (padrão: 90 dias). */
  ganhos: number;
  perdidos: number;
  /** ganhos / (ganhos + perdidos); null sem nenhum desfecho na janela. */
  taxaConversao: number | null;
  /** Dias, em média, do primeiro contato até virar cliente (na janela). */
  cicloMedioDias: number | null;
}

function naJanela(data: string | undefined, hoje: Date, dias: number): boolean {
  if (!data) return false;
  return data > paraISO(addDays(hoje, -dias)) && data <= paraISO(hoje);
}

export function resumoCRM(clientes: Cliente[], hoje: Date, janelaDias = 90): ResumoCRM {
  const abertos = contatosAbertos(clientes);
  const hojeISO = paraISO(hoje);
  const ganhos = clientes.filter((c) => c.status !== "lead" && c.status !== "perdido" && naJanela(c.convertidoEm, hoje, janelaDias));
  const perdidos = clientes.filter((c) => c.status === "perdido" && naJanela(c.perdidoEm, hoje, janelaDias));
  const ciclos = ganhos.map((c) => differenceInCalendarDays(parseISO(c.convertidoEm!), parseISO(c.criadoEm))).filter((d) => d >= 0);
  const desfechos = ganhos.length + perdidos.length;
  return {
    emAberto: abertos.length,
    emNegociacao: abertos.reduce((total, c) => total + (c.valorEstimado ?? 0), 0),
    quentes: abertos.filter((c) => c.temperatura === "quente").length,
    retornosAtrasados: abertos.filter((c) => c.proximoPasso && c.proximoPasso.data < hojeISO).length,
    retornosHoje: abertos.filter((c) => c.proximoPasso?.data === hojeISO).length,
    ganhos: ganhos.length,
    perdidos: perdidos.length,
    taxaConversao: desfechos > 0 ? ganhos.length / desfechos : null,
    cicloMedioDias: ciclos.length > 0 ? Math.round(ciclos.reduce((t, d) => t + d, 0) / ciclos.length) : null,
  };
}

export interface EtapaComValor {
  etapa: EtapaFunil;
  quantidade: number;
  valor: number;
}

/** Quantos contatos e quanto em honorários estimados há em cada etapa. */
export function funilComValores(clientes: Cliente[]): EtapaComValor[] {
  const abertos = contatosAbertos(clientes);
  return ORDEM_FUNIL.map((etapa) => {
    const daEtapa = abertos.filter((c) => (c.etapaFunil ?? "novo") === etapa);
    return { etapa, quantidade: daEtapa.length, valor: daEtapa.reduce((t, c) => t + (c.valorEstimado ?? 0), 0) };
  });
}

export interface DesempenhoOrigem {
  origem: OrigemCliente;
  contatos: number;
  ganhos: number;
  /** ganhos / contatos que já tiveram desfecho; null se nenhum teve. */
  conversao: number | null;
}

/**
 * De onde vêm os contatos e quantos viram cliente, considerando quem chegou na janela
 * (padrão: 180 dias). Quem ainda está em aberto conta como contato, mas não entra na conversão.
 */
export function desempenhoPorOrigem(clientes: Cliente[], hoje: Date, janelaDias = 180): DesempenhoOrigem[] {
  const mapa = new Map<OrigemCliente, { contatos: number; ganhos: number; perdidos: number }>();
  for (const c of clientes) {
    if (!naJanela(c.criadoEm, hoje, janelaDias)) continue;
    const ganhou = c.status !== "lead" && c.status !== "perdido" && Boolean(c.convertidoEm);
    if (c.status !== "lead" && c.status !== "perdido" && !c.convertidoEm) continue;
    const item = mapa.get(c.origem) ?? { contatos: 0, ganhos: 0, perdidos: 0 };
    item.contatos += 1;
    if (ganhou) item.ganhos += 1;
    if (c.status === "perdido") item.perdidos += 1;
    mapa.set(c.origem, item);
  }
  return [...mapa.entries()]
    .map(([origem, item]) => ({
      origem,
      contatos: item.contatos,
      ganhos: item.ganhos,
      conversao: item.ganhos + item.perdidos > 0 ? item.ganhos / (item.ganhos + item.perdidos) : null,
    }))
    .sort((a, b) => b.contatos - a.contatos || b.ganhos - a.ganhos);
}

/** Por que os contatos não fecharam (na janela, padrão 180 dias), do motivo mais comum para o menos. */
export function motivosDePerda(clientes: Cliente[], hoje: Date, janelaDias = 180): Array<{ motivo: MotivoPerda; quantidade: number }> {
  const contagem = new Map<MotivoPerda, number>();
  for (const c of clientes) {
    if (c.status !== "perdido" || !naJanela(c.perdidoEm, hoje, janelaDias)) continue;
    const motivo = c.motivoPerda ?? "outro";
    contagem.set(motivo, (contagem.get(motivo) ?? 0) + 1);
  }
  return [...contagem.entries()].map(([motivo, quantidade]) => ({ motivo, quantidade })).sort((a, b) => b.quantidade - a.quantidade);
}
