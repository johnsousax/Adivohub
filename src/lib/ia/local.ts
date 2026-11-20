import { differenceInCalendarDays, parseISO } from "date-fns";
import { brl, dataSemana, hora, percentual, relativo } from "../formatos";
import type { ContextoIA, PedidoAtendimento, RespostaAtendimento } from "./esquemas";

/**
 * Respostas do "modo demonstração": regras simples, sem IA generativa.
 * Usadas quando não há chave da API configurada (ou se a API falhar), para o
 * produto continuar utilizável. As mesmas perguntas, com a chave ligada, são
 * respondidas pelo Claude com muito mais flexibilidade.
 */

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function contem(texto: string, padrao: RegExp): boolean {
  return padrao.test(texto);
}

/* -------------------------------------------------------------------------- */
/* Assistente do advogado                                                     */
/* -------------------------------------------------------------------------- */

function linhaPrazo(p: ContextoIA["prazos"][number], hoje: Date): string {
  return `- **${dataSemana(p.dataFatal)}** (${relativo(p.dataFatal, hoje)}) — ${p.titulo}, ${p.caso} · ${p.responsavel}`;
}

function linhaEvento(e: ContextoIA["agenda"][number]): string {
  return `- **${dataSemana(e.inicio)} às ${hora(e.inicio)}** — ${e.titulo}${e.local ? ` · ${e.local}` : ""}`;
}

function linhaCobranca(c: ContextoIA["financeiro"]["atrasados"][number], hoje: Date): string {
  return `- **${brl(c.valor)}** — ${c.cliente}, ${c.descricao} (venceu ${relativo(c.vencimento, hoje)})`;
}

function briefing(ctx: ContextoIA, hoje: Date): string {
  const doDia = ctx.agenda.filter((e) => e.inicio.startsWith(ctx.hoje));
  const prazosHoje = ctx.prazos.filter((p) => p.dataFatal === ctx.hoje);
  const atrasados = ctx.prazos.filter((p) => p.dataFatal < ctx.hoje);
  const partes: string[] = [`Resumo de hoje, ${dataSemana(ctx.hoje)}:`];

  partes.push(
    doDia.length
      ? `**Agenda (${doDia.length})**\n${doDia.map((e) => `- **${hora(e.inicio)}** — ${e.titulo}`).join("\n")}`
      : "**Agenda** — nenhum compromisso hoje.",
  );
  if (prazosHoje.length)
    partes.push(`**Prazos que vencem hoje (${prazosHoje.length})**\n${prazosHoje.map((p) => linhaPrazo(p, hoje)).join("\n")}`);
  if (atrasados.length) partes.push(`**Prazos atrasados (${atrasados.length})**\n${atrasados.map((p) => linhaPrazo(p, hoje)).join("\n")}`);
  if (!prazosHoje.length && !atrasados.length) partes.push("**Prazos** — nada vence hoje.");
  if (ctx.sugestoes.length) {
    partes.push(
      `**Publicações aguardando sua confirmação (${ctx.sugestoes.length})**\n${ctx.sugestoes
        .map((s) => `- ${s.caso}: ${s.titulo}, vencimento sugerido em **${dataSemana(s.dataFatal)}**`)
        .join("\n")}`,
    );
  }
  partes.push(
    `**Financeiro** — ${brl(ctx.financeiro.recebidoMes)} recebidos no mês; ${brl(ctx.financeiro.emAtraso)} em atraso (${ctx.financeiro.atrasados.length} ${ctx.financeiro.atrasados.length === 1 ? "parcela" : "parcelas"}).`,
  );
  if (ctx.conversasAguardando.length) {
    partes.push(
      `**Atendimento** — ${ctx.conversasAguardando.length} conversa(s) esperando a equipe: ${ctx.conversasAguardando.map((c) => c.nome).join(", ")}.`,
    );
  }
  return partes.join("\n\n");
}

