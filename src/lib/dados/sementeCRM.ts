import { addDays, parseISO } from "date-fns";
import { montarCNJ } from "../cnj";
import { paraISO } from "../datas";
import type { AreaDireito, Caso, Cliente, FaseCaso, Interacao, MotivoPerda, OrigemCliente, TipoInteracao } from "../tipos";

/**
 * Complemento da demonstração: o CRM (contatos em negociação, perdidos, histórico)
 * e o volume de um escritório movimentado (128 casos ativos).
 *
 * Tudo é determinístico: o mesmo dia gera sempre os mesmos dados.
 * Nomes de pessoas são combinações comuns, sem relação com ninguém; empresas usam
 * letras gregas (Alfa, Beta...) para deixar claro que são exemplos. Telefones ficam na
 * faixa (98) 90000-2XXX, fora da numeração de celulares, e e-mails no domínio ".example".
 */

export const CASOS_ATIVOS_NA_DEMONSTRACAO = 128;

interface Ferramentas {
  /** Dia corrido relativo a hoje (AAAA-MM-DD). */
  dia: (deslocamento: number) => string;
  hojeISO: string;
  /** Unidade de origem fictícia dos números de processo. */
  origemCNJ: number;
}

interface Entrada {
  clientes: Cliente[];
  casos: Caso[];
}

type NovoContato = Pick<Cliente, "id" | "tipo" | "nome" | "origem" | "areaInteresse" | "responsavelId" | "observacoes"> &
  Partial<Cliente> & { criadoHa: number };

