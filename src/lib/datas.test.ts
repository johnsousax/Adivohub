import { describe, expect, it } from "vitest";
import { ehDiaUtil, emRecessoForense, feriadoEm, feriados, paraISO, pascoa, proximoDiaUtil, somarDiasUteis, sugerirPrazo } from "./datas";

const data = (iso: string) => new Date(`${iso}T00:00:00`);

describe("feriados", () => {
  it("calcula a Páscoa", () => {
    expect(paraISO(pascoa(2026))).toBe("2026-04-05");
    expect(paraISO(pascoa(2027))).toBe("2027-03-28");
  });

  it("inclui feriados fixos e móveis", () => {
    const mapa = feriados(2026);
    expect(mapa.get("2026-11-20")).toBe("Consciência Negra");
    expect(mapa.get("2026-04-03")).toBe("Sexta-feira Santa");
    expect(mapa.get("2026-02-17")).toBe("Carnaval");
    expect(mapa.get("2026-06-04")).toBe("Corpus Christi");
  });

  it("diz qual feriado cai em um dia", () => {
    expect(feriadoEm(data("2026-11-20"))).toBe("Consciência Negra");
    expect(feriadoEm(data("2026-12-25"))).toBe("Natal");
    expect(feriadoEm(data("2026-11-19"))).toBeUndefined();
    expect(feriadoEm(data("2026-11-21"))).toBeUndefined(); // sábado comum não é feriado
  });
});

describe("dias úteis", () => {
  it("não conta fim de semana nem feriado", () => {
    expect(ehDiaUtil(data("2026-11-21"))).toBe(false); // sábado
    expect(ehDiaUtil(data("2026-11-20"))).toBe(false); // Consciência Negra
    expect(ehDiaUtil(data("2026-11-23"))).toBe(true);
  });

  it("reconhece o recesso forense", () => {
    expect(emRecessoForense(data("2026-12-20"))).toBe(true);
    expect(emRecessoForense(data("2027-01-20"))).toBe(true);
    expect(emRecessoForense(data("2027-01-21"))).toBe(false);
    expect(ehDiaUtil(data("2026-12-22"), { recesso: true })).toBe(false);
    expect(ehDiaUtil(data("2026-12-22"))).toBe(true);
  });

  it("soma dias úteis sem contar o dia inicial", () => {
    // Intimação na terça 24/11/2026: 15 dias úteis terminam na terça 15/12.
    expect(paraISO(somarDiasUteis("2026-11-24", 15))).toBe("2026-12-15");
    // De quinta 19/11: sexta 20 é feriado, então o 1º dia útil é segunda 23.
    expect(paraISO(somarDiasUteis("2026-11-19", 1))).toBe("2026-11-23");
  });

  it("volta dias úteis com quantidade negativa", () => {
    expect(paraISO(somarDiasUteis("2026-12-15", -2))).toBe("2026-12-11");
  });

  it("encontra o próximo dia útil", () => {
    expect(paraISO(proximoDiaUtil("2026-11-20"))).toBe("2026-11-23");
    expect(paraISO(proximoDiaUtil("2026-11-24"))).toBe("2026-11-24");
  });
});

describe("sugerirPrazo", () => {
  it("devolve data fatal e data interna (D-2)", () => {
    expect(sugerirPrazo("2026-11-24", 15)).toEqual({ dataFatal: "2026-12-15", dataInterna: "2026-12-11" });
  });

  it("pula o recesso forense", () => {
    // Intimação em 14/12/2026 (segunda): 15, 16, 17 e 18/12 contam (4 dias);
    // o prazo fica suspenso de 20/12 a 20/01 e retoma em 21/01/2027.
    const { dataFatal } = sugerirPrazo("2026-12-14", 15);
    expect(dataFatal).toBe("2027-02-04");
  });
});