function responderPrazos(pergunta: string, ctx: ContextoIA, hoje: Date): string {
  let lista = ctx.prazos;
  let titulo = "Prazos em aberto";
  if (contem(pergunta, /atrasad|vencid/)) {
    lista = lista.filter((p) => p.dataFatal < ctx.hoje);
    titulo = "Prazos atrasados";
  } else if (contem(pergunta, /hoje/)) {
    lista = lista.filter((p) => p.dataFatal === ctx.hoje);
    titulo = "Prazos que vencem hoje";
  } else if (contem(pergunta, /amanha/)) {
    lista = lista.filter((p) => differenceInCalendarDays(parseISO(p.dataFatal), hoje) === 1);
    titulo = "Prazos que vencem amanhã";
  } else if (contem(pergunta, /semana|proximos dias/)) {
    lista = lista.filter((p) => {
      const dias = differenceInCalendarDays(parseISO(p.dataFatal), hoje);
      return dias >= 0 && dias <= 7;
    });
    titulo = "Prazos dos próximos 7 dias";
  }
  if (!lista.length) return `${titulo}: nenhum.`;
  return `**${titulo} (${lista.length})**\n${lista.map((p) => linhaPrazo(p, hoje)).join("\n")}`;
}

function responderAgenda(pergunta: string, ctx: ContextoIA, hoje: Date): string {
  let lista = ctx.agenda;
  let titulo = "Próximos compromissos";
  if (contem(pergunta, /amanha/)) {
    lista = lista.filter((e) => differenceInCalendarDays(parseISO(e.inicio), hoje) === 1);
    titulo = "Agenda de amanhã";
  } else if (contem(pergunta, /hoje/)) {
    lista = lista.filter((e) => e.inicio.startsWith(ctx.hoje));
    titulo = "Agenda de hoje";
  } else if (contem(pergunta, /semana/)) {
    lista = lista.filter((e) => differenceInCalendarDays(parseISO(e.inicio), hoje) <= 7);
    titulo = "Agenda dos próximos 7 dias";
  }
  if (contem(pergunta, /audiencia/)) {
    lista = lista.filter((e) => e.tipo === "Audiência");
    titulo = titulo.replace("compromissos", "audiências").replace("Agenda", "Audiências");
  }
  if (!lista.length) return `${titulo}: nada marcado.`;
  return `**${titulo} (${lista.length})**\n${lista.slice(0, 12).map(linhaEvento).join("\n")}`;
}

function responderFinanceiro(pergunta: string, ctx: ContextoIA, hoje: Date): string {
  const f = ctx.financeiro;
  if (contem(pergunta, /atras|inadimpl|deve|devendo|cobrar|cobranca/)) {
    if (!f.atrasados.length) return "Nenhuma parcela em atraso no momento.";
    return `**Em atraso: ${brl(f.emAtraso)}** (inadimplência de ${percentual(f.inadimplencia)} sobre o que venceu em 90 dias)\n${f.atrasados
      .map((c) => linhaCobranca(c, hoje))
      .join("\n")}\n\nNa tela Financeiro você cobra cada uma pelo WhatsApp com um clique.`;
  }
  if (contem(pergunta, /a receber|vai entrar|proxim|previs/)) {
    if (!f.proximos.length) return "Não há parcelas a vencer cadastradas.";
    return `**A receber nos próximos 30 dias: ${brl(f.aReceber30Dias)}**\n${f.proximos
      .slice(0, 8)
      .map((c) => `- **${dataSemana(c.vencimento)}** — ${brl(c.valor)}, ${c.cliente}`)
      .join("\n")}`;
  }
  const variacao =
    f.recebidoMesAnterior > 0
      ? ` (${f.recebidoMes >= f.recebidoMesAnterior ? "+" : "−"}${percentual(Math.abs(f.recebidoMes / f.recebidoMesAnterior - 1), 0)} contra o mês anterior)`
      : "";
  return [
    "**Financeiro do mês**",
    `- Recebido: **${brl(f.recebidoMes)}**${variacao}`,
    `- A receber em 30 dias: **${brl(f.aReceber30Dias)}**`,
    `- Em atraso: **${brl(f.emAtraso)}** (${f.atrasados.length} ${f.atrasados.length === 1 ? "parcela" : "parcelas"})`,
    `- Despesas do mês: **${brl(f.despesasMes)}**`,
    `- Resultado até agora: **${brl(f.recebidoMes - f.despesasMes)}**`,
  ].join("\n");
}