/** Acrescenta o CRM e o volume de casos aos dados da demonstração e devolve o histórico de interações. */
export function completarDemonstracao({ clientes, casos }: Entrada, { dia, hojeISO, origemCNJ }: Ferramentas): Interacao[] {
  const interacoes: Interacao[] = [];
  let sequencia = 0;
  const registrar = (
    clienteId: string,
    diasAtras: number,
    hora: string,
    tipo: TipoInteracao,
    resumo: string,
    usuarioId: string,
    porIA = false,
  ) => {
    sequencia += 1;
    interacoes.push({
      id: `int-${sequencia}`,
      clienteId,
      tipo,
      resumo,
      em: `${dia(-diasAtras)}T${hora}:00`,
      usuarioId,
      porIA: porIA || undefined,
    });
  };

  /* --------------------- Contatos que já estavam no funil -------------------- */

  const crmDosExistentes: Record<string, Partial<Cliente>> = {
    "cli-bruno": {
      valorEstimado: 45000,
      temperatura: "quente",
      etapaDesde: dia(-1),
      proximoPasso: { descricao: "Confirmar presença na consulta e pedir a carteira de trabalho", data: hojeISO },
    },
    "cli-fernanda": {
      valorEstimado: 38000,
      temperatura: "morno",
      etapaDesde: dia(-2),
      proximoPasso: { descricao: "Cobrar o CNIS e a carta de indeferimento", data: dia(-1) },
    },
    "cli-mercadinho": {
      valorEstimado: 336000,
      temperatura: "quente",
      etapaDesde: dia(-6),
      proximoPasso: { descricao: "Ligar para saber se aprovou a proposta de assessoria", data: dia(-2) },
    },
    "cli-paulo": {
      valorEstimado: 24000,
      temperatura: "quente",
      etapaDesde: dia(-3),
      proximoPasso: { descricao: "Conferir se o contrato foi assinado", data: hojeISO },
    },
    "cli-sandra": {
      valorEstimado: 12000,
      temperatura: "morno",
      etapaDesde: hojeISO,
      proximoPasso: { descricao: "Primeira conversa: entender a cobrança do cartão", data: dia(1) },
    },
  };
  for (const cliente of clientes) {
    const extra = crmDosExistentes[cliente.id];
    if (extra) Object.assign(cliente, extra);
    // Quem já é cliente fechou alguns dias depois do primeiro contato.
    if (cliente.status === "ativo" || cliente.status === "inativo") {
      cliente.convertidoEm = paraISO(addDays(parseISO(cliente.criadoEm), 4 + (cliente.nome.length % 9)));
    }
  }

  registrar(
    "cli-bruno",
    1,
    "21:14",
    "whatsapp",
    "Triagem pelo atendente virtual: demitido há um mês, 4 anos de empresa, verbas não pagas.",
    "usr-gabriel",
    true,
  );
  registrar("cli-bruno", 1, "21:16", "etapa", 'Passou para "Consulta agendada" (agendada pelo atendente virtual).', "usr-gabriel", true);
  registrar("cli-fernanda", 4, "10:05", "whatsapp", "Chegou pelo Instagram. Benefício negado pelo INSS em outubro.", "usr-gabriel");
  registrar(
    "cli-fernanda",
    2,
    "16:30",
    "ligacao",
    "Expliquei recurso administrativo e ação judicial. Ficou de mandar o CNIS.",
    "usr-gabriel",
  );
  registrar("cli-fernanda", 2, "16:40", "etapa", 'Passou para "Consulta agendada".', "usr-gabriel");
  registrar(
    "cli-mercadinho",
    9,
    "11:00",
    "reuniao",
    "Reunião com o proprietário: 12 funcionários, dúvidas trabalhistas e contratos com fornecedores.",
    "usr-pedro",
  );
  registrar("cli-mercadinho", 6, "18:10", "email", "Proposta de assessoria mensal enviada, com 12 meses de vigência.", "usr-pedro");
  registrar("cli-mercadinho", 6, "18:12", "etapa", 'Passou para "Proposta enviada".', "usr-pedro");
  registrar("cli-paulo", 10, "15:00", "reuniao", "Consulta: revisão de pensão alimentícia, a renda do pai mudou.", "usr-gabriel");
  registrar("cli-paulo", 3, "09:20", "whatsapp", "Aceitou a proposta. Contrato enviado para assinatura digital.", "usr-gabriel");
  registrar("cli-paulo", 3, "09:22", "etapa", 'Passou para "Contrato em assinatura".', "usr-gabriel");
  registrar(
    "cli-sandra",
    0,
    "08:20",
    "whatsapp",
    "Relatou cobrança de anuidade que não contratou. Pediu para falar com um advogado.",
    "usr-julia",
    true,
  );

  /* ------------------------- Novos contatos em aberto ------------------------ */

  const abertos: Array<NovoContato & { historico: Array<[number, string, TipoInteracao, string]> }> = [
    {
      id: "cli-camila",
      tipo: "PF",
      nome: "Camila Ribeiro Duarte",
      origem: "instagram",
      areaInteresse: "trabalhista",
      responsavelId: "usr-julia",
      etapaFunil: "novo",
      valorEstimado: 30000,
      temperatura: "morno",
      criadoHa: 2,
      proximoPasso: { descricao: "Enviar a lista de documentos para a consulta", data: dia(2) },
      observacoes: "Relata assédio moral do gerente. Ainda está empregada.",
      historico: [[2, "19:40", "whatsapp", "Mandou mensagem pelo Instagram contando a situação no trabalho."]],
    },
    {
      id: "cli-rafael",
      tipo: "PF",
      nome: "Rafael Monteiro Pacheco",
      origem: "google",
      areaInteresse: "consumidor",
      responsavelId: "usr-julia",
      etapaFunil: "novo",
      valorEstimado: 15000,
      temperatura: "frio",
      criadoHa: 6,
      observacoes: "Voo cancelado sem reacomodação. Ainda não respondeu à última mensagem.",
      historico: [[6, "13:15", "email", "Preencheu o formulário do site. Respondemos pedindo os comprovantes da viagem."]],
    },
    {
      id: "cli-clinica",
      tipo: "PJ",
      nome: "Clínica Alfa Saúde Ltda",
      origem: "indicacao",
      areaInteresse: "civel",
      responsavelId: "usr-pedro",
      etapaFunil: "novo",
      valorEstimado: 180000,
      temperatura: "quente",
      criadoHa: 1,
      proximoPasso: { descricao: "Reunião com os sócios para entender a inadimplência dos pacientes", data: dia(1) },
      observacoes: "Indicação do Dr. Pedro. Cerca de 300 pacientes inadimplentes.",
      historico: [[1, "17:30", "ligacao", "A sócia-administradora ligou por indicação. Reunião marcada."]],
    },
    {
      id: "cli-marcosv",
      tipo: "PF",
      nome: "Marcos Vinícius Teles",
      origem: "whatsapp",
      areaInteresse: "previdenciario",
      responsavelId: "usr-gabriel",
      etapaFunil: "consulta",
      valorEstimado: 52000,
      temperatura: "quente",
      criadoHa: 5,
      etapaDesde: dia(-3),
      proximoPasso: { descricao: "Consulta presencial às 15h: levar PPP da empresa", data: dia(3) },
      observacoes: "Trabalhou 25 anos exposto a ruído. Possível aposentadoria especial.",
      historico: [
        [5, "08:50", "whatsapp", "Triagem pelo atendente virtual: 25 anos em metalúrgica, exposto a ruído."],
        [3, "10:10", "ligacao", "Conversa inicial. Pedi o PPP e marquei a consulta."],
      ],
    },
    {
      id: "cli-patricia",
      tipo: "PF",
      nome: "Patrícia Gomes Nogueira",
      origem: "indicacao",
      areaInteresse: "familia",
      responsavelId: "usr-gabriel",
      etapaFunil: "consulta",
      valorEstimado: 28000,
      temperatura: "morno",
      criadoHa: 11,
      etapaDesde: dia(-8),
      proximoPasso: { descricao: "Remarcar a consulta que ela desmarcou", data: dia(-1) },
      observacoes: "Divórcio com partilha de imóvel. Desmarcou a primeira consulta.",
      historico: [
        [11, "14:00", "ligacao", "Indicada por cliente antiga. Quer se divorciar e dividir o apartamento."],
        [4, "09:30", "whatsapp", "Desmarcou a consulta por um imprevisto e pediu para remarcar."],
      ],
    },
    {
      id: "cli-eduardo",
      tipo: "PF",
      nome: "Eduardo Nascimento Reis",
      origem: "google",
      areaInteresse: "trabalhista",
      responsavelId: "usr-julia",
      etapaFunil: "proposta",
      valorEstimado: 60000,
      temperatura: "morno",
      criadoHa: 16,
      etapaDesde: dia(-5),
      proximoPasso: { descricao: "Ligar para tirar as dúvidas sobre os honorários de êxito", data: dia(4) },
      observacoes: "Horas extras não pagas por 3 anos. Comparando propostas.",
      historico: [
        [16, "11:45", "email", "Chegou pelo Google. Enviou os contracheques."],
        [9, "16:00", "reuniao", "Consulta por vídeo. Estimativa de 1.400 horas extras."],
        [5, "18:20", "email", "Proposta enviada: 20% de êxito, sem valor de entrada."],
      ],
    },
    {
      id: "cli-transportes",
      tipo: "PJ",
      nome: "Transportes Beta Ltda",
      origem: "indicacao",
      areaInteresse: "trabalhista",
      responsavelId: "usr-pedro",
      etapaFunil: "proposta",
      valorEstimado: 240000,
      temperatura: "quente",
      criadoHa: 20,
      etapaDesde: dia(-7),
      proximoPasso: { descricao: "Apresentar a proposta revisada ao diretor financeiro", data: hojeISO },
      observacoes: "Transportadora com 80 motoristas. Quer reduzir o passivo trabalhista.",
      historico: [
        [20, "10:00", "reuniao", "Visita à empresa. Levantamento de 14 reclamações trabalhistas em andamento."],
        [7, "17:00", "email", "Proposta de assessoria preventiva e defesa nas ações enviada."],
        [2, "11:30", "ligacao", "Diretor pediu ajuste no valor mensal. Revisando a proposta."],
      ],
    },
    {
      id: "cli-juliana",
      tipo: "PF",
      nome: "Juliana Castro Medeiros",
      origem: "instagram",
      areaInteresse: "consumidor",
      responsavelId: "usr-julia",
      etapaFunil: "contrato",
      valorEstimado: 22000,
      temperatura: "quente",
      criadoHa: 14,
      etapaDesde: dia(-2),
      proximoPasso: { descricao: "Coletar a assinatura do contrato e da procuração", data: dia(1) },
      observacoes: "Plano de saúde negou cirurgia. Urgência média.",
      historico: [
        [14, "20:10", "whatsapp", "Chegou pelo Instagram. Negativa de cobertura de cirurgia."],
        [8, "15:30", "reuniao", "Consulta. Viabilidade boa, laudo médico favorável."],
        [2, "10:00", "email", "Contrato e procuração enviados para assinatura digital."],
      ],
    },
  ];

  /* ------------------------------ Contatos perdidos ----------------------------- */

  const perdidos: Array<NovoContato & { perdidoHa: number; motivo: MotivoPerda; resumo: string }> = [
    {
      id: "cli-fabio",
      tipo: "PF",
      nome: "Fábio Lopes Cardoso",
      origem: "google",
      areaInteresse: "trabalhista",
      responsavelId: "usr-julia",
      etapaFunil: "proposta",
      valorEstimado: 35000,
      criadoHa: 30,
      perdidoHa: 8,
      motivo: "preco",
      resumo: "Achou o percentual de êxito alto.",
    },
    {
      id: "cli-renata",
      tipo: "PF",
      nome: "Renata Alves Coelho",
      origem: "instagram",
      areaInteresse: "consumidor",
      responsavelId: "usr-julia",
      etapaFunil: "novo",
      valorEstimado: 10000,
      criadoHa: 40,
      perdidoHa: 15,
      motivo: "sem_resposta",
      resumo: "Três tentativas sem resposta.",
    },
    {
      id: "cli-gustavo",
      tipo: "PF",
      nome: "Gustavo Pereira Freitas",
      origem: "google",
      areaInteresse: "previdenciario",
      responsavelId: "usr-gabriel",
      etapaFunil: "proposta",
      valorEstimado: 42000,
      criadoHa: 35,
      perdidoHa: 22,
      motivo: "concorrente",
      resumo: "Fechou com escritório da família.",
    },
    {
      id: "cli-aline",
      tipo: "PF",
      nome: "Aline Barros Teixeira",
      origem: "whatsapp",
      areaInteresse: "previdenciario",
      responsavelId: "usr-gabriel",
      etapaFunil: "consulta",
      valorEstimado: 30000,
      criadoHa: 38,
      perdidoHa: 33,
      motivo: "sem_viabilidade",
      resumo: "Sem tempo de contribuição suficiente ainda.",
    },
    {
      id: "cli-comerciogama",
      tipo: "PJ",
      nome: "Comércio Gama Ltda",
      origem: "indicacao",
      areaInteresse: "civel",
      responsavelId: "usr-pedro",
      etapaFunil: "proposta",
      valorEstimado: 150000,
      criadoHa: 70,
      perdidoHa: 48,
      motivo: "preco",
      resumo: "Orçamento do ano já fechado.",
    },
    {
      id: "cli-tiago",
      tipo: "PF",
      nome: "Tiago Farias Queiroz",
      origem: "instagram",
      areaInteresse: "familia",
      responsavelId: "usr-gabriel",
      etapaFunil: "consulta",
      valorEstimado: 20000,
      criadoHa: 75,
      perdidoHa: 60,
      motivo: "desistiu",
      resumo: "Reatou o casamento.",
    },
    {
      id: "cli-leandro",
      tipo: "PF",
      nome: "Leandro Cruz Vieira",
      origem: "google",
      areaInteresse: "consumidor",
      responsavelId: "usr-julia",
      etapaFunil: "novo",
      valorEstimado: 8000,
      criadoHa: 110,
      perdidoHa: 95,
      motivo: "sem_resposta",
      resumo: "Não retornou depois do primeiro contato.",
    },
    {
      id: "cli-vanessa",
      tipo: "PF",
      nome: "Vanessa Prado Martins",
      origem: "instagram",
      areaInteresse: "trabalhista",
      responsavelId: "usr-julia",
      etapaFunil: "proposta",
      valorEstimado: 26000,
      criadoHa: 130,
      perdidoHa: 120,
      motivo: "preco",
      resumo: "Preferiu o sindicato.",
    },
  ];

  const base = ({ criadoHa, ...c }: NovoContato): Cliente => ({
    documento: "",
    email: "",
    telefone: "",
    cidade: "São Luís - MA",
    status: "lead",
    ...c,
    id: c.id,
    criadoEm: dia(-criadoHa),
  });

  let telefoneSeq = 0;
  const proximoTelefone = () => `9890000${String(2000 + telefoneSeq++).padStart(4, "0")}`;

  for (const { historico, criadoHa, ...contato } of abertos) {
    clientes.push({ ...base({ ...contato, criadoHa }), telefone: proximoTelefone(), etapaDesde: contato.etapaDesde ?? dia(-criadoHa) });
    for (const [diasAtras, hora, tipo, resumo] of historico) {
      registrar(contato.id, diasAtras, hora, tipo, resumo, contato.responsavelId, tipo === "whatsapp" && contato.origem === "whatsapp");
    }
  }
  for (const { perdidoHa, motivo, resumo, criadoHa, ...contato } of perdidos) {
    clientes.push({
      ...base({ ...contato, criadoHa }),
      telefone: proximoTelefone(),
      status: "perdido",
      perdidoEm: dia(-perdidoHa),
      motivoPerda: motivo,
    });
    registrar(contato.id, criadoHa, "10:00", "ligacao", "Primeiro contato e triagem do caso.", contato.responsavelId);
    registrar(contato.id, perdidoHa, "17:00", "etapa", `Contato perdido: ${resumo}`, contato.responsavelId);
  }

  // Histórico de alguns clientes antigos, para a ficha não ficar vazia.
  registrar("cli-maria", 6, "15:00", "ligacao", "Expliquei a fase de recurso do INSS. Cliente tranquila.", "usr-gabriel");
  registrar("cli-carlos", 12, "10:30", "reuniao", "Reunião de alinhamento sobre a audiência.", "usr-gabriel");
  registrar("cli-horizonte", 3, "16:00", "email", "Enviado o parecer sobre o aditivo contratual para revisão.", "usr-pedro");

  /* ----------------------- Volume: até 128 casos ativos ---------------------- */

  const ativos = casos.filter((c) => c.fase !== "encerrado").length;
  const falta = Math.max(0, CASOS_ATIVOS_NA_DEMONSTRACAO - ativos);
  const quantidadeDeClientes = Math.min(falta, Math.ceil(falta * 0.77));
  const novosClientes: Cliente[] = [];
  for (let i = 0; i < quantidadeDeClientes; i++) {
    const criadoHa = 30 + i * 12;
    const ehEmpresa = i % 9 === 4;
    const nome = ehEmpresa ? EMPRESAS[Math.floor(i / 9) % EMPRESAS.length] : nomeDePessoa(i);
    const cliente: Cliente = {
      id: `cli-g${i}`,
      tipo: ehEmpresa ? "PJ" : "PF",
      nome,
      documento: "",
      email: i % 2 === 0 ? `${apelido(nome)}@email.example` : "",
      telefone: proximoTelefone(),
      cidade: CIDADES[i % CIDADES.length],
      origem: ORIGENS_CICLO[i % ORIGENS_CICLO.length],
      status: "ativo",
      responsavelId: RESPONSAVEIS[i % RESPONSAVEIS.length],
      criadoEm: dia(-criadoHa),
      convertidoEm: dia(-criadoHa + 3 + (i % 10)),
    };
    novosClientes.push(cliente);
  }
  clientes.push(...novosClientes);

  for (let i = 0; i < falta && novosClientes.length > 0; i++) {
    const cliente = novosClientes[i % novosClientes.length];
    const segundoCaso = i >= novosClientes.length;
    const area = AREAS_CICLO[i % AREAS_CICLO.length];
    const modelo = MODELOS[area];
    const tipoAcao = modelo.tipos[i % modelo.tipos.length];
    const parte = modelo.partes[i % modelo.partes.length];
    const criadoEm = segundoCaso ? minimo(paraISO(addDays(parseISO(cliente.convertidoEm!), 75)), hojeISO) : cliente.convertidoEm!;
    const sobrenome = cliente.tipo === "PJ" ? cliente.nome.split(" ").slice(0, 2).join(" ") : cliente.nome.split(" ").at(-1)!;
    casos.push({
      id: `cas-g${i}`,
      titulo: area === "familia" ? `${tipoAcao} — ${sobrenome}` : `${sobrenome} × ${parte}`,
      clienteId: cliente.id,
      numeroCNJ: montarCNJ(7000000 + i * 113, Number(criadoEm.slice(0, 4)), modelo.segmento, modelo.tribunal, origemCNJ),
      area,
      tipoAcao,
      orgao: modelo.orgaos[i % modelo.orgaos.length],
      parteContraria: parte,
      fase: FASES_CICLO[i % FASES_CICLO.length],
      responsavelId: cliente.responsavelId,
      valorCausa: (((i * 37) % 46) + 4) * 1000,
      criadoEm,
    });
  }

  return interacoes.sort((a, b) => b.em.localeCompare(a.em));
}

