import { describe, expect, it } from "vitest";
import type { Cliente } from "../tipos";
import {
  contatosAbertos,
  desempenhoPorOrigem,
  diasNaEtapa,
  funilComValores,
  grupoDoRetorno,
  motivosDePerda,
  resumoCRM,
  retornos,
  semProximoPasso,
} from "./crm";
import { criarSemente } from "./semente";

const hoje = new Date(2026, 10, 24); // terça, 24/11/2026

function pessoa(parcial: Partial<Cliente>): Cliente {
  return {
    id: parcial.id ?? `cli-${Math.random()}`,
    tipo: "PF",
    nome: "Contato",
    documento: "",
    email: "",
    telefone: "",
    cidade: "São Luís - MA",
    origem: "instagram",
    status: "lead",
    responsavelId: "usr-1",
    criadoEm: "2026-11-01",
    ...parcial,
  };
}

describe("CRM: funil e retornos", () => {
  const base = [
    pessoa({
      id: "a",
      etapaFunil: "novo",
      valorEstimado: 5000,
      temperatura: "quente",
      proximoPasso: { descricao: "Ligar", data: "2026-11-20" },
    }),
    pessoa({ id: "b", etapaFunil: "proposta", valorEstimado: 12000, proximoPasso: { descricao: "Cobrar resposta", data: "2026-11-24" } }),
    pessoa({ id: "c", etapaFunil: "proposta", valorEstimado: 8000, temperatura: "quente" }),
    pessoa({ id: "d", status: "ativo", convertidoEm: "2026-11-10" }),
    pessoa({
      id: "e",
      status: "perdido",
      perdidoEm: "2026-11-05",
      motivoPerda: "preco",
      proximoPasso: { descricao: "x", data: "2026-11-01" },
    }),
  ];

  it("só conta como em aberto quem ainda está no funil", () => {
    expect(contatosAbertos(base).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("soma os honorários estimados por etapa", () => {
    const funil = funilComValores(base);
    expect(funil.find((e) => e.etapa === "proposta")).toEqual({ etapa: "proposta", quantidade: 2, valor: 20000 });
    expect(funil.find((e) => e.etapa === "consulta")).toEqual({ etapa: "consulta", quantidade: 0, valor: 0 });
  });

  it("separa retornos atrasados, de hoje, da semana e mais adiante", () => {
    expect(grupoDoRetorno("2026-11-23", hoje)).toBe("atrasados");
    expect(grupoDoRetorno("2026-11-24", hoje)).toBe("hoje");
    expect(grupoDoRetorno("2026-12-01", hoje)).toBe("semana");
    expect(grupoDoRetorno("2026-12-02", hoje)).toBe("depois");
  });

  it("lista retornos em ordem de data e ignora contatos perdidos", () => {
    expect(retornos(base).map((c) => c.id)).toEqual(["a", "b"]);
    expect(semProximoPasso(base).map((c) => c.id)).toEqual(["c"]);
  });

  it("conta os dias parado na etapa", () => {
    expect(diasNaEtapa(pessoa({ etapaDesde: "2026-11-14" }), hoje)).toBe(10);
    expect(diasNaEtapa(pessoa({ criadoEm: "2026-11-24" }), hoje)).toBe(0);
  });

  it("resume a negociação e a conversão dos últimos 90 dias", () => {
    const resumo = resumoCRM(base, hoje);
    expect(resumo.emAberto).toBe(3);
    expect(resumo.emNegociacao).toBe(25000);
    expect(resumo.quentes).toBe(2);
    expect(resumo.retornosAtrasados).toBe(1);
    expect(resumo.retornosHoje).toBe(1);
    expect(resumo.ganhos).toBe(1);
    expect(resumo.perdidos).toBe(1);
    expect(resumo.taxaConversao).toBe(0.5);
    expect(resumo.cicloMedioDias).toBe(9);
  });

  it("sem nenhum desfecho, a taxa de conversão fica vazia em vez de 0%", () => {
    expect(resumoCRM([pessoa({})], hoje).taxaConversao).toBeNull();
  });

  it("calcula a conversão por origem e os motivos de perda", () => {
    const dados = [
      pessoa({ origem: "google", status: "ativo", convertidoEm: "2026-11-10" }),
      pessoa({ origem: "google", status: "perdido", perdidoEm: "2026-11-12", motivoPerda: "preco" }),
      pessoa({ origem: "google" }),
      pessoa({ origem: "indicacao", status: "ativo", convertidoEm: "2026-11-10" }),
      pessoa({ origem: "indicacao", status: "perdido", perdidoEm: "2026-11-15", motivoPerda: "preco" }),
      pessoa({ origem: "instagram", status: "perdido", perdidoEm: "2026-11-15", motivoPerda: "sem_resposta" }),
      // Cliente antigo, de antes do CRM: não entra na conta de origem.
      pessoa({ origem: "outro", status: "ativo", criadoEm: "2026-11-02" }),
    ];
    const origens = desempenhoPorOrigem(dados, hoje);
    expect(origens[0]).toEqual({ origem: "google", contatos: 3, ganhos: 1, conversao: 0.5 });
    expect(origens.find((o) => o.origem === "outro")).toBeUndefined();
    expect(motivosDePerda(dados, hoje)).toEqual([
      { motivo: "preco", quantidade: 2 },
      { motivo: "sem_resposta", quantidade: 1 },
    ]);
  });
});

describe("CRM: dados da demonstração", () => {
  for (const dia of [new Date(2026, 10, 24), new Date(2026, 11, 26), new Date(2027, 0, 1)]) {
    it(`tem funil, retornos e histórico coerentes (${dia.toLocaleDateString("pt-BR")})`, () => {
      const dados = criarSemente(dia);
      const resumo = resumoCRM(dados.clientes, dia);
      expect(resumo.emAberto).toBeGreaterThanOrEqual(12);
      expect(resumo.emNegociacao).toBeGreaterThan(0);
      expect(resumo.retornosAtrasados).toBeGreaterThan(0);
      expect(resumo.retornosHoje).toBeGreaterThan(0);
      expect(resumo.taxaConversao).not.toBeNull();
      expect(funilComValores(dados.clientes).every((e) => e.quantidade > 0)).toBe(true);
      expect(motivosDePerda(dados.clientes, dia).length).toBeGreaterThan(2);

      const ids = new Set(dados.clientes.map((c) => c.id));
      const idsUsuarios = new Set(dados.usuarios.map((u) => u.id));
      for (const interacao of dados.interacoes) {
        expect(ids.has(interacao.clienteId)).toBe(true);
        expect(idsUsuarios.has(interacao.usuarioId)).toBe(true);
        expect(interacao.em.slice(0, 10) <= dados.geradoEm).toBe(true);
      }
      for (const contato of contatosAbertos(dados.clientes)) {
        expect(contato.etapaFunil).toBeDefined();
        expect(dados.interacoes.some((i) => i.clienteId === contato.id)).toBe(true);
      }
    });
  }

  it("tem 128 casos ativos, todos ligados a clientes existentes", () => {
    const dados = criarSemente(hoje);
    const ativos = dados.casos.filter((c) => c.fase !== "encerrado");
    expect(ativos).toHaveLength(128);
    const ids = new Set(dados.clientes.map((c) => c.id));
    expect(dados.casos.every((c) => ids.has(c.clienteId))).toBe(true);
    expect(new Set(dados.casos.map((c) => c.id)).size).toBe(dados.casos.length);
    expect(new Set(dados.casos.filter((c) => c.numeroCNJ).map((c) => c.numeroCNJ)).size).toBe(
      dados.casos.filter((c) => c.numeroCNJ).length,
    );
  });

  it("gera sempre os mesmos dados para o mesmo dia", () => {
    expect(JSON.stringify(criarSemente(hoje).casos)).toBe(JSON.stringify(criarSemente(hoje).casos));
  });
});
