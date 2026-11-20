"use client";

import { createStore, useStore, type StoreApi } from "zustand";
import { paraISO } from "../datas";
import type {
  Andamento,
  AutorMensagem,
  Caso,
  Cliente,
  Contrato,
  Conversa,
  DadosEscritorio,
  Escritorio,
  EtapaFunil,
  Evento,
  FormaPagamento,
  Id,
  Lancamento,
  Prazo,
} from "../tipos";
import { criarSemente } from "./semente";

/**
 * Camada de dados do painel.
 *
 * Enquanto o banco não está conectado, os dados vivem no navegador
 * (localStorage). Todas as telas leem e gravam por aqui, então, para ligar o
 * banco depois, basta trocar o corpo destas ações por chamadas à API —
 * nenhuma tela precisa mudar.
 */

const CHAVE = "justixup:dados:v3";

type NovoRegistro<T> = Omit<T, "id">;

export interface Acoes {
  adicionarCliente(dados: NovoRegistro<Cliente>): Cliente;
  atualizarCliente(id: Id, parcial: Partial<Cliente>): void;
  removerCliente(id: Id): void;
  moverLead(id: Id, etapa: EtapaFunil): void;
  converterLead(id: Id): void;

  adicionarCaso(dados: NovoRegistro<Caso>): Caso;
  atualizarCaso(id: Id, parcial: Partial<Caso>): void;
  removerCaso(id: Id): void;

  adicionarAndamento(dados: NovoRegistro<Andamento>): void;
  responderSugestao(andamentoId: Id, decisao: "confirmada" | "descartada"): void;

  adicionarPrazo(dados: NovoRegistro<Prazo>): void;
  alternarPrazo(id: Id): void;
  removerPrazo(id: Id): void;

  adicionarEvento(dados: NovoRegistro<Evento>): Evento;
  removerEvento(id: Id): void;

  adicionarContrato(dados: NovoRegistro<Contrato>, parcelas: Array<{ valor: number; vencimento: string }>, forma: FormaPagamento): void;
  adicionarLancamento(dados: NovoRegistro<Lancamento>): void;
  marcarPago(id: Id, forma?: FormaPagamento): void;
  desfazerPagamento(id: Id): void;
  removerLancamento(id: Id): void;

  enviarMensagem(conversaId: Id, de: AutorMensagem, texto: string): void;
  definirModoConversa(conversaId: Id, modo: Conversa["modo"]): void;
  marcarConversaLida(conversaId: Id): void;
  /** A IA (ou a própria pessoa) pediu atendimento humano: a equipe assume e a conversa fica pendente. */
  transferirParaEquipe(conversaId: Id): void;
  novaConversa(nome: string, telefone: string, clienteId?: Id): Conversa;

  atualizarEscritorio(parcial: Partial<Escritorio>): void;
  restaurarDemonstracao(): void;
}

export type EstadoLoja = DadosEscritorio & Acoes;

function novoId(prefixo: string): Id {
  return `${prefixo}-${crypto.randomUUID().slice(0, 8)}`;
}