function minimo(a: string, b: string): string {
  return a < b ? a : b;
}

const PRIMEIROS_NOMES = [
  "Adriana",
  "Alexandre",
  "Amanda",
  "André",
  "Beatriz",
  "Bruna",
  "Caio",
  "Cecília",
  "Cláudio",
  "Daniela",
  "Diego",
  "Elaine",
  "Emerson",
  "Fabiana",
  "Felipe",
  "Gabriela",
  "Gilberto",
  "Heloísa",
  "Igor",
  "Isabela",
  "Jéssica",
  "Jorge",
  "Karina",
  "Larissa",
  "Lucas",
  "Márcia",
  "Mateus",
  "Natália",
  "Otávio",
  "Priscila",
  "Raimundo",
  "Rita",
  "Rodrigo",
  "Sabrina",
  "Sérgio",
  "Simone",
  "Thiago",
  "Vera",
  "Wellington",
  "Yara",
];

const SOBRENOMES = [
  "Barbosa",
  "Batista",
  "Bezerra",
  "Cardoso",
  "Carvalho",
  "Coelho",
  "Correia",
  "Costa",
  "Cunha",
  "Dias",
  "Duarte",
  "Fernandes",
  "Freitas",
  "Gonçalves",
  "Machado",
  "Marques",
  "Martins",
  "Medeiros",
  "Melo",
  "Moura",
  "Nogueira",
  "Oliveira",
  "Pacheco",
  "Pinto",
  "Queiroz",
  "Ramos",
  "Reis",
  "Rezende",
  "Santana",
  "Serra",
  "Soares",
  "Tavares",
  "Teixeira",
  "Vasconcelos",
  "Vieira",
  "Brito",
  "Campos",
  "Farias",
];

