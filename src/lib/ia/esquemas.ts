import { z } from "zod";

/**
 * Contratos das rotas de IA. Tudo tem tamanho máximo: o que chega do
 * navegador vira prompt, então nada entra sem limite. Os objetos são estritos:
 * um campo que não está no contrato faz o pedido inteiro ser recusado.
 */

const texto = (maximo: number) => z.string().max(maximo);
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dataHora = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/);

const contagem = z.number().int().nonnegative().max(1_000_000);

const Cobranca = z.strictObject({
  cliente: texto(120),
  descricao: texto(160),
  valor: z.number().finite(),
  vencimento: dia,
});

export const ContextoIA = z.strictObject({
  hoje: dia,
  escritorio: texto(120),
  usuario: texto(120),
  agenda: z.array(z.strictObject({ inicio: dataHora, titulo: texto(160), tipo: texto(30), local: texto(120).optional() })).max(25),
  prazos: z
    .array(
      z.strictObject({
        titulo: texto(160),
        caso: texto(160),
        dataFatal: dia,
        dataInterna: dia,
        responsavel: texto(80),
      }),
    )
    .max(25),
  sugestoes: z.array(z.strictObject({ caso: texto(160), titulo: texto(160), dataFatal: dia, resumo: texto(400) })).max(10),
  financeiro: z.strictObject({
    recebidoMes: z.number().finite(),
    recebidoMesAnterior: z.number().finite(),
    aReceber30Dias: z.number().finite(),
    emAtraso: z.number().finite(),
    inadimplencia: z.number().finite(),
    despesasMes: z.number().finite(),
    atrasados: z.array(Cobranca).max(20),
    proximos: z.array(Cobranca).max(15),
  }),
  /** Totais reais: as listas abaixo são só uma amostra com limite de tamanho. */
  totais: z.strictObject({ casosAtivos: contagem, clientesAtivos: contagem }),
  crm: z.strictObject({
    emAberto: contagem,
    emNegociacao: z.number().finite(),
    quentes: contagem,
    retornosAtrasados: contagem,
    retornosHoje: contagem,
    ganhos: contagem,
    perdidos: contagem,
    taxaConversao: z.number().min(0).max(1).nullable(),
    cicloMedioDias: z.number().int().nonnegative().max(10_000).nullable(),
  }),
  casos: z
    .array(
      z.strictObject({
        titulo: texto(160),
        cliente: texto(120),
        area: texto(40),
        fase: texto(40),
        tipoAcao: texto(160),
        responsavel: texto(80),
        numero: texto(30).optional(),
        ultimoAndamento: texto(300).optional(),
      }),
    )
    .max(40),
  leads: z
    .array(
      z.strictObject({
        nome: texto(120),
        etapa: texto(40),
        area: texto(40).optional(),
        observacoes: texto(300).optional(),
        valorEstimado: z.number().finite().optional(),
        temperatura: texto(20).optional(),
        proximoPasso: texto(200).optional(),
        proximoPassoEm: dia.optional(),
      }),
    )
    .max(20),
  conversasAguardando: z.array(z.strictObject({ nome: texto(120), ultimaMensagem: texto(300) })).max(10),
});
export type ContextoIA = z.infer<typeof ContextoIA>;

export const PedidoAssistente = z.strictObject({
  mensagens: z
    .array(z.strictObject({ papel: z.enum(["usuario", "assistente"]), texto: z.string().min(1).max(4000) }))
    .min(1)
    .max(30),
  contexto: ContextoIA,
});
export type PedidoAssistente = z.infer<typeof PedidoAssistente>;

export const PedidoAtendimento = z.strictObject({
  escritorio: texto(120),
  advogado: texto(80),
  /** Horários livres que a IA pode oferecer para consulta. */
  horarios: z.array(dataHora).max(6),
  cliente: z
    .object({
      nome: texto(120),
      ehCliente: z.boolean(),
      casos: z
        .array(
          z.strictObject({
            titulo: texto(160),
            tipoAcao: texto(160),
            fase: texto(40),
            ultimoAndamento: texto(300).optional(),
          }),
        )
        .max(5),
    })
    .optional(),
  mensagens: z
    .array(z.strictObject({ de: z.enum(["cliente", "ia", "equipe"]), texto: z.string().min(1).max(2000) }))
    .min(1)
    .max(40),
});
export type PedidoAtendimento = z.infer<typeof PedidoAtendimento>;

/** O que o atendente devolve: a mensagem e, se for o caso, uma ação no sistema. */
export const RespostaAtendimento = z.strictObject({
  resposta: z.string(),
  acao: z.enum(["nenhuma", "agendar", "transferir"]),
  /** Preenchido só quando `acao` é "agendar": um dos horários oferecidos. */
  horario: z.string().nullable(),
});
export type RespostaAtendimento = z.infer<typeof RespostaAtendimento>;

export type ModoIA = "claude" | "demo";