function agoraLocal(): string {
  const agora = new Date();
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${paraISO(agora)}T${dois(agora.getHours())}:${dois(agora.getMinutes())}:${dois(agora.getSeconds())}`;
}

const CAMPOS_DE_DADOS: Array<keyof DadosEscritorio> = [
  "escritorio",
  "usuarios",
  "clientes",
  "casos",
  "andamentos",
  "prazos",
  "eventos",
  "contratos",
  "lancamentos",
  "conversas",
  "geradoEm",
];

function carregar(): DadosEscritorio {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (bruto) {
      const dados = JSON.parse(bruto) as Partial<DadosEscritorio>;
      const completo = CAMPOS_DE_DADOS.every((campo) => dados[campo] !== undefined);
      if (completo) return dados as DadosEscritorio;
    }
  } catch {
    // Armazenamento indisponível ou corrompido: recomeça da demonstração.
  }
  return criarSemente(new Date());
}

function salvar(estado: EstadoLoja) {
  try {
    const dados = Object.fromEntries(CAMPOS_DE_DADOS.map((campo) => [campo, estado[campo]]));
    window.localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    // Sem espaço ou modo privado: segue funcionando só em memória.
  }
}

function criarLoja(): StoreApi<EstadoLoja> {
  const loja = createStore<EstadoLoja>()((set, get) => ({
    ...carregar(),

    adicionarCliente(dados) {
      const cliente: Cliente = { ...dados, id: novoId("cli") };
      set((s) => ({ clientes: [cliente, ...s.clientes] }));
      return cliente;
    },
    atualizarCliente(id, parcial) {
      set((s) => ({ clientes: s.clientes.map((c) => (c.id === id ? { ...c, ...parcial } : c)) }));
    },
    removerCliente(id) {
      set((s) => {
        const casosDoCliente = new Set(s.casos.filter((c) => c.clienteId === id).map((c) => c.id));
        return {
          clientes: s.clientes.filter((c) => c.id !== id),
          casos: s.casos.filter((c) => c.clienteId !== id),
          andamentos: s.andamentos.filter((a) => !casosDoCliente.has(a.casoId)),
          prazos: s.prazos.filter((p) => !casosDoCliente.has(p.casoId)),
          eventos: s.eventos.filter((e) => e.clienteId !== id),
          contratos: s.contratos.filter((c) => c.clienteId !== id),
          lancamentos: s.lancamentos.filter((l) => l.clienteId !== id),
          conversas: s.conversas.map((c) => (c.clienteId === id ? { ...c, clienteId: undefined } : c)),
        };
      });
    },
    moverLead(id, etapa) {
      get().atualizarCliente(id, { etapaFunil: etapa });
    },
    converterLead(id) {
      get().atualizarCliente(id, { status: "ativo", etapaFunil: undefined });
    },

    adicionarCaso(dados) {
      const caso: Caso = { ...dados, id: novoId("cas") };
      set((s) => ({ casos: [caso, ...s.casos] }));
      return caso;
    },
    atualizarCaso(id, parcial) {
      set((s) => ({ casos: s.casos.map((c) => (c.id === id ? { ...c, ...parcial } : c)) }));
    },
    removerCaso(id) {
      set((s) => ({
        casos: s.casos.filter((c) => c.id !== id),
        andamentos: s.andamentos.filter((a) => a.casoId !== id),
        prazos: s.prazos.filter((p) => p.casoId !== id),
        eventos: s.eventos.map((e) => (e.casoId === id ? { ...e, casoId: undefined } : e)),
        lancamentos: s.lancamentos.map((l) => (l.casoId === id ? { ...l, casoId: undefined } : l)),
      }));
    },

    adicionarAndamento(dados) {
      set((s) => ({ andamentos: [{ ...dados, id: novoId("and") }, ...s.andamentos] }));
    },
    responderSugestao(andamentoId, decisao) {
      const andamento = get().andamentos.find((a) => a.id === andamentoId);
      if (!andamento?.sugestao || andamento.sugestao.estado !== "pendente") return;
      const sugestao = andamento.sugestao;
      set((s) => ({
        andamentos: s.andamentos.map((a) => (a.id === andamentoId ? { ...a, sugestao: { ...sugestao, estado: decisao } } : a)),
        prazos:
          decisao === "confirmada"
            ? [
                {
                  id: novoId("prz"),
                  casoId: andamento.casoId,
                  titulo: sugestao.titulo,
                  dataFatal: sugestao.dataFatal,
                  dataInterna: sugestao.dataInterna,
                  responsavelId: sugestao.responsavelId,
                  origem: "ia" as const,
                },
                ...s.prazos,
              ]
            : s.prazos,
      }));
    },

    adicionarPrazo(dados) {
      set((s) => ({ prazos: [{ ...dados, id: novoId("prz") }, ...s.prazos] }));
    },
    alternarPrazo(id) {
      const hoje = paraISO(new Date());
      set((s) => ({
        prazos: s.prazos.map((p) => (p.id === id ? { ...p, concluidoEm: p.concluidoEm ? undefined : hoje } : p)),
      }));
    },
    removerPrazo(id) {
      set((s) => ({ prazos: s.prazos.filter((p) => p.id !== id) }));
    },

    adicionarEvento(dados) {
      const evento: Evento = { ...dados, id: novoId("evt") };
      set((s) => ({ eventos: [...s.eventos, evento] }));
      return evento;
    },
    removerEvento(id) {
      set((s) => ({ eventos: s.eventos.filter((e) => e.id !== id) }));
    },

    adicionarContrato(dados, parcelas, forma) {
      const contrato: Contrato = { ...dados, id: novoId("ctr") };
      const novos: Lancamento[] = parcelas.map((parcela, indice) => ({
        id: novoId("lan"),
        tipo: "receita",
        descricao: parcelas.length > 1 ? `${contrato.descricao} — parcela ${indice + 1}/${parcelas.length}` : contrato.descricao,
        valor: parcela.valor,
        vencimento: parcela.vencimento,
        forma,
        clienteId: contrato.clienteId,
        casoId: contrato.casoId,
        contratoId: contrato.id,
      }));
      set((s) => ({ contratos: [contrato, ...s.contratos], lancamentos: [...novos, ...s.lancamentos] }));
    },
    adicionarLancamento(dados) {
      set((s) => ({ lancamentos: [{ ...dados, id: novoId("lan") }, ...s.lancamentos] }));
    },
    marcarPago(id, forma) {
      const hoje = paraISO(new Date());
      set((s) => ({
        lancamentos: s.lancamentos.map((l) => (l.id === id ? { ...l, pagoEm: hoje, forma: forma ?? l.forma } : l)),
      }));
    },
    desfazerPagamento(id) {
      set((s) => ({ lancamentos: s.lancamentos.map((l) => (l.id === id ? { ...l, pagoEm: undefined } : l)) }));
    },
    removerLancamento(id) {
      set((s) => ({ lancamentos: s.lancamentos.filter((l) => l.id !== id) }));
    },

    enviarMensagem(conversaId, de, texto) {
      const limpo = texto.trim();
      if (!limpo) return;
      set((s) => ({
        conversas: s.conversas.map((c) =>
          c.id === conversaId
            ? {
                ...c,
                naoLidas: de === "cliente" && c.modo === "humano" ? c.naoLidas + 1 : de === "equipe" ? 0 : c.naoLidas,
                mensagens: [...c.mensagens, { id: novoId("msg"), de, texto: limpo, enviadaEm: agoraLocal() }],
              }
            : c,
        ),
      }));
    },
    definirModoConversa(conversaId, modo) {
      set((s) => ({ conversas: s.conversas.map((c) => (c.id === conversaId ? { ...c, modo } : c)) }));
    },
    marcarConversaLida(conversaId) {
      set((s) => ({ conversas: s.conversas.map((c) => (c.id === conversaId ? { ...c, naoLidas: 0 } : c)) }));
    },
    transferirParaEquipe(conversaId) {
      set((s) => ({
        conversas: s.conversas.map((c) => (c.id === conversaId ? { ...c, modo: "humano", naoLidas: c.naoLidas + 1 } : c)),
      }));
    },
    novaConversa(nome, telefone, clienteId) {
      const conversa: Conversa = { id: novoId("cvs"), nome, telefone, clienteId, modo: "ia", naoLidas: 0, mensagens: [] };
      set((s) => ({ conversas: [conversa, ...s.conversas] }));
      return conversa;
    },

    atualizarEscritorio(parcial) {
      set((s) => ({ escritorio: { ...s.escritorio, ...parcial } }));
    },
    restaurarDemonstracao() {
      set(criarSemente(new Date()));
    },
  }));

  loja.subscribe(salvar);
  return loja;
}

let instancia: StoreApi<EstadoLoja> | null = null;

/** A loja só existe no navegador; é criada no primeiro uso. */
export function obterLoja(): StoreApi<EstadoLoja> {
  if (!instancia) instancia = criarLoja();
  return instancia;
}

/**
 * Lê um pedaço do estado. O seletor deve devolver uma referência estável
 * (um campo do estado ou uma ação); derivações ficam em `useMemo` na tela.
 */
export function useLoja<T>(seletor: (estado: EstadoLoja) => T): T {
  return useStore(obterLoja(), seletor);
}

/** Fotografia dos dados (sem as ações), para montar o contexto da IA. */
export function fotografarDados(): DadosEscritorio {
  const estado = obterLoja().getState();
  return Object.fromEntries(CAMPOS_DE_DADOS.map((campo) => [campo, estado[campo]])) as unknown as DadosEscritorio;
}