function encontrarCaso(pergunta: string, ctx: ContextoIA) {
  const ignoradas = new Set(["para", "como", "esta", "caso", "processo", "sobre", "contra", "ltda", "inss", "banco", "defesa"]);
  let melhor: { caso: ContextoIA["casos"][number]; pontos: number } | null = null;
  for (const caso of ctx.casos) {
    const termos = normalizar(`${caso.titulo} ${caso.cliente}`)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 4 && !ignoradas.has(t));
    const pontos = new Set(termos.filter((t) => pergunta.includes(t))).size;
    if (pontos > 0 && (!melhor || pontos > melhor.pontos)) melhor = { caso, pontos };
  }
  return melhor?.caso ?? null;
}

function responderCaso(caso: ContextoIA["casos"][number], ctx: ContextoIA, hoje: Date): string {
  const prazos = ctx.prazos.filter((p) => p.caso === caso.titulo);
  const linhas = [
    `**${caso.titulo}** — ${caso.tipoAcao}`,
    `- Cliente: ${caso.cliente}`,
    `- Área e fase: ${caso.area}, ${caso.fase}`,
    `- Responsável: ${caso.responsavel}`,
  ];
  if (caso.numero) linhas.push(`- Processo: ${caso.numero}`);
  if (caso.ultimoAndamento)
    linhas.push(`- Último andamento: ${caso.ultimoAndamento.replace(/^(\d{4}-\d{2}-\d{2}): /, (_, d: string) => `${dataSemana(d)} — `)}`);
  linhas.push(
    prazos.length ? `- Prazos em aberto:\n${prazos.map((p) => `  ${linhaPrazo(p, hoje)}`).join("\n")}` : "- Sem prazos em aberto.",
  );
  return linhas.join("\n");
}

function responderLeads(ctx: ContextoIA): string {
  if (!ctx.leads.length) return "Nenhum contato no funil de captação agora.";
  return `**Funil de captação (${ctx.leads.length})**\n${ctx.leads
    .map((l) => `- **${l.nome}** — ${l.etapa}${l.area ? `, ${l.area}` : ""}${l.observacoes ? `. ${l.observacoes}` : ""}`)
    .join("\n")}`;
}

const AJUDA = [
  "Consigo responder sobre os dados do escritório. Experimente:",
  "- “Resumo do meu dia”",
  "- “Quais prazos vencem esta semana?”",
  "- “Quem está com parcela em atraso?”",
  "- “Como está o caso Ferreira?”",
  "- “Como está o funil de novos clientes?”",
].join("\n");

export function responderAssistenteLocal(perguntaOriginal: string, ctx: ContextoIA): string {
  const pergunta = normalizar(perguntaOriginal);
  const hoje = parseISO(ctx.hoje);

  if (contem(pergunta, /resumo|briefing|bom dia|meu dia|o que (eu )?tenho/)) return briefing(ctx, hoje);
  if (contem(pergunta, /prazo|fatal|vence/) && !contem(pergunta, /parcela|boleto|pagament/)) return responderPrazos(pergunta, ctx, hoje);

  const caso = encontrarCaso(pergunta, ctx);
  if (caso && !contem(pergunta, /agenda|audiencia/)) return responderCaso(caso, ctx, hoje);

  if (contem(pergunta, /agenda|audiencia|compromisso|reuniao|consulta|amanha/)) return responderAgenda(pergunta, ctx, hoje);
  if (contem(pergunta, /receb|fatur|financ|inadimpl|atras|cobran|deve|caixa|despesa|parcela|dinheiro|honorario/))
    return responderFinanceiro(pergunta, ctx, hoje);
  if (contem(pergunta, /lead|funil|capta|novos? client|contatos? novo/)) return responderLeads(ctx);
  if (contem(pergunta, /sugest|publicac|intimac/)) {
    if (!ctx.sugestoes.length) return "Nenhuma publicação aguardando confirmação.";
    return `**Publicações aguardando confirmação (${ctx.sugestoes.length})**\n${ctx.sugestoes
      .map((s) => `- **${s.caso}** — ${s.resumo} Prazo sugerido: ${s.titulo} até **${dataSemana(s.dataFatal)}**.`)
      .join("\n")}\n\nConfirme ou descarte cada uma na tela Prazos.`;
  }
  if (contem(pergunta, /conversa|whatsapp|atendimento|aguardando|mensage/)) {
    if (!ctx.conversasAguardando.length) return "Nenhuma conversa esperando a equipe. O atendente virtual está cuidando das demais.";
    return `**Conversas esperando a equipe (${ctx.conversasAguardando.length})**\n${ctx.conversasAguardando
      .map((c) => `- **${c.nome}**: “${c.ultimaMensagem}”`)
      .join("\n")}`;
  }
  if (contem(pergunta, /hoje/)) return briefing(ctx, hoje);
  return AJUDA;
}

