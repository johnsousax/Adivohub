/**
 * Identidade do produto em um só lugar.
 * Para trocar o nome, o WhatsApp de vendas ou os planos, edite apenas este arquivo.
 */
export const MARCA = {
  nome: "Vade",
  slogan: "Vai com você.",
  descricao: "Gestão jurídica com inteligência artificial: casos, prazos, agenda, honorários e atendimento 24h no WhatsApp em um só lugar.",
  /** Número de vendas: recebe os contatos da landing page. */
  whatsapp: {
    e164: "5598970050096",
    exibicao: "(98) 97005-0096",
  },
} as const;

export type IdPlano = "profissional" | "escritorio" | "enterprise";

export interface Plano {
  id: IdPlano;
  nome: string;
  publico: string;
  preco: number;
  sufixoPreco: string;
  destaque: boolean;
  recursos: string[];
}

export const PLANOS: Plano[] = [
  {
    id: "profissional",
    nome: "Profissional",
    publico: "Até 3 usuários",
    preco: 2197,
    sufixoPreco: "/mês",
    destaque: false,
    recursos: [
      "Até 500 processos acompanhados",
      "Atendente IA: 1.000 conversas por mês",
      "Assistente IA do advogado",
      "Financeiro e régua de cobrança",
      "Implantação remota",
    ],
  },
  {
    id: "escritorio",
    nome: "Escritório",
    publico: "Até 10 usuários",
    preco: 3497,
    sufixoPreco: "/mês",
    destaque: true,
    recursos: [
      "Até 2.000 processos acompanhados",
      "2 números de WhatsApp, 3.000 conversas por mês",
      "Portal do cliente (em breve)",
      "NFS-e, repasses e DRE (em breve)",
      "Migração de dados inclusa",
    ],
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    publico: "Usuários ilimitados",
    preco: 5900,
    sufixoPreco: "+/mês",
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
