import { describe, expect, it } from "vitest";
import { mascararCNJ, montarCNJ, validarCNJ } from "./cnj";

describe("numeração CNJ", () => {
  it("calcula o dígito verificador pelo módulo 97", () => {
    // 98 − (000000120108260000·00 mod 97): conferido à mão.
    const base = BigInt("000000120108260000" + "00");
    const esperado = String(BigInt(98) - (base % BigInt(97))).padStart(2, "0");
    expect(montarCNJ(1, 2010, 8, 26, 0)).toBe(`0000001-${esperado}.2010.8.26.0000`);
  });

  it("monta números com dígito verificador válido", () => {
    const numero = montarCNJ(1004521, 2025, 4, 1, 3700);
    expect(numero).toMatch(/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/);
    expect(validarCNJ(numero)).toBe(true);
  });

  it("rejeita dígito verificador errado e tamanho incorreto", () => {
    const numero = montarCNJ(17834, 2026, 5, 16, 3);
    const digitoErrado = numero.replace(/-(\d{2})/, (_, dd: string) => `-${dd === "00" ? "01" : "00"}`);
    expect(validarCNJ(digitoErrado)).toBe(false);
    expect(validarCNJ("123")).toBe(false);
  });

  it("aplica a máscara enquanto digita", () => {
    expect(mascararCNJ("0017834")).toBe("0017834");
    expect(mascararCNJ("001783412")).toBe("0017834-12");
    expect(mascararCNJ("00178341220265160003")).toBe("0017834-12.2026.5.16.0003");
  });
});
