import { describe, expect, it } from "vitest";
import { criarSemente } from "../dados/semente";
import { montarContextoIA, montarPedidoAtendimento } from "./contexto";
import { ContextoIA, PedidoAtendimento } from "./esquemas";
import { atenderLocal, responderAssistenteLocal } from "./local";
import { formatarContexto, formatarPedidoAtendimento } from "./prompts";

const hoje = new Date(2026, 10, 24); // terça, 24/11/2026
const dados = criarSemente(hoje);
const contexto = montarContextoIA(dados, hoje, "Dra. Ana Almeida");

describe("contexto enviado à IA", () => {
  it("respeita o contrato da rota (tamanhos e formatos)", () => {
    expect(ContextoIA.safeParse(contexto).success).toBe(true);
  });

  it("vira um bloco de texto com as seções esperadas", () => {
    const texto = formatarContexto(contexto);
    expect(texto).toContain("<dados_do_escritorio>");
    expect(texto).toContain("## Prazos em aberto");
    expect(texto).toContain("Silva × INSS");
    expect(texto).toContain("[ATRASADO]");
    // Cabe folgado no limite de 200 kB da rota.
    expect(texto.length).toBeLessThan(40_000);
  });
});

describe("assistente em modo demonstração", () => {
  it("resume o dia", () => {
    const resposta = responderAssistenteLocal("Resumo do meu dia", contexto);
    expect(resposta).toContain("Agenda (2)");
    expect(resposta).toContain("Prazos que vencem hoje (1)");
    expect(resposta).toContain("Publicações aguardando sua confirmação (3)");
  });

  it("lista prazos da semana e atrasados", () => {
    expect(responderAssistenteLocal("Quais prazos vencem esta semana?", contexto)).toContain("Prazos dos próximos 7 dias");
    const atrasados = responderAssistenteLocal("Tem prazo atrasado?", contexto);
    expect(atrasados).toContain("Prazos atrasados (1)");
    expect(atrasados).toContain("Parecer sobre aditivo contratual");
  });

  it("responde sobre inadimplência com os valores do financeiro", () => {
    const resposta = responderAssistenteLocal("Quem está com parcela em atraso?", contexto);
    // O Intl usa espaço não separável entre "R$" e o número, então conferimos só o valor.
    expect(resposta).toContain("30.000,00");
    expect(resposta).toContain("Padaria Pão Dourado ME");
    expect(resposta).toContain("Teresa Rocha");
  });

  it("encontra um caso pelo nome do cliente", () => {
    const resposta = responderAssistenteLocal("Como está o caso Ferreira?", contexto);
    expect(resposta).toContain("Ferreira × Transportadora Litoral");
    expect(resposta).toContain("Instrução");
  });

  it("mostra o funil e oferece ajuda quando não entende", () => {
    expect(responderAssistenteLocal("como está o funil de novos clientes?", contexto)).toContain("Bruno Martins");
    expect(responderAssistenteLocal("qual a capital da França?", contexto)).toContain("Consigo responder sobre os dados do escritório");
  });
});

describe("atendente em modo demonstração", () => {
  const conversaNova = (mensagens: Array<[de: "cliente" | "ia" | "equipe", texto: string]>): PedidoAtendimento => ({
    escritorio: "Almeida & Rocha Advogados",
    advogado: "Dr. Pedro Rocha",
    horarios: ["2026-11-25T10:00:00", "2026-11-25T16:00:00"],
    mensagens: mensagens.map(([de, texto]) => ({ de, texto })),
  });

  it("monta um pedido válido a partir de uma conversa real", () => {
    const conversa = dados.conversas.find((c) => c.id === "cvs-maria")!;
    const pedido = montarPedidoAtendimento(dados, conversa, hoje);
    expect(PedidoAtendimento.safeParse(pedido).success).toBe(true);
    expect(pedido.cliente?.ehCliente).toBe(true);
    expect(pedido.horarios).toHaveLength(2);
    expect(formatarPedidoAtendimento(pedido)).toContain("<horarios_disponiveis>");
  });

  it("se apresenta como atendimento virtual e faz a triagem", () => {
    const resposta = atenderLocal(conversaNova([["cliente", "Boa noite! Fui demitido e não recebi minhas verbas."]]));
    expect(resposta.resposta).toContain("atendimento virtual");
    expect(resposta.resposta).toContain("Quando foi a demissão");
    expect(resposta.acao).toBe("nenhuma");
  });

  it("oferece horários e agenda só o que foi oferecido", () => {
    const primeira = atenderLocal(conversaNova([["cliente", "Fui demitido e não recebi minhas verbas."]]));
    const oferta = atenderLocal(
      conversaNova([
        ["cliente", "Fui demitido e não recebi minhas verbas."],
        ["ia", primeira.resposta],
        ["cliente", "Mês passado, trabalhei 4 anos."],
      ]),
    );
    expect(oferta.resposta).toContain("Qual prefere?");
    expect(oferta.acao).toBe("nenhuma");

    const agendamento = atenderLocal(
      conversaNova([
        ["cliente", "Fui demitido e não recebi minhas verbas."],
        ["ia", primeira.resposta],
        ["cliente", "Mês passado, trabalhei 4 anos."],
        ["ia", oferta.resposta],
        ["cliente", "16h"],
      ]),
    );
    expect(agendamento.acao).toBe("agendar");
    expect(agendamento.horario).toBe("2026-11-25T16:00:00");
  });

  it("não opina sobre valores nem chances", () => {
    const resposta = atenderLocal(conversaNova([["cliente", "Quanto eu vou ganhar de indenização? Vale a pena?"]]));
    expect(resposta.resposta).toContain("quem avalia é o advogado");
    expect(resposta.acao).toBe("nenhuma");
  });

  it("transfere quando a pessoa pede um humano ou fala de pagamento", () => {
    expect(atenderLocal(conversaNova([["cliente", "Quero falar com um advogado agora"]])).acao).toBe("transferir");
    expect(atenderLocal(conversaNova([["cliente", "Preciso da segunda via do boleto"]])).acao).toBe("transferir");
  });

  it("explica o processo para quem já é cliente", () => {
    const conversa = dados.conversas.find((c) => c.id === "cvs-maria")!;
    const pedido = montarPedidoAtendimento(
      dados,
      { ...conversa, mensagens: [{ id: "m", de: "cliente", texto: "Tem novidade do meu processo?", enviadaEm: "2026-11-24T09:00:00" }] },
      hoje,
    );
    const resposta = atenderLocal(pedido);
    expect(resposta.resposta).toContain("recurso");
    expect(resposta.acao).toBe("nenhuma");
  });
});
