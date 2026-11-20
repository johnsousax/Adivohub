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
    e164: "5598983385000",
    exibicao: "(98) 98338-5000",
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

export type IdPlano = "essencial" | "crescimento" | "completo";

export interface Plano {
  id: IdPlano;
  nome: string;
  /** Uma linha sobre para quem é o plano. */
  descricao: string;
  /** Mensalidade em reais. */
  preco: number;
  destaque: boolean;
  /** Plano anterior cujos itens este inclui ("Tudo do Essencial"). */
  inclui?: string;
  recursos: string[];
}

/**
 * Planos da proposta comercial. A mensalidade é fixa e não há taxa de implantação.
 * A verba de anúncios dos planos com tráfego pago é paga direto às plataformas.
 */
export const PLANOS: Plano[] = [
  {
    id: "essencial",
    nome: "Essencial",
    descricao: "O sistema completo para organizar o escritório.",
    preco: 2999,
    destaque: false,
    recursos: [
      `${MARCA.nome} completo e configurado`,
      "Áreas: professor, bancário, previdenciário e trabalhista",
      "Cadastro inicial de clientes e processos",
      "Treinamento da equipe",
      "Hospedagem, manutenção e atualizações",
      "Suporte via WhatsApp",
    ],
  },
  {
    id: "crescimento",
    nome: "Crescimento",
    descricao: "Sistema, presença digital e anúncios para atrair clientes.",
    preco: 4497,
    destaque: false,
    inclui: "Essencial",
    recursos: [
      "Aplicativo do escritório",
      "Site profissional com página para cada área",
      "Tráfego pago no Meta e no Google",
      "Relatório mensal de resultados",
      "Anúncios dentro das normas da OAB",
    ],
  },
  {
    id: "completo",
    nome: "Escritório Completo",
    descricao: "Todo o marketing e a tecnologia nas mãos de uma agência.",
    preco: 5997,
    destaque: true,
    inclui: "Crescimento",
    recursos: [
      "Gestão das redes sociais: posts, carrosséis e stories",
      "Calendário de conteúdo mensal",
      "Reunião mensal de estratégia",
      "Relatório completo e suporte prioritário",
      "Melhorias contínuas no sistema e no app",
    ],
  },
];

/** Célula da tabela de comparação: incluído (true), não incluído (false) ou um texto. */
export type CelulaComparacao = boolean | string;

/** Itens da tabela "Compare os planos", na ordem Essencial, Crescimento, Escritório Completo. */
export const COMPARACAO_PLANOS: Array<{ item: string; valores: [CelulaComparacao, CelulaComparacao, CelulaComparacao] }> = [
  { item: "Sistema completo", valores: [true, true, true] },
  { item: "Hospedagem, manutenção e atualizações", valores: [true, true, true] },
  { item: "Treinamento e suporte", valores: [true, true, "Prioritário"] },
  { item: "Aplicativo do escritório", valores: [false, true, true] },
  { item: "Site profissional", valores: [false, true, true] },
  { item: "Tráfego pago (Meta e Google)", valores: [false, true, true] },
  { item: "Relatório de resultados", valores: [false, "Mensal", "Completo"] },
  { item: "Gestão de redes sociais", valores: [false, false, true] },
  { item: "Reunião mensal de estratégia", valores: [false, false, true] },
  { item: "Melhorias contínuas no sistema", valores: [false, false, true] },
];

export const COMO_FUNCIONAM_OS_PLANOS = [
  {
    titulo: "Valor fixo todo mês",
    texto: "Sem taxa de implantação. O primeiro pagamento já é a mensalidade, e ela segue igual nos meses seguintes.",
  },
  {
    titulo: "Verba de anúncios",
    texto: "Nos planos com tráfego pago, o investimento nos anúncios é pago direto às plataformas, à parte da mensalidade.",
  },
  {
    titulo: "Dentro das regras da OAB",
    texto: "Anúncios e conteúdos informativos, sem promessa de resultado, seguindo as normas de publicidade da advocacia.",
  },
] as const;

export const URL_SITE =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
