import { describe, expect, it } from "vitest";
import { conferirSenha, gerarHashDeSenha, hashDeSenhaValido } from "./senha";
import { assinarSessao, cookieDeSaida, cookieDeSessao, DURACAO_SESSAO_SEGUNDOS, lerSessao } from "./sessao";

describe("hash de senha", () => {
  it("aceita a senha certa e recusa a errada", async () => {
    const hash = await gerarHashDeSenha("uma frase bem comprida");
    expect(hash.startsWith("scrypt:15:8:3:")).toBe(true);
    expect(hash).not.toMatch(/[$]/); // o cifrão seria tratado como variável em arquivos .env
    expect(hash).not.toContain("uma frase");
    expect(await conferirSenha("uma frase bem comprida", hash)).toBe(true);
    expect(await conferirSenha("uma frase bem comprid", hash)).toBe(false);
    expect(await conferirSenha("", hash)).toBe(false);
  });

  it("gera hashes diferentes para a mesma senha (sal aleatório)", async () => {
    expect(await gerarHashDeSenha("uma frase bem comprida")).not.toBe(await gerarHashDeSenha("uma frase bem comprida"));
  });

  it("recusa senha curta", async () => {
    await expect(gerarHashDeSenha("curta123")).rejects.toThrow(/12 caracteres/);
  });

  it("sem hash, ou com hash adulterado, ninguém entra", async () => {
    expect(await conferirSenha("qualquer coisa", undefined)).toBe(false);
    expect(await conferirSenha("qualquer coisa", "")).toBe(false);
    expect(await conferirSenha("qualquer coisa", "texto-puro")).toBe(false);
    // Custo absurdo (negação de serviço) ou fraco demais: o formato é recusado sem calcular nada.
    const sal = "AAAAAAAAAAAAAAAAAAAAAA==";
    expect(hashDeSenhaValido(`scrypt:15:8:3:${sal}:${"A".repeat(88)}`)).toBe(true);
    expect(hashDeSenhaValido(`scrypt:30:8:1:${sal}:${"A".repeat(88)}`)).toBe(false);
    expect(hashDeSenhaValido(`scrypt:4:8:1:${sal}:${"A".repeat(88)}`)).toBe(false);
    expect(hashDeSenhaValido("md5:abc")).toBe(false);
  });
});

describe("sessão em cookie assinado", () => {
  const dados = { sub: "usr-ana", nome: "Dra. Ana Almeida", email: "demo@vade.example", papel: "demo" } as const;

  it("lê de volta o que assinou", async () => {
    const token = await assinarSessao(dados);
    const sessao = await lerSessao(token);
    expect(sessao).toMatchObject(dados);
    expect(sessao!.exp - sessao!.iat).toBe(DURACAO_SESSAO_SEGUNDOS);
    expect(sessao!.jti).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("recusa token adulterado, truncado ou inventado", async () => {
    const token = (await assinarSessao(dados))!;
    const [corpo, assinatura] = token.split(".");
    const promovido = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(corpo, "base64url").toString()), papel: "equipe" })).toString(
      "base64url",
    );

    expect(await lerSessao(`${promovido}.${assinatura}`)).toBeNull(); // tentou virar "equipe"
    expect(await lerSessao(`${corpo}.${assinatura.slice(0, -2)}xx`)).toBeNull();
    expect(await lerSessao(corpo)).toBeNull();
    expect(await lerSessao(`${corpo}.${assinatura}.extra`)).toBeNull();
    expect(await lerSessao("")).toBeNull();
    expect(await lerSessao(undefined)).toBeNull();
    expect(await lerSessao("a".repeat(5000))).toBeNull();
  });

  it("cada sessão tem identificador próprio", async () => {
    const a = await lerSessao(await assinarSessao(dados));
    const b = await lerSessao(await assinarSessao(dados));
    expect(a!.jti).not.toBe(b!.jti);
  });

  it("o cookie não fica acessível a scripts nem viaja para outros sites", () => {
    const cookie = cookieDeSessao("abc.def");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain(`Max-Age=${DURACAO_SESSAO_SEGUNDOS}`);
    expect(cookie).not.toContain("Domain=");
    expect(cookieDeSaida()).toContain("Max-Age=0");
  });
});
