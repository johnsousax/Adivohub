import { randomBytes } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cifrar, decifrar, indiceCego, mascararDocumento, normalizarDocumento } from "./cripto";

const CPF = "123.456.789-09";
const CNPJ = "12.345.678/0001-95";
// As mesmas regras que o banco aplica (database/schema.sql).
const FORMATO_NO_BANCO = /^v[0-9]{1,3}(:[A-Za-z0-9_-]+){3}$/;
const MASCARA_NO_BANCO = /^[0-9A-Z*./-]{11,18}$/;

const originais = { dados: process.env.CHAVE_DE_DADOS, indice: process.env.CHAVE_DE_INDICE };

beforeEach(() => {
  process.env.CHAVE_DE_DADOS = randomBytes(32).toString("base64");
  process.env.CHAVE_DE_INDICE = randomBytes(32).toString("base64");
});

afterAll(() => {
  process.env.CHAVE_DE_DADOS = originais.dados;
  process.env.CHAVE_DE_INDICE = originais.indice;
});

describe("cifra de dados sensíveis", () => {
  it("cifra e decifra de volta", () => {
    expect(decifrar(cifrar(CPF))).toBe(CPF);
    expect(decifrar(cifrar("Ação, coração e ñ"))).toBe("Ação, coração e ñ");
  });

  it("o resultado não contém o número e tem o formato que o banco exige", () => {
    const pacote = cifrar(CPF);
    expect(pacote).toMatch(FORMATO_NO_BANCO);
    expect(pacote).not.toContain("123");
    expect(pacote.length).toBeLessThanOrEqual(400);
  });

  it("o mesmo texto nunca gera o mesmo resultado duas vezes", () => {
    expect(cifrar(CPF)).not.toBe(cifrar(CPF));
  });

  it("dado adulterado não decifra", () => {
    const [versao, iv, etiqueta, corpo] = cifrar(CPF).split(":");
    const trocado = corpo.startsWith("A") ? `B${corpo.slice(1)}` : `A${corpo.slice(1)}`;
    expect(() => decifrar([versao, iv, etiqueta, trocado].join(":"))).toThrow();
    expect(() => decifrar([versao, iv, "A".repeat(22), corpo].join(":"))).toThrow();
  });

  it("dado copiado para outro registro não decifra", () => {
    const pacote = cifrar(CPF, "cliente:1");
    expect(decifrar(pacote, "cliente:1")).toBe(CPF);
    expect(() => decifrar(pacote, "cliente:2")).toThrow();
    expect(() => decifrar(pacote)).toThrow();
  });

  it("com outra chave não decifra", () => {
    const pacote = cifrar(CPF);
    process.env.CHAVE_DE_DADOS = randomBytes(32).toString("base64");
    expect(() => decifrar(pacote)).toThrow();
  });

  it("recusa formato desconhecido, etiqueta curta e versão estranha", () => {
    const [, iv, etiqueta, corpo] = cifrar(CPF).split(":");
    expect(() => decifrar(CPF)).toThrow("formato desconhecido");
    expect(() => decifrar(`v9:${iv}:${etiqueta}:${corpo}`)).toThrow("formato desconhecido");
    expect(() => decifrar(`v1:${iv}:${etiqueta.slice(0, 8)}:${corpo}`)).toThrow("formato desconhecido");
    expect(() => decifrar(`v1:${iv}:${etiqueta}:${corpo}:extra`)).toThrow("formato desconhecido");
  });

  it("sem chave, ou com chave curta, não cifra nada", () => {
    delete process.env.CHAVE_DE_DADOS;
    expect(() => cifrar(CPF)).toThrow("CHAVE_DE_DADOS");
    process.env.CHAVE_DE_DADOS = Buffer.from("curta").toString("base64");
    expect(() => cifrar(CPF)).toThrow("CHAVE_DE_DADOS");
  });
});

describe("índice cego", () => {
  it("é igual com ou sem pontuação, e tem o formato que o banco exige", () => {
    expect(indiceCego(CPF)).toBe(indiceCego("12345678909"));
    expect(indiceCego(CPF)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("documentos diferentes geram códigos diferentes", () => {
    expect(indiceCego(CPF)).not.toBe(indiceCego("987.654.321-00"));
    expect(indiceCego(CPF)).not.toBe(indiceCego(CNPJ));
  });

  it("depende da chave: quem não tem a chave não consegue testar um CPF", () => {
    const antes = indiceCego(CPF);
    process.env.CHAVE_DE_INDICE = randomBytes(32).toString("base64");
    expect(indiceCego(CPF)).not.toBe(antes);
  });

  it("usa uma chave separada da chave de cifra", () => {
    delete process.env.CHAVE_DE_INDICE;
    expect(() => indiceCego(CPF)).toThrow("CHAVE_DE_INDICE");
    expect(decifrar(cifrar(CPF))).toBe(CPF);
  });

  it("recusa o que não é CPF nem CNPJ", () => {
    for (const invalido of ["", "123", "1234567890", "123456789012", "abc.def.ghi-jk"]) {
      expect(() => indiceCego(invalido)).toThrow("formato inválido");
    }
  });
});

describe("documento na tela", () => {
  it("mascara CPF e CNPJ no formato que o banco aceita", () => {
    expect(mascararDocumento(CPF)).toBe("***.456.789-**");
    expect(mascararDocumento("12345678909")).toBe("***.456.789-**");
    expect(mascararDocumento(CNPJ)).toBe("**.345.678/****-**");
    for (const mascara of [mascararDocumento(CPF), mascararDocumento(CNPJ)]) {
      expect(mascara).toMatch(MASCARA_NO_BANCO);
      expect(mascara.split("*").length - 1).toBeGreaterThanOrEqual(4);
    }
  });

  it("aceita o CNPJ com letras", () => {
    expect(normalizarDocumento("12.abc.345/01de-35")).toBe("12ABC34501DE35");
    expect(mascararDocumento("12.ABC.345/01DE-35")).toBe("**.ABC.345/****-**");
    expect(indiceCego("12.abc.345/01de-35")).toBe(indiceCego("12ABC34501DE35"));
  });

  it("nunca mostra mais da metade do número", () => {
    const visiveis = (mascara: string) => mascara.replace(/[^0-9A-Z]/g, "").length;
    expect(visiveis(mascararDocumento(CPF))).toBeLessThanOrEqual(6);
    expect(visiveis(mascararDocumento(CNPJ))).toBeLessThanOrEqual(6);
  });
});
