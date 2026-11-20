/**
 * Identidade do produto em um só lugar.
 * Para trocar o nome, o WhatsApp de vendas ou os planos, edite apenas este arquivo.
 */
export const MARCA = {
  nome: "JustixUp",
  slogan: "Seu escritório um passo à frente.",
  descricao: "Gestão jurídica com inteligência artificial: casos, prazos, agenda, honorários e atendimento 24h no WhatsApp em um só lugar.",
  /** Número de vendas: recebe os contatos da landing page. */
  whatsapp: {
    e164: "5598970050096",
    exibicao: "(98) 97005-0096",
  },
} as const;

/**
 * Dados legais mostrados na política de privacidade e nos termos de uso.
 * PREENCHA antes de vender: a LGPD pede a identificação de quem responde pelos dados.
 * Campos vazios simplesmente não aparecem nas páginas.
 */
export const LEGAL = {
  /** Razão social (ou nome completo) de quem responde pelo JustixUp. */
  responsavel: "",
  /** CNPJ ou CPF do responsável, já formatado. */
  documento: "",
  /** E-mail do canal de privacidade. Sem ele, o canal é o WhatsApp de vendas. */
  emailPrivacidade: "",
  /** Mude a versão e a data sempre que alterar o texto dos documentos. */
  versao: "1.0",
  vigenteDesde: "2026-11-20",
} as const;

export type IdPlano = "profissional" | "escritorio" | "enterprise";

export interface Plano {
  id: IdPlano;
  nome: string;
  publico: string;
  preco: number;
  /** Texto pequeno acima do preço (ex.: "a partir de"). */
  prefixoPreco?: string;
  sufixoPreco: string;
  destaque: boolean;
  recursos: string[];
}

export const PLANOS: Plano[] = [
  {
    id: "profissional",
    nome: "Profissional",
    publico: "Até 3 usuários",
    preco: 297,
    sufixoPreco: "/mês",
    destaque: false,
    recursos: [
      "Até 200 processos acompanhados",
      "Atendente IA: 300 conversas por mês",
      "Assistente IA do advogado",
      "Financeiro e régua de cobrança",
      "Implantação remota",
    ],
  },
  {
    id: "escritorio",
    nome: "Escritório",
    publico: "Até 10 usuários",
    preco: 597,
    sufixoPreco: "/mês",
    destaque: true,
    recursos: [
      "Até 800 processos acompanhados",
      "2 números de WhatsApp, 1.000 conversas por mês",
      "Portal do cliente (em breve)",
      "NFS-e, repasses e DRE (em breve)",
      "Migração de dados inclusa",
    ],
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    publico: "Usuários ilimitados",
    preco: 1497,
    prefixoPreco: "a partir de",
    sufixoPreco: "/mês",
    destaque: false,
    recursos: [
      "Volumes sob medida",
      "IA ajustada ao acervo do escritório",
      "Multi-filial (em breve) e SLA",
      "Gerente de conta dedicado",
      "Integrações exclusivas",
    ],
  },
];

export const URL_SITE =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
