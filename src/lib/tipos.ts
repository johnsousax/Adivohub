/**
 * Modelo de dados do escritório.
 * Datas "só dia" são strings ISO `AAAA-MM-DD`; datas com hora são ISO completas.
 * Estes tipos espelham as tabelas previstas para o banco (ver docs/PLANO.md).
 */

export type Id = string;

export type Papel = "socio" | "advogado" | "estagiario" | "financeiro";

export interface Usuario {
  id: Id;
  nome: string;
  email: string;
  papel: Papel;
  oab?: string;
}

export type AreaDireito = "previdenciario" | "trabalhista" | "familia" | "consumidor" | "civel";

export const AREAS: Record<AreaDireito, string> = {
  previdenciario: "Previdenciário",
  trabalhista: "Trabalhista",
  familia: "Família",
  consumidor: "Consumidor",
  civel: "Cível",
};

export type OrigemCliente = "indicacao" | "instagram" | "google" | "whatsapp" | "outro";

export const ORIGENS: Record<OrigemCliente, string> = {
  indicacao: "Indicação",
  instagram: "Instagram",
  google: "Google",
  whatsapp: "WhatsApp",
  outro: "Outro",
};

export type EtapaFunil = "novo" | "consulta" | "proposta" | "contrato";

export const ETAPAS_FUNIL: Record<EtapaFunil, string> = {
  novo: "Novo contato",
  consulta: "Consulta agendada",
  proposta: "Proposta enviada",
  contrato: "Contrato em assinatura",
};

export const ORDEM_FUNIL: EtapaFunil[] = ["novo", "consulta", "proposta", "contrato"];

export interface Cliente {
  id: Id;
  tipo: "PF" | "PJ";
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  cidade: string;
  origem: OrigemCliente;
  /** `lead` ainda está no funil; `ativo` já contratou. */
  status: "lead" | "ativo" | "inativo";
  etapaFunil?: EtapaFunil;
  areaInteresse?: AreaDireito;
  responsavelId: Id;
  criadoEm: string;
  observacoes?: string;
}

export type FaseCaso = "inicial" | "instrucao" | "sentenca" | "recurso" | "execucao" | "encerrado";

export const FASES: Record<FaseCaso, string> = {
  inicial: "Inicial",
  instrucao: "Instrução",
  sentenca: "Sentença",
  recurso: "Recurso",
  execucao: "Execução",
  encerrado: "Encerrado",
};

export const ORDEM_FASES: FaseCaso[] = ["inicial", "instrucao", "sentenca", "recurso", "execucao", "encerrado"];

export interface Caso {
  id: Id;
  titulo: string;
  clienteId: Id;
  numeroCNJ?: string;
  area: AreaDireito;
  tipoAcao: string;
  orgao: string;
  parteContraria: string;
  fase: FaseCaso;
  responsavelId: Id;
  valorCausa: number;
  criadoEm: string;
  descricao?: string;
}

export type TipoAndamento = "publicacao" | "andamento" | "nota";

export interface Andamento {
  id: Id;
  casoId: Id;
  data: string;
  tipo: TipoAndamento;
  titulo: string;
  descricao: string;
  /** Resumo em linguagem simples gerado pela IA (publicações). */
  resumoIA?: string;
  /** Prazo sugerido pela IA, aguardando confirmação do advogado. */
  sugestao?: SugestaoPrazo;
}

export interface SugestaoPrazo {
  titulo: string;
  diasUteis: number;
  dataFatal: string;
  dataInterna: string;
  responsavelId: Id;
  estado: "pendente" | "confirmada" | "descartada";
}

export interface Prazo {
  id: Id;
  casoId: Id;
  titulo: string;
  dataFatal: string;
  dataInterna: string;
  responsavelId: Id;
  concluidoEm?: string;
  origem: "manual" | "ia";
}

export type TipoEvento = "audiencia" | "reuniao" | "consulta" | "outro";

export const TIPOS_EVENTO: Record<TipoEvento, string> = {
  audiencia: "Audiência",
  reuniao: "Reunião",
  consulta: "Consulta",
  outro: "Compromisso",
};

export interface Evento {
  id: Id;
  titulo: string;
  tipo: TipoEvento;
  inicio: string;
  fim: string;
  local?: string;
  casoId?: Id;
  clienteId?: Id;
  responsavelId: Id;
  /** Criado pelo atendente de IA a partir de uma conversa. */
  criadoPorIA?: boolean;
}

export type TipoContrato = "fixo" | "parcelado" | "mensal" | "exito" | "hibrido";

export const TIPOS_CONTRATO: Record<TipoContrato, string> = {
  fixo: "Honorário fixo",
  parcelado: "Parcelado",
  mensal: "Mensal (partido)",
  exito: "Êxito",
  hibrido: "Fixo + êxito",
};

export interface Contrato {
  id: Id;
  clienteId: Id;
  casoId?: Id;
  tipo: TipoContrato;
  descricao: string;
  valorTotal: number;
  percentualExito?: number;
  inicio: string;
  ativo: boolean;
}

export type FormaPagamento = "pix" | "boleto" | "cartao" | "transferencia";

export const FORMAS_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão",
  transferencia: "Transferência",
};

export type CategoriaDespesa = "pessoal" | "aluguel" | "sistemas" | "custas" | "marketing" | "outros";

export const CATEGORIAS_DESPESA: Record<CategoriaDespesa, string> = {
  pessoal: "Pessoal",
  aluguel: "Aluguel e estrutura",
  sistemas: "Sistemas",
  custas: "Custas processuais",
  marketing: "Marketing",
  outros: "Outros",
};

export interface Lancamento {
  id: Id;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  vencimento: string;
  pagoEm?: string;
  forma?: FormaPagamento;
  clienteId?: Id;
  casoId?: Id;
  contratoId?: Id;
  categoria?: CategoriaDespesa;
}

export type AutorMensagem = "cliente" | "ia" | "equipe";

export interface Mensagem {
  id: Id;
  de: AutorMensagem;
  texto: string;
  enviadaEm: string;
}

export interface Conversa {
  id: Id;
  nome: string;
  telefone: string;
  clienteId?: Id;
  /** `ia`: o atendente virtual responde; `humano`: a equipe assumiu. */
  modo: "ia" | "humano";
  naoLidas: number;
  mensagens: Mensagem[];
}

export interface Escritorio {
  nome: string;
  cidade: string;
  plano: "essencial" | "crescimento" | "completo";
}

export interface DadosEscritorio {
  escritorio: Escritorio;
  usuarios: Usuario[];
  clientes: Cliente[];
  casos: Caso[];
  andamentos: Andamento[];
  prazos: Prazo[];
  eventos: Evento[];
  contratos: Contrato[];
  lancamentos: Lancamento[];
  conversas: Conversa[];
  /** Dia em que a demonstração foi gerada (AAAA-MM-DD). */
  geradoEm: string;
}