/* -------------------------------------------------------------------------- */
/* Atendente de clientes                                                      */
/* -------------------------------------------------------------------------- */

const PERGUNTAS_POR_AREA: Array<{ padrao: RegExp; pergunta: string }> = [
  {
    padrao: /demit|demiss|verbas|rescis|carteira|hora extra|patrao|salario atrasad|trabalh/,
    pergunta: "Atendemos, sim. Quando foi a demissão e quanto tempo você trabalhou lá?",
  },
  {
    padrao: /aposent|inss|beneficio|auxilio|pericia|bpc|loas/,
    pergunta: "Atendemos, sim. O pedido foi negado pelo INSS? Se sim, em que mês veio a resposta?",
  },
  {
    padrao: /divorc|pensao|guarda|inventario|heranca|separac/,
    pergunta: "Atendemos, sim. Para o advogado entender melhor: há filhos menores ou bens a dividir?",
  },
  {
    padrao: /banco|cartao|cobranca|nome sujo|negativ|emprestimo|plano de saude|seguro|produto|voo|compra/,
    pergunta: "Atendemos, sim: é um caso de direito do consumidor. Quando aconteceu e de quanto é o valor envolvido?",
  },
];

function descreverHorario(dataHoraISO: string): string {
  const horas = hora(dataHoraISO);
  return `${dataSemana(dataHoraISO)} às ${horas.endsWith(":00") ? `${Number(horas.slice(0, 2))}h` : horas}`;
}

function horarioEscolhido(mensagem: string, horarios: string[]): string | null {
  for (const horario of horarios) {
    const horaCheia = String(Number(horario.slice(11, 13)));
    if (new RegExp(`(^|\\D)${horaCheia}( ?h|:00|$|\\D)`).test(mensagem)) return horario;
  }
  if (horarios[0] && contem(mensagem, /manha|primeir|cedo/)) return horarios[0];
  if (horarios[1] && contem(mensagem, /tarde|segund|depois do almoco/)) return horarios[1];
  return null;
}