function nomeDePessoa(i: number): string {
  const primeiro = PRIMEIROS_NOMES[i % PRIMEIROS_NOMES.length];
  const meio = SOBRENOMES[(i * 7) % SOBRENOMES.length];
  let ultimo = SOBRENOMES[(i * 13 + 5) % SOBRENOMES.length];
  if (ultimo === meio) ultimo = SOBRENOMES[(i * 13 + 6) % SOBRENOMES.length];
  return `${primeiro} ${meio} ${ultimo}`;
}

function apelido(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .join(".");
}

const EMPRESAS = [
  "Comércio Delta Ltda",
  "Serviços Épsilon Ltda",
  "Construtora Zeta Ltda",
  "Distribuidora Eta Ltda",
  "Indústria Teta S.A.",
  "Agropecuária Iota Ltda",
  "Farmácia Kappa Ltda",
  "Escola Lambda Ltda",
  "Padaria Sigma Ltda",
  "Mercado Ômega Ltda",
];

const CIDADES = ["São Luís - MA", "São Luís - MA", "São José de Ribamar - MA", "Paço do Lumiar - MA", "Raposa - MA"];
const ORIGENS_CICLO: OrigemCliente[] = ["indicacao", "google", "instagram", "whatsapp", "indicacao", "google", "outro"];
const RESPONSAVEIS = ["usr-gabriel", "usr-pedro", "usr-julia"];
const AREAS_CICLO: AreaDireito[] = [
  "previdenciario",
  "trabalhista",
  "consumidor",
  "previdenciario",
  "trabalhista",
  "familia",
  "civel",
  "consumidor",
];
const FASES_CICLO: FaseCaso[] = ["inicial", "instrucao", "instrucao", "sentenca", "recurso", "execucao", "inicial"];

