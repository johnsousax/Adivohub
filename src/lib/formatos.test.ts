import { describe, expect, it } from "vitest";
import { lerValor } from "./formatos";

describe("lerValor", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["R$ 15.000", 15000],
    ["15.000,00", 15000],
    ["1.250.000", 1250000],
    ["1234.56", 1234.56],
    ["2,5", 2.5],
    ["350", 350],
    ["", 0],
    ["abc", 0],
  ])("%s → %d", (texto, esperado) => {
    expect(lerValor(texto)).toBe(esperado);
  });
});
