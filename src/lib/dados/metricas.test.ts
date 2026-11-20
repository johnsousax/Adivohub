import { describe, expect, it } from "vitest";
import { validarCNJ } from "../cnj";
import type { Lancamento, Prazo } from "../tipos";
import { grupoDoPrazo, montarBriefing, receitaPorArea, resumoFinanceiro, serieMensal, situacao } from "./metricas";
import { criarSemente } from "./semente";

const hoje = new Date(2026, 10, 24); // terça, 24/11/2026

function receita(parcial: Partial<Lancamento>): Lancamento {
  return { id: "x", tipo: "receita", descricao: "Teste", valor: 1000, vencimento: "2026-11-10", ...parcial };
}

describe("situação do lançamento", () => {
  it("classifica pago, atrasado e pendente", () => {
    expect(situacao(receita({ pagoEm: "2026-11-10" }), hoje)).toBe("pago");
    expect(situacao(receita({ vencimento: "2026-11-23" }), hoje)).toBe("atrasado");
    expect(situacao(receita({ vencimento: "2026-11-24" }), hoje)).toBe("pendente");
  });
});

describe("resumo financeiro", () => {
  const lancamentos: Lancamento[] = [
    receita({ id: "a", valor: 5000, vencimento: "2026-11-05", pagoEm: "2026-11-05" }),
    receita({ id: "b", valor: 3000, vencimento: "2026-10-05", pagoEm: "2026-10-06" }),
    receita({ id: "c", valor: 1000, vencimento: "2026-11-12" }), // atrasada
    receita({ id: "d", valor: 2000, vencimento: "2026-12-10" }), // a receber em 30 dias
    receita({ id: "e", valor: 9000, vencimento: "2027-02-10" }), // fora da janela
    { id: "f", tipo: "despesa", descricao: "Aluguel", valor: 3200, vencimento: "2026-11-10", pagoEm: "2026-11-10" },
  ];

  it("soma recebidos, a receber e atrasos", () => {
    const resumo = resumoFinanceiro(lancamentos, hoje);
    expect(resumo.recebidoMes).toBe(5000);
    expect(resumo.recebidoMesAnterior).toBe(3000);
    // Hoje é dia 24: os R$ 3.000 de outubro entraram no dia 6, então contam no mesmo período.
    expect(resumo.recebidoMesAnteriorAteODia).toBe(3000);
    expect(resumo.variacaoRecebido).toBeCloseTo(5000 / 3000 - 1);
    expect(resumo.aReceber30Dias).toBe(2000);
    expect(resumo.emAtraso).toBe(1000);
    expect(resumo.parcelasEmAtraso).toBe(1);
    expect(resumo.despesasMes).toBe(3200);
    expect(resumo.resultadoMes).toBe(1800);
  });

  it("calcula a inadimplência sobre o que venceu em 90 dias", () => {
    // Venceram em 90 dias: 5000 + 3000 + 1000 = 9000; em atraso: 1000.
    expect(resumoFinanceiro(lancamentos, hoje).inadimplencia).toBeCloseTo(1000 / 9000);
  });

  it("compara só com o mesmo período do mês anterior", () => {
    const comRecebimentoTardio = [...lancamentos, receita({ id: "g", valor: 9000, vencimento: "2026-10-28", pagoEm: "2026-10-28" })];
    const resumo = resumoFinanceiro(comRecebimentoTardio, hoje);
    expect(resumo.recebidoMesAnterior).toBe(12000);
    expect(resumo.recebidoMesAnteriorAteODia).toBe(3000);
  });

  it("não divide por zero sem histórico", () => {
    const resumo = resumoFinanceiro([], hoje);
    expect(resumo.inadimplencia).toBe(0);
    expect(resumo.variacaoRecebido).toBeNull();
  });

  it("monta a série mensal do mais antigo ao atual", () => {
    const serie = serieMensal(lancamentos, hoje, 3);
    expect(serie.map((p) => p.mes)).toEqual(["2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(serie.map((p) => p.recebido)).toEqual([0, 3000, 5000]);
    expect(serie[2].despesas).toBe(3200);
  });
});

describe("prazos", () => {
  const prazo = (dataFatal: string, concluidoEm?: string): Prazo => ({
    id: "p",
    casoId: "c",
    titulo: "Prazo",
    dataFatal,
    dataInterna: dataFatal,
    responsavelId: "u",
    origem: "manual",
    concluidoEm,
  });

  it("agrupa pelo vencimento", () => {
    expect(grupoDoPrazo(prazo("2026-11-23"), hoje)).toBe("atrasados");
    expect(grupoDoPrazo(prazo("2026-11-24"), hoje)).toBe("hoje");
    expect(grupoDoPrazo(prazo("2026-11-30"), hoje)).toBe("semana");
    expect(grupoDoPrazo(prazo("2026-12-20"), hoje)).toBe("proximos");
    expect(grupoDoPrazo(prazo("2026-11-20", "2026-11-19"), hoje)).toBe("concluidos");
  });
});

describe("dados de demonstração", () => {
  // Gera a semente em vários dias (inclusive fim de semana e feriado) para garantir coerência.
  const dias = [new Date(2026, 10, 20), new Date(2026, 10, 21), new Date(2026, 10, 24), new Date(2026, 11, 28), new Date(2027, 0, 4)];

  it.each(dias)("é coerente em %s", (dia) => {
    const dados = criarSemente(dia);
    const idsClientes = new Set(dados.clientes.map((c) => c.id));
    const idsCasos = new Set(dados.casos.map((c) => c.id));
    const idsUsuarios = new Set(dados.usuarios.map((u) => u.id));

    for (const caso of dados.casos) {
      expect(idsClientes.has(caso.clienteId)).toBe(true);
      expect(idsUsuarios.has(caso.responsavelId)).toBe(true);
      if (caso.numeroCNJ) expect(validarCNJ(caso.numeroCNJ)).toBe(true);
    }
    for (const prazo of dados.prazos) {
      expect(idsCasos.has(prazo.casoId)).toBe(true);
      expect(prazo.dataInterna <= prazo.dataFatal).toBe(true);
    }
    for (const andamento of dados.andamentos) expect(idsCasos.has(andamento.casoId)).toBe(true);
    for (const evento of dados.eventos) expect(evento.inicio < evento.fim).toBe(true);
    for (const lancamento of dados.lancamentos) {
      expect(lancamento.valor).toBeGreaterThan(0);
      if (lancamento.clienteId) expect(idsClientes.has(lancamento.clienteId)).toBe(true);
      if (lancamento.pagoEm) expect(lancamento.pagoEm <= dados.geradoEm).toBe(true);
    }

    const ids = [...dados.lancamentos.map((l) => l.id), ...dados.prazos.map((p) => p.id), ...dados.eventos.map((e) => e.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tem movimento para o painel", () => {
    const dados = criarSemente(hoje);
    const resumo = resumoFinanceiro(dados.lancamentos, hoje);
    expect(resumo.recebidoMes).toBeGreaterThan(0);
    expect(resumo.parcelasEmAtraso).toBe(2);
    expect(resumo.emAtraso).toBe(3000);
    expect(serieMensal(dados.lancamentos, hoje).every((p) => p.recebido > 0)).toBe(true);
    expect(receitaPorArea(dados.lancamentos, dados.casos, hoje).length).toBeGreaterThan(2);

    const briefing = montarBriefing(dados, hoje);
    expect(briefing.audienciasHoje).toHaveLength(1);
    expect(briefing.prazosHoje).toHaveLength(1);
    expect(briefing.sugestoes).toHaveLength(3);
    expect(briefing.recebidoOntem).toBe(20520);

    // O mês em curso precisa fechar no azul, senão a demonstração conta a história errada.
    expect(resumo.resultadoMes).toBeGreaterThan(0);
    // Toda receita de êxito pertence a um caso (aparece em "Receita por área").
    const exitos = dados.lancamentos.filter((l) => l.descricao.startsWith("Honorários de êxito"));
    expect(exitos.every((l) => l.casoId && l.clienteId)).toBe(true);
  });
});
