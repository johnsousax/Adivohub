import { addDays } from "date-fns";
import { paraISO, proximoDiaUtil, somarDiasUteis } from "../datas";
import { resumoCRM } from "../dados/crm";
import { prazosAbertos, resumoFinanceiro, sugestoesPendentes } from "../dados/metricas";
import { AREAS, ETAPAS_FUNIL, FASES, TEMPERATURAS, TIPOS_EVENTO, type Conversa, type DadosEscritorio } from "../tipos";
import type { ContextoIA, PedidoAtendimento } from "./esquemas";

/**
 * Monta, no navegador, o resumo dos dados que a IA pode consultar.
 * Enquanto não há banco, é assim que o servidor "enxerga" o escritório:
 * o painel envia só o necessário, já com limites de tamanho.
 */

function cortar(texto: string, maximo: number): string {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto;
}

export function montarContextoIA(dados: DadosEscritorio, hoje: Date, usuario: string): ContextoIA {
  const hojeISO = paraISO(hoje);
  const limiteAgenda = `${paraISO(addDays(hoje, 14))}T23:59:59`;
  const nomeUsuario = new Map(dados.usuarios.map((u) => [u.id, u.nome]));
  const nomeCliente = new Map(dados.clientes.map((c) => [c.id, c.nome]));
  const tituloCaso = new Map(dados.casos.map((c) => [c.id, c.titulo]));
  const resumo = resumoFinanceiro(dados.lancamentos, hoje);
  const receitasAbertas = dados.lancamentos
    .filter((l) => l.tipo === "receita" && !l.pagoEm)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  const cobranca = (l: (typeof receitasAbertas)[number]) => ({
    cliente: cortar((l.clienteId && nomeCliente.get(l.clienteId)) || "Sem cliente", 120),
    descricao: cortar(l.descricao, 160),
    valor: l.valor,
    vencimento: l.vencimento,
  });

  return {
    hoje: hojeISO,
    escritorio: cortar(dados.escritorio.nome, 120),
    usuario: cortar(usuario, 120),
    agenda: dados.eventos
      .filter((e) => e.inicio >= `${hojeISO}T00:00:00` && e.inicio <= limiteAgenda)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .slice(0, 25)
      .map((e) => ({
        inicio: e.inicio,
        titulo: cortar(e.titulo, 160),
        tipo: TIPOS_EVENTO[e.tipo],
        local: e.local ? cortar(e.local, 120) : undefined,
      })),
    prazos: prazosAbertos(dados.prazos)
      .slice(0, 25)
      .map((p) => ({
        titulo: cortar(p.titulo, 160),
        caso: cortar(tituloCaso.get(p.casoId) ?? "Caso removido", 160),
        dataFatal: p.dataFatal,
        dataInterna: p.dataInterna,
        responsavel: cortar(nomeUsuario.get(p.responsavelId) ?? "—", 80),
      })),
    sugestoes: sugestoesPendentes(dados.andamentos)
      .slice(0, 10)
      .map((a) => ({
        caso: cortar(tituloCaso.get(a.casoId) ?? "Caso removido", 160),
        titulo: cortar(a.sugestao!.titulo, 160),
        dataFatal: a.sugestao!.dataFatal,
        resumo: cortar(a.resumoIA ?? a.titulo, 400),
      })),
    financeiro: {
      recebidoMes: resumo.recebidoMes,
      recebidoMesAnterior: resumo.recebidoMesAnterior,
      aReceber30Dias: resumo.aReceber30Dias,
      emAtraso: resumo.emAtraso,
      inadimplencia: resumo.inadimplencia,
      despesasMes: resumo.despesasMes,
      atrasados: receitasAbertas
        .filter((l) => l.vencimento < hojeISO)
        .slice(0, 20)
        .map(cobranca),
      proximos: receitasAbertas
        .filter((l) => l.vencimento >= hojeISO)
        .slice(0, 15)
        .map(cobranca),
    },
    totais: {
      casosAtivos: dados.casos.filter((c) => c.fase !== "encerrado").length,
      clientesAtivos: dados.clientes.filter((c) => c.status === "ativo").length,
    },
    crm: resumoCRM(dados.clientes, hoje),
    casos: dados.casos
      .filter((c) => c.fase !== "encerrado")
      .slice(0, 40)
      .map((c) => {
        const ultimo = dados.andamentos.filter((a) => a.casoId === c.id).sort((a, b) => b.data.localeCompare(a.data))[0];
        return {
          titulo: cortar(c.titulo, 160),
          cliente: cortar(nomeCliente.get(c.clienteId) ?? "—", 120),
          area: AREAS[c.area],
          fase: FASES[c.fase],
          tipoAcao: cortar(c.tipoAcao, 160),
          responsavel: cortar(nomeUsuario.get(c.responsavelId) ?? "—", 80),
          numero: c.numeroCNJ,
          ultimoAndamento: ultimo ? cortar(`${ultimo.data}: ${ultimo.titulo}`, 300) : undefined,
        };
      }),
    // Quem tem retorno mais perto vem primeiro: é o que a equipe precisa resolver.
    leads: dados.clientes
      .filter((c) => c.status === "lead")
      .sort((a, b) => (a.proximoPasso?.data ?? "9999").localeCompare(b.proximoPasso?.data ?? "9999"))
      .slice(0, 20)
      .map((c) => ({
        nome: cortar(c.nome, 120),
        etapa: c.etapaFunil ? ETAPAS_FUNIL[c.etapaFunil] : "Novo contato",
        area: c.areaInteresse ? AREAS[c.areaInteresse] : undefined,
        observacoes: c.observacoes ? cortar(c.observacoes, 300) : undefined,
        valorEstimado: c.valorEstimado,
        temperatura: c.temperatura ? TEMPERATURAS[c.temperatura] : undefined,
        proximoPasso: c.proximoPasso ? cortar(c.proximoPasso.descricao, 200) : undefined,
        proximoPassoEm: c.proximoPasso?.data,
      })),
    conversasAguardando: dados.conversas
      .filter((c) => c.naoLidas > 0)
      .slice(0, 10)
      .map((c) => ({
        nome: cortar(c.nome, 120),
        ultimaMensagem: cortar(c.mensagens[c.mensagens.length - 1]?.texto ?? "", 300),
      })),
  };
}