const MODELOS: Record<AreaDireito, { tipos: string[]; partes: string[]; orgaos: string[]; segmento: number; tribunal: number }> = {
  previdenciario: {
    tipos: [
      "Aposentadoria por idade",
      "Aposentadoria especial",
      "Aposentadoria por tempo de contribuição",
      "Auxílio por incapacidade temporária",
      "Benefício assistencial (BPC/LOAS)",
      "Pensão por morte",
      "Salário-maternidade",
    ],
    partes: ["INSS"],
    orgaos: ["Juizado Especial Federal — São Luís", "1ª Vara Federal — SJMA", "Turma Recursal — SJMA"],
    segmento: 4,
    tribunal: 1,
  },
  trabalhista: {
    tipos: [
      "Verbas rescisórias",
      "Horas extras",
      "Reconhecimento de vínculo",
      "Adicional de insalubridade",
      "Acidente de trabalho",
      "Equiparação salarial",
    ],
    partes: ["Comércio Alfa Ltda", "Serviços Gama Ltda", "Logística Delta Ltda", "Construtora Beta Ltda", "Supermercado Ômega Ltda"],
    orgaos: ["1ª Vara do Trabalho de São Luís", "3ª Vara do Trabalho de São Luís", "Vara do Trabalho de São José de Ribamar"],
    segmento: 5,
    tribunal: 16,
  },
  consumidor: {
    tipos: [
      "Danos morais",
      "Cobrança indevida",
      "Negativação indevida",
      "Cancelamento de voo",
      "Revisão de contrato bancário",
      "Negativa de plano de saúde",
    ],
    partes: ["Banco Alfa S.A.", "Operadora Beta Telecom", "Companhia Aérea Delta", "Plano de Saúde Gama", "Varejista Ômega"],
    orgaos: ["1º Juizado Especial Cível — São Luís", "4ª Vara Cível — São Luís", "Juizado Especial Cível — Cohama"],
    segmento: 8,
    tribunal: 10,
  },
  familia: {
    tipos: ["Divórcio consensual", "Divórcio litigioso", "Alimentos", "Revisão de alimentos", "Guarda compartilhada", "Inventário"],
    partes: ["Segredo de justiça"],
    orgaos: ["1ª Vara de Família — São Luís", "3ª Vara de Família — São Luís"],
    segmento: 8,
    tribunal: 10,
  },
  civel: {
    tipos: ["Cobrança", "Execução de título extrajudicial", "Usucapião", "Danos materiais", "Despejo", "Obrigação de fazer"],
    partes: ["Imobiliária Beta Ltda", "Condomínio Residencial Alfa", "Construtora Gama Ltda", "Locatário (nome no processo)"],
    orgaos: ["2ª Vara Cível — São Luís", "7ª Vara Cível — São Luís"],
    segmento: 8,
    tribunal: 10,
  },
};
