import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { montarCSP } from "./csp";
import {
  consumirCota,
  consumirLimite,
  esperaPorFalhas,
  FALHAS_SEM_ESPERA,
  ipDaRequisicao,
  limparFalhas,
  registrarFalha,
  zerarLimites,
} from "./limite";
import { origemPermitida } from "./origem";
import { mascararEmail } from "./registro";
import { assinaturaValida, criarMemoriaDeEventos, desafioValido, extrairMensagens, mensagemRecente, textosIguais } from "./webhook";

describe("política de segurança de conteúdo (CSP)", () => {
  const producao = montarCSP({ nonce: "abc123", https: true, desenvolvimento: false });

  it("em produção, script só com o nonce: sem unsafe-inline e sem unsafe-eval", () => {
    const scripts = producao.split("; ").find((d) => d.startsWith("script-src"))!;
    expect(scripts).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(producao).not.toContain("unsafe-eval");
  });

  it("fecha molduras, objetos, base e formulários", () => {
    for (const diretiva of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"]) {
      expect(producao).toContain(diretiva);
    }
    expect(producao).toContain("upgrade-insecure-requests");
  });

  it("não libera nenhum domínio de terceiros", () => {
    expect(producao).not.toMatch(/https?:\/\//);
    expect(producao).not.toContain("*");
  });

  it("sem HTTPS (teste local) não força a troca de protocolo", () => {
    expect(montarCSP({ nonce: "x", https: false, desenvolvimento: false })).not.toContain("upgrade-insecure-requests");
  });
});

describe("origem das requisições (CSRF)", () => {
  const host = "vade-juridico.vercel.app";

  it("aceita chamadas do próprio site", () => {
    expect(origemPermitida({ origin: `https://${host}`, secFetchSite: "same-origin", host })).toBe(true);
    expect(origemPermitida({ origin: `https://${host}`, secFetchSite: null, host })).toBe(true);
  });

  it("recusa chamadas de outro site, mesmo parecido", () => {
    expect(origemPermitida({ origin: "https://site-malicioso.example", secFetchSite: "cross-site", host })).toBe(false);
    expect(origemPermitida({ origin: "https://site-malicioso.example", secFetchSite: null, host })).toBe(false);
    expect(origemPermitida({ origin: `https://${host}.evil.example`, secFetchSite: null, host })).toBe(false);
    expect(origemPermitida({ origin: `https://outro.vercel.app`, secFetchSite: "same-site", host })).toBe(false);
    expect(origemPermitida({ origin: "null", secFetchSite: null, host })).toBe(false);
    expect(origemPermitida({ origin: `https://${host}`, secFetchSite: "cross-site", host })).toBe(false);
  });

  it("sem cabeçalhos de navegador (curl, monitoramento) não é CSRF", () => {
    expect(origemPermitida({ origin: null, secFetchSite: null, host })).toBe(true);
  });
});

describe("limites de uso", () => {
  beforeEach(() => zerarLimites());

  it("corta depois do máximo dentro da janela", () => {
    for (let i = 0; i < 5; i++) expect(consumirLimite("login:ip:1.2.3.4", 5, 60_000).permitido).toBe(true);
    const sexta = consumirLimite("login:ip:1.2.3.4", 5, 60_000);
    expect(sexta.permitido).toBe(false);
    expect(sexta.aguardar).toBeGreaterThan(0);
    expect(consumirLimite("login:ip:5.6.7.8", 5, 60_000).permitido).toBe(true);
  });

  it("espera cresce a cada falha depois da quinta", () => {
    const agora = 1_000_000;
    for (let i = 1; i < FALHAS_SEM_ESPERA; i++) expect(registrarFalha("conta:x", agora)).toBe(0);
    expect(esperaPorFalhas("conta:x", agora)).toBe(0);
    expect(registrarFalha("conta:x", agora)).toBe(30); // 5ª falha
    expect(esperaPorFalhas("conta:x", agora + 10_000)).toBe(20);
    expect(esperaPorFalhas("conta:x", agora + 31_000)).toBe(0);
    expect(registrarFalha("conta:x", agora + 31_000)).toBe(60); // 6ª
    expect(registrarFalha("conta:x", agora + 100_000)).toBe(120); // 7ª
    for (let i = 0; i < 10; i++) registrarFalha("conta:x", agora + 200_000);
    expect(esperaPorFalhas("conta:x", agora + 200_000)).toBe(15 * 60); // teto de 15 minutos
  });

  it("acertar a senha limpa o histórico de falhas", () => {
    for (let i = 0; i < 6; i++) registrarFalha("conta:y");
    expect(esperaPorFalhas("conta:y")).toBeGreaterThan(0);
    limparFalhas("conta:y");
    expect(esperaPorFalhas("conta:y")).toBe(0);
  });

  it("cota diária acaba", () => {
    expect(consumirCota("ia:a@b.example", 2)).toBe(true);
    expect(consumirCota("ia:a@b.example", 2)).toBe(true);
    expect(consumirCota("ia:a@b.example", 2)).toBe(false);
  });

  it("identifica quem pediu pelo IP que a plataforma informa", () => {
    const com = (cabecalhos: Record<string, string>) => ipDaRequisicao(new Request("https://x.example/", { headers: cabecalhos }));
    expect(com({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1" })).toBe("203.0.113.9");
    expect(com({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" })).toBe("198.51.100.1");
    // IPv6: o mesmo assinante controla todo o /64, então a chave é o prefixo.
    expect(com({ "x-real-ip": "2001:db8:aaaa:bbbb:1:2:3:4" })).toBe(com({ "x-real-ip": "2001:db8:aaaa:bbbb:ffff:ffff:ffff:ffff" }));
    expect(com({})).toBe("desconhecido");
  });
});

describe("webhook do WhatsApp", () => {
  const segredo = "segredo-do-aplicativo";
  const corpo = JSON.stringify({
    entry: [{ changes: [{ value: { messages: [{ id: "wamid.1", from: "5598900000001", timestamp: "1795140000", type: "text" }] } }] }],
  });
  const assinar = (texto: string, chave = segredo) => `sha256=${createHmac("sha256", chave).update(texto).digest("hex")}`;

  it("aceita só a assinatura feita com o segredo certo sobre o corpo exato", () => {
    expect(assinaturaValida(corpo, assinar(corpo), segredo)).toBe(true);
    expect(assinaturaValida(corpo + " ", assinar(corpo), segredo)).toBe(false);
    expect(assinaturaValida(corpo, assinar(corpo, "outro-segredo"), segredo)).toBe(false);
    expect(assinaturaValida(corpo, null, segredo)).toBe(false);
    expect(assinaturaValida(corpo, "sha256=abc", segredo)).toBe(false);
    expect(assinaturaValida(corpo, assinar(corpo).replace("sha256=", "sha1="), segredo)).toBe(false);
    expect(assinaturaValida(corpo, assinar(corpo, ""), "")).toBe(false);
  });

  it("só devolve um desafio de verificação bem formado", () => {
    expect(desafioValido("1158201444")).toBe(true);
    expect(desafioValido("<script>alert(1)</script>")).toBe(false);
    expect(desafioValido("")).toBe(false);
    expect(desafioValido(null)).toBe(false);
  });

  it("compara textos por inteiro", () => {
    expect(textosIguais("token-certo", "token-certo")).toBe(true);
    expect(textosIguais("token-certo", "token-cert")).toBe(false);
    expect(textosIguais("", "token-certo")).toBe(false);
  });

  it("extrai as mensagens e recusa formato inesperado", () => {
    expect(extrairMensagens(JSON.parse(corpo))).toEqual([{ id: "wamid.1", enviadaEm: 1795140000, tipo: "text" }]);
    expect(extrairMensagens({})).toEqual([]);
    expect(extrairMensagens({ entry: "texto" })).toBeNull();
    expect(extrairMensagens({ entry: [{ changes: [{ value: { messages: [{ id: "", timestamp: "abc" }] } }] }] })).toBeNull();
  });

  it("separa mensagem recente de reentrega antiga", () => {
    const agora = 1795140000_000;
    expect(mensagemRecente({ id: "a", enviadaEm: 1795140000 - 60, tipo: "text" }, agora)).toBe(true);
    expect(mensagemRecente({ id: "b", enviadaEm: 1795140000 - 6 * 60, tipo: "text" }, agora)).toBe(false);
    expect(mensagemRecente({ id: "c", enviadaEm: 1795140000 + 3600, tipo: "text" }, agora)).toBe(false);
  });

  it("ignora evento repetido", () => {
    const memoria = criarMemoriaDeEventos(3);
    expect(memoria.jaProcessado("wamid.1")).toBe(false);
    expect(memoria.jaProcessado("wamid.1")).toBe(true);
    memoria.jaProcessado("wamid.2");
    memoria.jaProcessado("wamid.3");
    memoria.jaProcessado("wamid.4"); // passa do limite: o mais antigo sai
    expect(memoria.jaProcessado("wamid.4")).toBe(true);
    expect(memoria.jaProcessado("wamid.1")).toBe(false);
  });
});

describe("registros", () => {
  it("mascara o e-mail", () => {
    expect(mascararEmail("ana.almeida@escritorio.example")).toBe("a***@escritorio.example");
    expect(mascararEmail("sem-arroba")).toBe("***");
  });
});