export function atenderLocal(pedido: PedidoAtendimento): RespostaAtendimento {
  const mensagensCliente = pedido.mensagens.filter((m) => m.de === "cliente");
  const ultima = normalizar(mensagensCliente[mensagensCliente.length - 1]?.texto ?? "");
  const respostasIA = pedido.mensagens.filter((m) => m.de === "ia");
  const ultimaIA = normalizar(respostasIA[respostasIA.length - 1]?.texto ?? "");
  const primeiraVez = respostasIA.length === 0;
  const apresentacao = primeiraVez ? `Olá! Aqui é o atendimento virtual do ${pedido.escritorio}. ` : "";
  const ofertaHorarios =
    pedido.horarios.length >= 2 ? `${descreverHorario(pedido.horarios[0])} ou ${descreverHorario(pedido.horarios[1])}` : null;
  const ofertouHorarios = contem(ultimaIA, /qual (horario )?prefere|qual dos horarios/);

  const responder = (resposta: string, acao: RespostaAtendimento["acao"] = "nenhuma", horario: string | null = null) => ({
    resposta: `${apresentacao}${resposta}`,
    acao,
    horario,
  });

  // 1. Pediu uma pessoa: transfere sem insistir.
  if (contem(ultima, /(falar|atend|conversar).*(advogad|humano|pessoa|alguem|atendente)|advogad[oa] agora|atendente/)) {
    return responder("Claro! Já avisei a equipe e alguém continua com você por aqui em instantes.", "transferir");
  }

  // 2. Escolheu um dos horários oferecidos.
  if (ofertouHorarios) {
    const escolhido = horarioEscolhido(ultima, pedido.horarios);
    if (escolhido) {
      return responder(
        `Agendado para ${descreverHorario(escolhido)}, com ${pedido.advogado} (online). Eu lembro você 1 hora antes. Se puder, envie por aqui os documentos que tiver sobre o caso.`,
        "agendar",
        escolhido,
      );
    }
  }

  // 3. Cliente perguntando do processo.
  if (
    pedido.cliente?.ehCliente &&
    pedido.cliente.casos.length &&
    contem(ultima, /processo|andamento|novidade|como (esta|anda)|situac|noticia/)
  ) {
    const caso = pedido.cliente.casos[0];
    const detalhe = caso.ultimoAndamento ? ` A última movimentação foi: ${caso.ultimoAndamento}` : "";
    return responder(
      `O processo (${caso.tipoAcao.toLowerCase()}) está na fase de ${caso.fase.toLowerCase()}.${detalhe} ${pedido.advogado} está acompanhando, e eu aviso por aqui assim que houver novidade.`,
    );
  }

  // 4. Pergunta de mérito: quem avalia é o advogado.
  if (contem(ultima, /quanto (eu )?(vou|posso|consigo)|tenho direito|vou ganhar|chance|vale a pena|indeniza|ganho de causa/)) {
    return responder(
      ofertaHorarios
        ? `Valores e chances quem avalia é o advogado, depois de ver os documentos. Posso agendar uma consulta com ${pedido.advogado}: tenho ${ofertaHorarios}. Qual prefere?`
        : "Valores e chances quem avalia é o advogado, depois de ver os documentos. Vou pedir para a equipe falar com você.",
      ofertaHorarios ? "nenhuma" : "transferir",
    );
  }

  // 5. Pagamentos vão para o financeiro.
  if (contem(ultima, /boleto|pix|pagar|pagament|parcela|segunda via/)) {
    return responder("Vou pedir para o financeiro falar com você por aqui e enviar os dados de pagamento.", "transferir");
  }

  // 6. Agradecimento ou encerramento.
  if (contem(ultima, /^(ok|certo|combinado|obrigad|valeu|perfeito|beleza|show|ta bom|tudo bem)[\s!.,a-z]*$/)) {
    return responder("Por nada! Se precisar, é só chamar por aqui.");
  }

  // 7. Triagem: primeiro entende a área, depois oferece horários.
  const area = PERGUNTAS_POR_AREA.find((a) => a.padrao.test(ultima));
  const jaPerguntou = respostasIA.some((m) =>
    PERGUNTAS_POR_AREA.some((a) => a.pergunta === m.texto.replace(/^Olá! Aqui é o atendimento virtual do .*?\. /, "")),
  );
  if (area && !jaPerguntou) return responder(area.pergunta);
  if ((jaPerguntou || mensagensCliente.length >= 2) && ofertaHorarios && !ofertouHorarios) {
    return responder(`Perfeito! ${pedido.advogado} tem horário ${ofertaHorarios} (online). Qual prefere?`);
  }
  if (ofertouHorarios && ofertaHorarios) {
    return responder(
      `Sem problema. Os horários livres são ${ofertaHorarios}. Qual dos horários fica melhor? Se nenhum servir, peço para a equipe combinar outro com você.`,
    );
  }
  if (contem(ultima, /^(oi+|ola|bom dia|boa tarde|boa noite|opa|e ai)[\s!.,]*$/)) {
    return responder("Como posso ajudar? Pode me contar em poucas palavras o que aconteceu.");
  }
  return responder("Entendi. Para o advogado avaliar, pode me contar um pouco mais do que aconteceu e quando foi?");
}