/** Dois horários de consulta no próximo dia útil livre (10h e 16h). */
export function horariosDeConsulta(dados: DadosEscritorio, hoje: Date): string[] {
  const ocupados = new Set(dados.eventos.map((e) => e.inicio.slice(0, 16)));
  let dia = somarDiasUteis(proximoDiaUtil(hoje), 1);
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const opcoes = ["10:00", "16:00"].map((hora) => `${paraISO(dia)}T${hora}:00`);
    const livres = opcoes.filter((opcao) => !ocupados.has(opcao.slice(0, 16)));
    if (livres.length === 2) return livres;
    dia = somarDiasUteis(dia, 1);
  }
  return ["10:00", "16:00"].map((hora) => `${paraISO(dia)}T${hora}:00`);
}

/** Pedido para o atendente responder à última mensagem de uma conversa. */
export function montarPedidoAtendimento(dados: DadosEscritorio, conversa: Conversa, hoje: Date): PedidoAtendimento {
  const cliente = conversa.clienteId ? dados.clientes.find((c) => c.id === conversa.clienteId) : undefined;
  const responsavel = dados.usuarios.find((u) => u.id === cliente?.responsavelId) ?? dados.usuarios[0];
  const casos = cliente ? dados.casos.filter((c) => c.clienteId === cliente.id && c.fase !== "encerrado") : [];

  return {
    escritorio: cortar(dados.escritorio.nome, 120),
    advogado: cortar(responsavel?.nome ?? "o advogado", 80),
    horarios: horariosDeConsulta(dados, hoje),
    cliente: cliente
      ? {
          nome: cortar(cliente.nome, 120),
          ehCliente: cliente.status === "ativo",
          casos: casos.slice(0, 5).map((c) => {
            const ultimo = dados.andamentos.filter((a) => a.casoId === c.id).sort((a, b) => b.data.localeCompare(a.data))[0];
            return {
              titulo: cortar(c.titulo, 160),
              tipoAcao: cortar(c.tipoAcao, 160),
              fase: FASES[c.fase],
              ultimoAndamento: ultimo ? cortar(ultimo.resumoIA ?? ultimo.titulo, 300) : undefined,
            };
          }),
        }
      : undefined,
    mensagens: conversa.mensagens.slice(-40).map((m) => ({ de: m.de, texto: cortar(m.texto, 2000) })),
  };
}
