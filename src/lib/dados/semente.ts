import { addDays, addMonths, format } from "date-fns";
import { montarCNJ } from "../cnj";
import { paraISO, proximoDiaUtil, somarDiasUteis, sugerirPrazo } from "../datas";
import { completarDemonstracao } from "./sementeCRM";
import type { Andamento, Caso, Cliente, Contrato, Conversa, DadosEscritorio, Evento, Lancamento, Mensagem, Prazo, Usuario } from "../tipos";

/**
 * Unidade de origem dos números de processo da demonstração. Não existe em nenhum
 * tribunal: os números têm formato e dígito verificador válidos, mas não
 * correspondem a processo real.
 */
const ORIGEM_FICTICIA = 9999;

/**
 * Dados de demonstração de um escritório fictício.
 * Tudo é calculado em relação a "hoje", para a demonstração parecer viva
 * em qualquer dia em que for aberta. Nomes, números e valores são inventados.
 *
 * Para nada daqui cair em uma pessoa de verdade (os botões abrem o WhatsApp com
 * mensagem pronta): os telefones ficam na faixa (98) 90000-00XX, fora da numeração
 * de celulares do país (nenhum celular começa com 90); os e-mails usam o domínio
 * reservado ".example"; e os números de OAB estão acima da numeração já emitida.
 */
/** Multiplica todos os valores em dinheiro da demonstração (causas, contratos e lançamentos). */
const ESCALA_DOS_VALORES = 10;

export function criarSemente(hoje: Date): DadosEscritorio {
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  /** Dia corrido relativo a hoje. */
  const dia = (deslocamento: number) => paraISO(addDays(base, deslocamento));
  /** Dia útil relativo a hoje (0 = hoje ou o próximo dia útil). */
  const util = (deslocamento: number) => {
    const inicio = proximoDiaUtil(base);
    return paraISO(deslocamento === 0 ? inicio : somarDiasUteis(inicio, deslocamento));
  };
  /**
   * Dia útil forense relativo a hoje: como `util`, mas pula também o recesso de
   * 20/12 a 20/01. Vale para prazos processuais, audiências e perícias, que não
   * acontecem no recesso. Consultas e reuniões seguem em `util`.
   */
  const forense = (deslocamento: number) => {
    const inicio = proximoDiaUtil(base, { recesso: true });
    return paraISO(deslocamento === 0 ? inicio : somarDiasUteis(inicio, deslocamento, { recesso: true }));
  };
  /** Data e hora locais, sem fuso (AAAA-MM-DDTHH:mm:00). */
  const quando = (dataISO: string, hora: string) => `${dataISO}T${hora}:00`;
  /** Dia fixo de um mês relativo ao mês atual. */
  const diaDoMes = (meses: number, diaFixo: number) => {
    const mes = addMonths(new Date(base.getFullYear(), base.getMonth(), 1), meses);
    return paraISO(new Date(mes.getFullYear(), mes.getMonth(), diaFixo));
  };
  const hojeISO = paraISO(base);

  const usuarios: Usuario[] = [
    { id: "usr-gabriel", nome: "Dr. Gabriel Ogando", email: "gabriel@ogandorocha.example", papel: "socio", oab: "OAB/MA 99.901" },
    { id: "usr-pedro", nome: "Dr. Pedro Rocha", email: "pedro@ogandorocha.example", papel: "socio", oab: "OAB/MA 99.902" },
    { id: "usr-julia", nome: "Dra. Júlia Santos", email: "julia@ogandorocha.example", papel: "advogado", oab: "OAB/MA 99.903" },
    { id: "usr-marcos", nome: "Marcos Lima", email: "marcos@ogandorocha.example", papel: "estagiario" },
    { id: "usr-carla", nome: "Carla Nunes", email: "financeiro@ogandorocha.example", papel: "financeiro" },
  ];

  const clientes: Cliente[] = [
    {
      id: "cli-maria",
      tipo: "PF",
      nome: "Maria Silva",
      documento: "***.482.913-**",
      email: "maria.silva@email.example",
      telefone: "98900000001",
      cidade: "São Luís - MA",
      origem: "indicacao",
      status: "ativo",
      responsavelId: "usr-gabriel",
      criadoEm: dia(-410),
    },
    {
      id: "cli-joao",
      tipo: "PF",
      nome: "João Ferreira",
      documento: "***.127.640-**",
      email: "joao.ferreira@email.example",
      telefone: "98900000002",
      cidade: "São Luís - MA",
      origem: "google",
      status: "ativo",
      responsavelId: "usr-pedro",
      criadoEm: dia(-240),
    },
    {
      id: "cli-horizonte",
      tipo: "PJ",
      nome: "Construtora Horizonte Ltda",
      documento: "12.345.678/0001-90",
      email: "juridico@horizonte.example",
      telefone: "98900000003",
      cidade: "São Luís - MA",
      origem: "indicacao",
      status: "ativo",
      responsavelId: "usr-pedro",
      criadoEm: dia(-620),
    },
    {
      id: "cli-anapaula",
      tipo: "PF",
      nome: "Ana Paula Souza",
      documento: "***.905.221-**",
      email: "anapaula.souza@email.example",
      telefone: "98900000004",
      cidade: "São José de Ribamar - MA",
      origem: "instagram",
      status: "ativo",
      responsavelId: "usr-gabriel",
      criadoEm: dia(-95),
    },
    {
      id: "cli-carlos",
      tipo: "PF",
      nome: "Carlos Mendes",
      documento: "***.338.704-**",
      email: "carlos.mendes@email.example",
      telefone: "98900000005",
      cidade: "São Luís - MA",
      origem: "google",
      status: "ativo",
      responsavelId: "usr-pedro",
      criadoEm: dia(-40),
    },
    {
      id: "cli-padaria",
      tipo: "PJ",
      nome: "Padaria Pão Dourado ME",
      documento: "23.456.789/0001-01",
      email: "contato@paodourado.example",
      telefone: "98900000006",
      cidade: "Paço do Lumiar - MA",
      origem: "indicacao",
      status: "ativo",
      responsavelId: "usr-julia",
      criadoEm: dia(-150),
    },
    {
      id: "cli-luciana",
      tipo: "PF",
      nome: "Luciana Costa",
      documento: "***.774.150-**",
      email: "luciana.costa@email.example",
      telefone: "98900000007",
      cidade: "São Luís - MA",
      origem: "instagram",
      status: "ativo",
      responsavelId: "usr-julia",
      criadoEm: dia(-205),
    },
    {
      id: "cli-roberto",
      tipo: "PF",
      nome: "Roberto Lima",
      documento: "***.051.896-**",
      email: "roberto.lima@email.example",
      telefone: "98900000008",
      cidade: "Raposa - MA",
      origem: "whatsapp",
      status: "ativo",
      responsavelId: "usr-gabriel",
      criadoEm: dia(-130),
    },
    {
      id: "cli-vidaplena",
      tipo: "PJ",
      nome: "Clínica Vida Plena Ltda",
      documento: "34.567.890/0001-12",
      email: "administrativo@vidaplena.example",
      telefone: "98900000009",
      cidade: "São Luís - MA",
      origem: "indicacao",
      status: "ativo",
      responsavelId: "usr-julia",
      criadoEm: dia(-330),
    },
    {
      id: "cli-teresa",
      tipo: "PF",
      nome: "Teresa Rocha",
      documento: "***.669.432-**",
      email: "teresa.rocha@email.example",
      telefone: "98900000010",
      cidade: "São Luís - MA",
      origem: "indicacao",
      status: "ativo",
      responsavelId: "usr-julia",
      criadoEm: dia(-62),
    },
    // Clientes de casos já encerrados
    {
      id: "cli-antonio",
      tipo: "PF",
      nome: "Antônio Barros",
      documento: "***.218.547-**",
      email: "antonio.barros@email.example",
      telefone: "98900000016",
      cidade: "São Luís - MA",
      origem: "indicacao",
      status: "inativo",
      responsavelId: "usr-pedro",
      criadoEm: dia(-520),
    },
    {
      id: "cli-helena",
      tipo: "PF",
      nome: "Helena Castro",
      documento: "***.906.371-**",
      email: "helena.castro@email.example",
      telefone: "98900000017",
      cidade: "São Luís - MA",
      origem: "google",
      status: "inativo",
      responsavelId: "usr-gabriel",
      criadoEm: dia(-700),
    },
    {
      id: "cli-mercantil",
      tipo: "PJ",
      nome: "Mercantil Norte Ltda",
      documento: "45.678.901/0001-23",
      email: "financeiro@mercantilnorte.example",
      telefone: "98900000018",
      cidade: "São Luís - MA",
      origem: "indicacao",
      status: "inativo",
      responsavelId: "usr-julia",
      criadoEm: dia(-640),
    },
    // Leads no funil de captação
    {
      id: "cli-bruno",
      tipo: "PF",
      nome: "Bruno Martins",
      documento: "",
      email: "",
      telefone: "98900000011",
      cidade: "São Luís - MA",
      origem: "whatsapp",
      status: "lead",
      etapaFunil: "consulta",
      areaInteresse: "trabalhista",
      responsavelId: "usr-pedro",
      criadoEm: dia(-1),
      observacoes: "Demitido há um mês, 4 anos de empresa, verbas não pagas. Triagem feita pela IA.",
    },
    {
      id: "cli-fernanda",
      tipo: "PF",
      nome: "Fernanda Dias",
      documento: "",
      email: "fernanda.dias@email.example",
      telefone: "98900000012",
      cidade: "São Luís - MA",
      origem: "instagram",
      status: "lead",
      etapaFunil: "consulta",
      areaInteresse: "previdenciario",
      responsavelId: "usr-gabriel",
      criadoEm: dia(-4),
      observacoes: "Pedido de aposentadoria negado pelo INSS.",
    },
    {
      id: "cli-mercadinho",
      tipo: "PJ",
      nome: "Mercadinho Bom Preço",
      documento: "",
      email: "bompreco@email.example",
      telefone: "98900000013",
      cidade: "São Luís - MA",
      origem: "indicacao",
      status: "lead",
      etapaFunil: "proposta",
      areaInteresse: "civel",
      responsavelId: "usr-pedro",
      criadoEm: dia(-9),
      observacoes: "Quer assessoria mensal. Proposta de R$ 28.000/mês enviada.",
    },
    {
      id: "cli-paulo",
      tipo: "PF",
      nome: "Paulo Henrique Araújo",
      documento: "",
      email: "paulo.araujo@email.example",
      telefone: "98900000014",
      cidade: "São Luís - MA",
      origem: "google",
      status: "lead",
      etapaFunil: "contrato",
      areaInteresse: "familia",
      responsavelId: "usr-gabriel",
      criadoEm: dia(-12),
      observacoes: "Revisão de pensão alimentícia. Contrato enviado para assinatura.",
    },
    {
      id: "cli-sandra",
      tipo: "PF",
      nome: "Sandra Moreira",
      documento: "",
      email: "",
      telefone: "98900000015",
      cidade: "São Luís - MA",
      origem: "instagram",
      status: "lead",
      etapaFunil: "novo",
      areaInteresse: "consumidor",
      responsavelId: "usr-julia",
      criadoEm: hojeISO,
      observacoes: "Cobrança indevida no cartão. Pediu para falar com advogado.",
    },
  ];

  const ano = base.getFullYear();
  const casos: Caso[] = [
    {
      id: "cas-silva-inss",
      titulo: "Silva × INSS",
      clienteId: "cli-maria",
      numeroCNJ: montarCNJ(1004521, ano - 1, 4, 1, ORIGEM_FICTICIA),
      area: "previdenciario",
      tipoAcao: "Aposentadoria por idade",
      orgao: "7ª Vara do Juizado Especial Federal — São Luís",
      parteContraria: "INSS",
      fase: "recurso",
      responsavelId: "usr-gabriel",
      valorCausa: 48000,
      criadoEm: dia(-400),
      descricao: "Benefício negado na via administrativa. Sentença procedente; o INSS recorreu.",
    },
    {
      id: "cas-ferreira",
      titulo: "Ferreira × Transportadora Litoral",
      clienteId: "cli-joao",
      numeroCNJ: montarCNJ(17834, ano, 5, 16, ORIGEM_FICTICIA),
      area: "trabalhista",
      tipoAcao: "Verbas rescisórias e horas extras",
      orgao: "3ª Vara do Trabalho de São Luís",
      parteContraria: "Transportadora Litoral Ltda",
      fase: "instrucao",
      responsavelId: "usr-pedro",
      valorCausa: 62000,
      criadoEm: dia(-230),
      descricao: "Motorista dispensado sem pagamento das verbas. Pedido de horas extras e FGTS.",
    },
    {
      id: "cas-horizonte-exec",
      titulo: "Horizonte × Aço Norte",
      clienteId: "cli-horizonte",
      numeroCNJ: montarCNJ(802217, ano - 2, 8, 10, ORIGEM_FICTICIA),
      area: "civel",
      tipoAcao: "Cumprimento de sentença",
      orgao: "5ª Vara Cível de São Luís",
      parteContraria: "Fornecedora Aço Norte S.A.",
      fase: "execucao",
      responsavelId: "usr-pedro",
      valorCausa: 185000,
      criadoEm: dia(-600),
      descricao: "Cobrança por material entregue fora da especificação. Sentença transitada; fase de penhora.",
    },
    {
      id: "cas-souza",
      titulo: "Souza — Divórcio e alimentos",
      clienteId: "cli-anapaula",
      numeroCNJ: montarCNJ(815530, ano, 8, 10, ORIGEM_FICTICIA),
      area: "familia",
      tipoAcao: "Divórcio litigioso com alimentos",
      orgao: "2ª Vara de Família de São Luís",
      parteContraria: "R. S. (ex-cônjuge)",
      fase: "instrucao",
      responsavelId: "usr-gabriel",
      valorCausa: 30000,
      criadoEm: dia(-90),
      descricao: "Guarda compartilhada em discussão; alimentos provisórios fixados.",
    },
    {
      id: "cas-mendes",
      titulo: "Mendes × Seguradora Atlântica",
      clienteId: "cli-carlos",
      numeroCNJ: montarCNJ(820914, ano, 8, 10, ORIGEM_FICTICIA),
      area: "consumidor",
      tipoAcao: "Negativa de cobertura de seguro",
      orgao: "7º Juizado Especial Cível de São Luís",
      parteContraria: "Seguradora Atlântica S.A.",
      fase: "inicial",
      responsavelId: "usr-pedro",
      valorCausa: 25000,
      criadoEm: dia(-38),
      descricao: "Seguro de veículo negado após sinistro. Pedido de indenização e danos morais.",
    },
    {
      id: "cas-padaria",
      titulo: "Reclamatória — Pão Dourado (defesa)",
      clienteId: "cli-padaria",
      numeroCNJ: montarCNJ(16122, ano, 5, 16, ORIGEM_FICTICIA),
      area: "trabalhista",
      tipoAcao: "Defesa em reclamatória trabalhista",
      orgao: "1ª Vara do Trabalho de São Luís",
      parteContraria: "M. A. (ex-funcionário)",
      fase: "sentenca",
      responsavelId: "usr-julia",
      valorCausa: 38000,
      criadoEm: dia(-145),
      descricao: "Pedido de vínculo e verbas. Sentença parcialmente procedente.",
    },
    {
      id: "cas-costa",
      titulo: "Costa × Banco Meridional",
      clienteId: "cli-luciana",
      numeroCNJ: montarCNJ(809377, ano, 8, 10, ORIGEM_FICTICIA),
      area: "consumidor",
      tipoAcao: "Empréstimo consignado não contratado",
      orgao: "4º Juizado Especial Cível de São Luís",
      parteContraria: "Banco Meridional S.A.",
      fase: "sentenca",
      responsavelId: "usr-julia",
      valorCausa: 18000,
      criadoEm: dia(-200),
      descricao: "Descontos indevidos em benefício. Aguardando sentença.",
    },
    {
      id: "cas-lima-inss",
      titulo: "Lima × INSS",
      clienteId: "cli-roberto",
      numeroCNJ: montarCNJ(1011873, ano, 4, 1, ORIGEM_FICTICIA),
      area: "previdenciario",
      tipoAcao: "Auxílio por incapacidade temporária",
      orgao: "9ª Vara do Juizado Especial Federal — São Luís",
      parteContraria: "INSS",
      fase: "instrucao",
      responsavelId: "usr-gabriel",
      valorCausa: 34000,
      criadoEm: dia(-125),
      descricao: "Benefício cessado. Perícia judicial designada.",
    },
    {
      id: "cas-vidaplena",
      titulo: "Vida Plena × Saúde Total",
      clienteId: "cli-vidaplena",
      numeroCNJ: montarCNJ(798045, ano - 1, 8, 10, ORIGEM_FICTICIA),
      area: "civel",
      tipoAcao: "Cobrança de repasses contratuais",
      orgao: "3ª Vara Cível de São Luís",
      parteContraria: "Operadora Saúde Total S.A.",
      fase: "recurso",
      responsavelId: "usr-julia",
      valorCausa: 120000,
      criadoEm: dia(-320),
      descricao: "Glosas indevidas de procedimentos. Sentença favorável; a operadora apelou.",
    },
    {
      id: "cas-rocha",
      titulo: "Rocha — Inventário",
      clienteId: "cli-teresa",
      numeroCNJ: montarCNJ(822640, ano, 8, 10, ORIGEM_FICTICIA),
      area: "familia",
      tipoAcao: "Inventário judicial",
      orgao: "1ª Vara de Sucessões de São Luís",
      parteContraria: "—",
      fase: "inicial",
      responsavelId: "usr-julia",
      valorCausa: 410000,
      criadoEm: dia(-60),
      descricao: "Três herdeiros, dois imóveis. Inventariante nomeada.",
    },
    {
      id: "cas-horizonte-cons",
      titulo: "Horizonte — Consultivo contratual",
      clienteId: "cli-horizonte",
      area: "civel",
      tipoAcao: "Assessoria mensal (partido)",
      orgao: "Consultivo",
      parteContraria: "—",
      fase: "inicial",
      responsavelId: "usr-pedro",
      valorCausa: 0,
      criadoEm: dia(-600),
      descricao: "Revisão de contratos com fornecedores e subempreiteiros.",
    },
    {
      id: "cas-barros",
      titulo: "Barros × Frigorífico Boi Bom",
      clienteId: "cli-antonio",
      numeroCNJ: montarCNJ(15407, ano - 1, 5, 16, ORIGEM_FICTICIA),
      area: "trabalhista",
      tipoAcao: "Verbas rescisórias e adicional de insalubridade",
      orgao: "2ª Vara do Trabalho de São Luís",
      parteContraria: "Frigorífico Boi Bom Ltda",
      fase: "encerrado",
      responsavelId: "usr-pedro",
      valorCausa: 122000,
      criadoEm: dia(-510),
      descricao: "Acordo homologado, pago em duas parcelas.",
    },
    {
      id: "cas-castro",
      titulo: "Castro × INSS",
      clienteId: "cli-helena",
      numeroCNJ: montarCNJ(1001187, ano - 2, 4, 1, ORIGEM_FICTICIA),
      area: "previdenciario",
      tipoAcao: "Aposentadoria por tempo de contribuição",
      orgao: "5ª Vara do Juizado Especial Federal — São Luís",
      parteContraria: "INSS",
      fase: "encerrado",
      responsavelId: "usr-gabriel",
      valorCausa: 88000,
      criadoEm: dia(-690),
      descricao: "Benefício implantado e atrasados pagos por RPV.",
    },
    {
      id: "cas-mercantil",
      titulo: "Mercantil Norte × Distribuidora Sol",
      clienteId: "cli-mercantil",
      numeroCNJ: montarCNJ(790312, ano - 2, 8, 10, ORIGEM_FICTICIA),
      area: "civel",
      tipoAcao: "Cobrança de duplicatas",
      orgao: "8ª Vara Cível de São Luís",
      parteContraria: "Distribuidora Sol Ltda",
      fase: "encerrado",
      responsavelId: "usr-julia",
      valorCausa: 146000,
      criadoEm: dia(-630),
      descricao: "Acordo em duas parcelas, quitado.",
    },
    {
      id: "cas-silva-banco",
      titulo: "Silva × Banco Meridional",
      clienteId: "cli-maria",
      numeroCNJ: montarCNJ(771209, ano - 1, 8, 10, ORIGEM_FICTICIA),
      area: "consumidor",
      tipoAcao: "Tarifas indevidas",
      orgao: "2º Juizado Especial Cível de São Luís",
      parteContraria: "Banco Meridional S.A.",
      fase: "encerrado",
      responsavelId: "usr-julia",
      valorCausa: 12000,
      criadoEm: dia(-380),
      descricao: "Acordo homologado e pago.",
    },
  ];

  const sugestaoMendes = sugerirPrazo(util(0), 15);
  const sugestaoVidaPlena = sugerirPrazo(util(-1), 15);
  const sugestaoPadaria = sugerirPrazo(util(-1), 8);

  const andamentos: Andamento[] = [
    {
      id: "and-mendes-pub",
      casoId: "cas-mendes",
      data: util(0),
      tipo: "publicacao",
      titulo: "Intimação para réplica",
      descricao:
        "Fica a parte autora intimada para, querendo, manifestar-se sobre a contestação e documentos, no prazo de 15 (quinze) dias.",
      resumoIA: "A seguradora apresentou defesa. O juiz abriu prazo para respondermos (réplica).",
      sugestao: { titulo: "Réplica à contestação", diasUteis: 15, ...sugestaoMendes, responsavelId: "usr-pedro", estado: "pendente" },
    },
    {
      id: "and-vidaplena-pub",
      casoId: "cas-vidaplena",
      data: util(-1),
      tipo: "publicacao",
      titulo: "Intimação para contrarrazões",
      descricao: "Intime-se a parte apelada para apresentar contrarrazões ao recurso de apelação, no prazo de 15 (quinze) dias.",
      resumoIA: "A operadora recorreu da sentença. Temos prazo para responder ao recurso (contrarrazões).",
      sugestao: { titulo: "Contrarrazões à apelação", diasUteis: 15, ...sugestaoVidaPlena, responsavelId: "usr-julia", estado: "pendente" },
    },
    {
      id: "and-padaria-pub",
      casoId: "cas-padaria",
      data: util(-1),
      tipo: "publicacao",
      titulo: "Sentença publicada",
      descricao:
        "Julgo PARCIALMENTE PROCEDENTES os pedidos para reconhecer o vínculo no período indicado e condenar a reclamada ao pagamento das verbas discriminadas na fundamentação.",
      resumoIA: "Sentença parcialmente desfavorável ao cliente: vínculo reconhecido em parte. Cabe recurso ordinário.",
      sugestao: { titulo: "Recurso ordinário", diasUteis: 8, ...sugestaoPadaria, responsavelId: "usr-julia", estado: "pendente" },
    },
    {
      id: "and-ferreira-1",
      casoId: "cas-ferreira",
      data: util(-6),
      tipo: "andamento",
      titulo: "Audiência de instrução designada",
      descricao: "Designada audiência de instrução. Partes devem trazer testemunhas independentemente de intimação.",
    },
    {
      id: "and-ferreira-2",
      casoId: "cas-ferreira",
      data: dia(-48),
      tipo: "andamento",
      titulo: "Contestação juntada",
      descricao: "Reclamada apresentou contestação com documentos.",
    },
    {
      id: "and-ferreira-3",
      casoId: "cas-ferreira",
      data: dia(-20),
      tipo: "nota",
      titulo: "Reunião com o cliente",
      descricao: "João indicou duas testemunhas (colegas de rota). Confirmar presença na véspera.",
    },
    {
      id: "and-silva-1",
      casoId: "cas-silva-inss",
      data: dia(-30),
      tipo: "andamento",
      titulo: "Recurso do INSS recebido",
      descricao: "Recurso inominado interposto pelo INSS. Autos remetidos à Turma Recursal.",
    },
    {
      id: "and-silva-2",
      casoId: "cas-silva-inss",
      data: dia(-75),
      tipo: "andamento",
      titulo: "Sentença procedente",
      descricao: "Pedido julgado procedente para conceder aposentadoria por idade desde o requerimento.",
    },
    {
      id: "and-horizonte-1",
      casoId: "cas-horizonte-exec",
      data: dia(-14),
      tipo: "andamento",
      titulo: "Bloqueio parcial via SISBAJUD",
      descricao: "Bloqueados R$ 684.000,00 em contas da executada. Alvará de levantamento expedido.",
    },
    {
      id: "and-horizonte-2",
      casoId: "cas-horizonte-exec",
      data: dia(-52),
      tipo: "andamento",
      titulo: "Intimação para pagamento",
      descricao: "Executada intimada para pagar em 15 dias, sob pena de multa de 10%.",
    },
    {
      id: "and-souza-1",
      casoId: "cas-souza",
      data: dia(-11),
      tipo: "andamento",
      titulo: "Audiência de conciliação designada",
      descricao: "Designada audiência de conciliação presencial.",
    },
    {
      id: "and-souza-2",
      casoId: "cas-souza",
      data: dia(-41),
      tipo: "andamento",
      titulo: "Alimentos provisórios fixados",
      descricao: "Fixados alimentos provisórios em 25% dos rendimentos líquidos.",
    },
    {
      id: "and-lima-1",
      casoId: "cas-lima-inss",
      data: dia(-9),
      tipo: "andamento",
      titulo: "Perícia médica designada",
      descricao: "Designada perícia judicial. O autor deve comparecer com exames e laudos.",
    },
    {
      id: "and-costa-1",
      casoId: "cas-costa",
      data: dia(-17),
      tipo: "andamento",
      titulo: "Conclusos para sentença",
      descricao: "Autos conclusos para julgamento.",
    },
    {
      id: "and-rocha-1",
      casoId: "cas-rocha",
      data: dia(-22),
      tipo: "andamento",
      titulo: "Inventariante nomeada",
      descricao: "Teresa Rocha nomeada inventariante. Prazo para primeiras declarações.",
    },
    {
      id: "and-vidaplena-1",
      casoId: "cas-vidaplena",
      data: dia(-64),
      tipo: "andamento",
      titulo: "Sentença procedente",
      descricao: "Operadora condenada ao pagamento dos repasses glosados, com correção.",
    },
    {
      id: "and-silva-banco-1",
      casoId: "cas-silva-banco",
      data: dia(-88),
      tipo: "andamento",
      titulo: "Acordo homologado",
      descricao: "Acordo homologado por sentença. Valores pagos e processo arquivado.",
    },
  ];

  const prazos: Prazo[] = [
    {
      id: "prz-1",
      casoId: "cas-silva-inss",
      titulo: "Contrarrazões ao recurso inominado",
      dataFatal: forense(0),
      dataInterna: forense(-2),
      responsavelId: "usr-gabriel",
      origem: "ia",
    },
    {
      id: "prz-2",
      casoId: "cas-ferreira",
      titulo: "Rol de testemunhas",
      dataFatal: forense(1),
      dataInterna: forense(-1),
      responsavelId: "usr-pedro",
      origem: "manual",
    },
    {
      id: "prz-3",
      casoId: "cas-souza",
      titulo: "Juntar comprovantes de renda",
      dataFatal: forense(2),
      dataInterna: forense(0),
      responsavelId: "usr-gabriel",
      origem: "manual",
    },
    {
      id: "prz-4",
      casoId: "cas-lima-inss",
      titulo: "Quesitos para a perícia",
      dataFatal: forense(3),
      dataInterna: forense(1),
      responsavelId: "usr-gabriel",
      origem: "ia",
    },
    {
      id: "prz-5",
      casoId: "cas-horizonte-exec",
      titulo: "Indicar bens à penhora",
      dataFatal: forense(5),
      dataInterna: forense(3),
      responsavelId: "usr-pedro",
      origem: "ia",
    },
    {
      id: "prz-6",
      casoId: "cas-rocha",
      titulo: "Primeiras declarações",
      dataFatal: forense(9),
      dataInterna: forense(7),
      responsavelId: "usr-julia",
      origem: "ia",
    },
    {
      id: "prz-7",
      casoId: "cas-horizonte-cons",
      titulo: "Parecer sobre aditivo contratual",
      dataFatal: util(-1),
      dataInterna: util(-3),
      responsavelId: "usr-marcos",
      origem: "manual",
    },
    {
      id: "prz-8",
      casoId: "cas-costa",
      titulo: "Memoriais finais",
      dataFatal: forense(-8),
      dataInterna: forense(-10),
      responsavelId: "usr-julia",
      origem: "manual",
      concluidoEm: forense(-9),
    },
    {
      id: "prz-9",
      casoId: "cas-ferreira",
      titulo: "Réplica à contestação",
      dataFatal: forense(-12),
      dataInterna: forense(-14),
      responsavelId: "usr-pedro",
      origem: "ia",
      concluidoEm: forense(-13),
    },
    {
      id: "prz-10",
      casoId: "cas-vidaplena",
      titulo: "Embargos de declaração",
      dataFatal: forense(-20),
      dataInterna: forense(-22),
      responsavelId: "usr-julia",
      origem: "ia",
      concluidoEm: forense(-21),
    },
  ];

  const eventos: Evento[] = [
    {
      id: "evt-1",
      titulo: "Audiência de instrução — Ferreira × Transportadora Litoral",
      tipo: "audiencia",
      inicio: quando(forense(0), "10:00"),
      fim: quando(forense(0), "11:30"),
      local: "3ª Vara do Trabalho de São Luís",
      casoId: "cas-ferreira",
      clienteId: "cli-joao",
      responsavelId: "usr-pedro",
    },
    {
      id: "evt-2",
      titulo: "Consulta — Fernanda Dias",
      tipo: "consulta",
      inicio: quando(util(0), "15:00"),
      fim: quando(util(0), "15:45"),
      local: "Online (vídeo)",
      clienteId: "cli-fernanda",
      responsavelId: "usr-gabriel",
    },
    {
      id: "evt-3",
      titulo: "Reunião — Construtora Horizonte",
      tipo: "reuniao",
      inicio: quando(util(1), "09:00"),
      fim: quando(util(1), "10:00"),
      local: "Escritório",
      clienteId: "cli-horizonte",
      casoId: "cas-horizonte-cons",
      responsavelId: "usr-pedro",
    },
    {
      id: "evt-4",
      titulo: "Audiência de conciliação — Souza",
      tipo: "audiencia",
      inicio: quando(forense(1), "14:30"),
      fim: quando(forense(1), "15:30"),
      local: "2ª Vara de Família de São Luís",
      casoId: "cas-souza",
      clienteId: "cli-anapaula",
      responsavelId: "usr-gabriel",
    },
    {
      id: "evt-5",
      titulo: "Perícia médica — Lima × INSS",
      tipo: "outro",
      inicio: quando(forense(2), "11:00"),
      fim: quando(forense(2), "12:00"),
      local: "Justiça Federal — sala de perícias",
      casoId: "cas-lima-inss",
      clienteId: "cli-roberto",
      responsavelId: "usr-gabriel",
    },
    {
      id: "evt-6",
      titulo: "Consulta — Bruno Martins",
      tipo: "consulta",
      inicio: quando(util(1), "16:00"),
      fim: quando(util(1), "16:45"),
      local: "Online (vídeo)",
      clienteId: "cli-bruno",
      responsavelId: "usr-pedro",
      criadoPorIA: true,
    },
    {
      id: "evt-7",
      titulo: "Reunião de sócios",
      tipo: "reuniao",
      inicio: quando(util(4), "10:00"),
      fim: quando(util(4), "11:00"),
      local: "Escritório",
      responsavelId: "usr-gabriel",
    },
    {
      id: "evt-8",
      titulo: "Audiência de conciliação — Mendes × Seguradora Atlântica",
      tipo: "audiencia",
      inicio: quando(forense(7), "09:30"),
      fim: quando(forense(7), "10:15"),
      local: "7º Juizado Especial Cível",
      casoId: "cas-mendes",
      clienteId: "cli-carlos",
      responsavelId: "usr-pedro",
    },
    {
      id: "evt-9",
      titulo: "Reunião — Clínica Vida Plena",
      tipo: "reuniao",
      inicio: quando(util(8), "15:00"),
      fim: quando(util(8), "16:00"),
      local: "Sede da clínica",
      clienteId: "cli-vidaplena",
      casoId: "cas-vidaplena",
      responsavelId: "usr-julia",
    },
    {
      id: "evt-10",
      titulo: "Consulta — Paulo Henrique Araújo",
      tipo: "consulta",
      inicio: quando(util(-1), "10:00"),
      fim: quando(util(-1), "10:45"),
      local: "Escritório",
      clienteId: "cli-paulo",
      responsavelId: "usr-gabriel",
    },
    {
      id: "evt-11",
      titulo: "Audiência una — Pão Dourado",
      tipo: "audiencia",
      inicio: quando(forense(-9), "09:00"),
      fim: quando(forense(-9), "10:30"),
      local: "1ª Vara do Trabalho de São Luís",
      casoId: "cas-padaria",
      clienteId: "cli-padaria",
      responsavelId: "usr-julia",
    },
  ];

  const contratos: Contrato[] = [
    {
      id: "ctr-horizonte",
      clienteId: "cli-horizonte",
      casoId: "cas-horizonte-cons",
      tipo: "mensal",
      descricao: "Assessoria jurídica mensal",
      valorTotal: 6500,
      inicio: dia(-600),
      ativo: true,
    },
    {
      id: "ctr-horizonte-exito",
      clienteId: "cli-horizonte",
      casoId: "cas-horizonte-exec",
      tipo: "exito",
      descricao: "30% sobre o valor recuperado",
      valorTotal: 0,
      percentualExito: 30,
      inicio: dia(-600),
      ativo: true,
    },
    {
      id: "ctr-vidaplena",
      clienteId: "cli-vidaplena",
      casoId: "cas-vidaplena",
      tipo: "mensal",
      descricao: "Assessoria jurídica mensal",
      valorTotal: 4800,
      inicio: dia(-330),
      ativo: true,
    },
    {
      id: "ctr-maria",
      clienteId: "cli-maria",
      casoId: "cas-silva-inss",
      tipo: "exito",
      descricao: "30% sobre os atrasados",
      valorTotal: 0,
      percentualExito: 30,
      inicio: dia(-400),
      ativo: true,
    },
    {
      id: "ctr-joao",
      clienteId: "cli-joao",
      casoId: "cas-ferreira",
      tipo: "hibrido",
      descricao: "Entrada + 25% sobre o proveito",
      valorTotal: 1500,
      percentualExito: 25,
      inicio: dia(-230),
      ativo: true,
    },
    {
      id: "ctr-anapaula",
      clienteId: "cli-anapaula",
      casoId: "cas-souza",
      tipo: "parcelado",
      descricao: "Honorários em 6 parcelas",
      valorTotal: 6000,
      inicio: dia(-90),
      ativo: true,
    },
    {
      id: "ctr-carlos",
      clienteId: "cli-carlos",
      casoId: "cas-mendes",
      tipo: "fixo",
      descricao: "Honorários em 2 parcelas",
      valorTotal: 3500,
      inicio: dia(-38),
      ativo: true,
    },
    {
      id: "ctr-padaria",
      clienteId: "cli-padaria",
      casoId: "cas-padaria",
      tipo: "parcelado",
      descricao: "Defesa trabalhista em 8 parcelas",
      valorTotal: 8000,
      inicio: dia(-145),
      ativo: true,
    },
    {
      id: "ctr-luciana",
      clienteId: "cli-luciana",
      casoId: "cas-costa",
      tipo: "exito",
      descricao: "30% sobre o proveito",
      valorTotal: 0,
      percentualExito: 30,
      inicio: dia(-200),
      ativo: true,
    },
    {
      id: "ctr-roberto",
      clienteId: "cli-roberto",
      casoId: "cas-lima-inss",
      tipo: "exito",
      descricao: "30% sobre os atrasados",
      valorTotal: 0,
      percentualExito: 30,
      inicio: dia(-125),
      ativo: true,
    },
    {
      id: "ctr-teresa",
      clienteId: "cli-teresa",
      casoId: "cas-rocha",
      tipo: "hibrido",
      descricao: "6 parcelas + 5% sobre o monte",
      valorTotal: 12000,
      percentualExito: 5,
      inicio: dia(-60),
      ativo: true,
    },
  ];

  const lancamentos: Lancamento[] = [];
  let sequencia = 0;
  const novoId = () => `lan-${++sequencia}`;
  const antesDeHoje = (dataISO: string) => dataISO < hojeISO;

  /** Parcela que, se já venceu, foi paga no próprio dia (ou com poucos dias de atraso). */
  const receita = (dados: Omit<Lancamento, "id" | "tipo" | "pagoEm">, opcoes: { emAberto?: boolean; atrasoDias?: number } = {}) => {
    const venceu = antesDeHoje(dados.vencimento);
    let pagoEm: string | undefined;
    if (venceu && !opcoes.emAberto) {
      const pagamento = addDays(new Date(`${dados.vencimento}T00:00:00`), opcoes.atrasoDias ?? 0);
      pagoEm = paraISO(pagamento < base ? pagamento : addDays(base, -1));
    }
    lancamentos.push({ id: novoId(), tipo: "receita", ...dados, pagoEm });
  };

  // Mensalidades (partido): dia fixo do mês, últimos 6 meses + o próximo.
  for (let m = -5; m <= 1; m++) {
    receita({
      descricao: "Mensalidade — assessoria jurídica",
      valor: 6500,
      vencimento: diaDoMes(m, 5),
      forma: "boleto",
      clienteId: "cli-horizonte",
      casoId: "cas-horizonte-cons",
      contratoId: "ctr-horizonte",
    });
    receita(
      {
        descricao: "Mensalidade — assessoria jurídica",
        valor: 4800,
        vencimento: diaDoMes(m, 10),
        forma: "pix",
        clienteId: "cli-vidaplena",
        casoId: "cas-vidaplena",
        contratoId: "ctr-vidaplena",
      },
      { atrasoDias: m === -2 ? 6 : 0 },
    );
  }

  // Parcelados: vencimentos relativos a hoje, para sempre haver atrasos e próximos.
  const parcelar = (
    deslocamentos: number[],
    dados: Omit<Lancamento, "id" | "tipo" | "pagoEm" | "vencimento" | "descricao">,
    rotulo: string,
    emAberto: number[] = [],
  ) => {
    deslocamentos.forEach((deslocamento, indice) => {
      receita(
        { ...dados, descricao: `${rotulo} — parcela ${indice + 1}/${deslocamentos.length}`, vencimento: dia(deslocamento) },
        { emAberto: emAberto.includes(indice) },
      );
    });
  };
  parcelar(
    [-80, -50, -20, 10, 40, 70],
    { valor: 1000, forma: "pix", clienteId: "cli-anapaula", casoId: "cas-souza", contratoId: "ctr-anapaula" },
    "Honorários — divórcio",
  );
  parcelar(
    [-25, 5],
    { valor: 1750, forma: "pix", clienteId: "cli-carlos", casoId: "cas-mendes", contratoId: "ctr-carlos" },
    "Honorários — ação contra seguradora",
  );
  parcelar(
    [-132, -102, -72, -42, -12, 18, 48, 78],
    { valor: 1000, forma: "boleto", clienteId: "cli-padaria", casoId: "cas-padaria", contratoId: "ctr-padaria" },
    "Honorários — defesa trabalhista",
    [4],
  );
  parcelar(
    [-35, -5, 25, 55, 85, 115],
    { valor: 2000, forma: "boleto", clienteId: "cli-teresa", casoId: "cas-rocha", contratoId: "ctr-teresa" },
    "Honorários — inventário",
    [1],
  );
  receita({
    descricao: "Honorários — entrada",
    valor: 1500,
    vencimento: dia(-228),
    forma: "pix",
    clienteId: "cli-joao",
    casoId: "cas-ferreira",
    contratoId: "ctr-joao",
  });

  // Honorários de êxito (variam de mês para mês). Cada um está ligado ao seu caso.
  const exitos: Array<[deslocamento: number, valor: number, descricao: string, clienteId: string, casoId: string, contratoId?: string]> = [
    [-150, 18400, "Honorários de êxito — acordo Barros × Frigorífico (1ª parcela)", "cli-antonio", "cas-barros"],
    [-118, 26500, "Honorários de êxito — RPV Castro × INSS", "cli-helena", "cas-castro"],
    [-88, 3600, "Honorários de êxito — acordo Silva × Banco Meridional", "cli-maria", "cas-silva-banco"],
    [-85, 21900, "Honorários de êxito — acordo Mercantil Norte (1ª parcela)", "cli-mercantil", "cas-mercantil"],
    [-55, 21900, "Honorários de êxito — acordo Mercantil Norte (2ª parcela)", "cli-mercantil", "cas-mercantil"],
    [-27, 18400, "Honorários de êxito — acordo Barros × Frigorífico (2ª parcela)", "cli-antonio", "cas-barros"],
    // 30% dos R$ 68.400,00 (× ESCALA_DOS_VALORES) bloqueados na execução (ver andamento do caso).
    [-1, 20520, "Honorários de êxito — levantamento Horizonte × Aço Norte", "cli-horizonte", "cas-horizonte-exec", "ctr-horizonte-exito"],
  ];
  for (const [deslocamento, valor, descricao, clienteId, casoId, contratoId] of exitos) {
    receita({ descricao, valor, vencimento: dia(deslocamento), forma: "transferencia", clienteId, casoId, contratoId });
  }
  for (const deslocamento of [-140, -121, -95, -77, -60, -41, -33, -19, -8, -2]) {
    receita({ descricao: "Consulta avulsa", valor: 450, vencimento: dia(deslocamento), forma: "pix" });
  }

  // Despesas fixas do escritório.
  for (let m = -5; m <= 0; m++) {
    const fixas: Array<[number, number, string, Lancamento["categoria"]]> = [
      [5, 14500, "Folha e pró-labore", "pessoal"],
      [10, 3200, "Aluguel e condomínio", "aluguel"],
      [12, 890, "Sistemas e assinaturas", "sistemas"],
      [15, 1800, "Marketing e anúncios", "marketing"],
    ];
    for (const [diaFixo, valor, descricao, categoria] of fixas) {
      const vencimento = diaDoMes(m, diaFixo);
      lancamentos.push({
        id: novoId(),
        tipo: "despesa",
        descricao,
        valor,
        vencimento,
        categoria,
        forma: "transferencia",
        pagoEm: antesDeHoje(vencimento) ? vencimento : undefined,
      });
    }
  }
  for (const [deslocamento, valor, descricao] of [
    [-100, 480, "Custas — distribuição"],
    [-47, 1250, "Custas — perícia contábil"],
    [-9, 320, "Custas — diligência de oficial"],
    [6, 640, "Custas — preparo recursal"],
  ] as Array<[number, number, string]>) {
    const vencimento = dia(deslocamento);
    lancamentos.push({
      id: novoId(),
      tipo: "despesa",
      descricao,
      valor,
      vencimento,
      categoria: "custas",
      forma: "boleto",
      pagoEm: antesDeHoje(vencimento) ? vencimento : undefined,
    });
  }

  let sequenciaMensagem = 0;
  const mensagem = (de: Mensagem["de"], texto: string, dataISO: string, hora: string): Mensagem => ({
    id: `msg-${++sequenciaMensagem}`,
    de,
    texto,
    enviadaEm: quando(dataISO, hora),
  });
  const ontem = dia(-1);
  const diaConsultaBruno = format(new Date(`${util(1)}T00:00:00`), "dd/MM");

  const conversas: Conversa[] = [
    {
      id: "cvs-sandra",
      nome: "Sandra Moreira",
      telefone: "98900000015",
      clienteId: "cli-sandra",
      modo: "humano",
      naoLidas: 1,
      mensagens: [
        mensagem("cliente", "Oi! Estão cobrando uma compra no meu cartão que eu não fiz. Vocês cuidam disso?", hojeISO, "08:47"),
        mensagem(
          "ia",
          "Bom dia, Sandra! Aqui é o atendimento virtual do escritório. Cuidamos, sim: é um caso de direito do consumidor. A cobrança apareceu em qual mês e de quanto foi?",
          hojeISO,
          "08:47",
        ),
        mensagem("cliente", "Mês passado, R$ 2.300. Quanto eu consigo de indenização?", hojeISO, "08:49"),
        mensagem(
          "ia",
          "Entendi. Valores e chances de ganho quem avalia é o advogado, depois de ver os documentos. Posso agendar uma consulta com a Dra. Júlia para você?",
          hojeISO,
          "08:49",
        ),
        mensagem("cliente", "Prefiro falar com a advogada agora, se der.", hojeISO, "08:51"),
        mensagem("ia", "Claro! Já avisei a equipe e alguém continua com você por aqui em instantes.", hojeISO, "08:51"),
      ],
    },
    {
      id: "cvs-maria",
      nome: "Maria Silva",
      telefone: "98900000001",
      clienteId: "cli-maria",
      modo: "ia",
      naoLidas: 0,
      mensagens: [
        mensagem("cliente", "Bom dia! Tem novidade do meu processo da aposentadoria?", hojeISO, "08:12"),
        mensagem(
          "ia",
          "Bom dia, Maria! A senhora ganhou em primeira instância, e o INSS recorreu. Agora o processo está na Turma Recursal, que vai julgar o recurso. O Dr. Gabriel já está preparando a nossa resposta. Assim que houver decisão, eu aviso por aqui.",
          hojeISO,
          "08:12",
        ),
        mensagem("cliente", "Graças a Deus. Obrigada!", hojeISO, "08:14"),
      ],
    },
    {
      id: "cvs-bruno",
      nome: "Bruno Martins",
      telefone: "98900000011",
      clienteId: "cli-bruno",
      modo: "ia",
      naoLidas: 0,
      mensagens: [
        mensagem("cliente", "Boa noite! Fui demitido e não recebi minhas verbas. Vocês atendem?", ontem, "22:41"),
        mensagem(
          "ia",
          "Boa noite! Aqui é o atendimento virtual do escritório. Atendemos, sim. Quando foi a demissão e quanto tempo você trabalhou lá?",
          ontem,
          "22:41",
        ),
        mensagem("cliente", "Mês passado. Trabalhei 4 anos.", ontem, "22:42"),
        mensagem(
          "ia",
          `Perfeito! O Dr. Pedro tem horário no dia ${diaConsultaBruno}, às 10h ou às 16h (online). Qual prefere?`,
          ontem,
          "22:42",
        ),
        mensagem("cliente", "16h", ontem, "22:43"),
        mensagem(
          "ia",
          `Agendado para ${diaConsultaBruno} às 16h. Te lembro 1h antes. Se puder, envie por aqui a carteira de trabalho e o termo de rescisão.`,
          ontem,
          "22:43",
        ),
      ],
    },
    {
      id: "cvs-padaria",
      nome: "Padaria Pão Dourado",
      telefone: "98900000006",
      clienteId: "cli-padaria",
      modo: "humano",
      naoLidas: 0,
      mensagens: [
        mensagem(
          "ia",
          "Olá! Passando para lembrar que a parcela 5/8 dos honorários (R$ 10.000,00) venceu há alguns dias. Posso enviar o Pix para pagamento?",
          dia(-3),
          "09:30",
        ),
        mensagem("cliente", "Oi, essa semana foi apertada. Consigo pagar na sexta, pode ser?", dia(-3), "11:02"),
        mensagem("equipe", "Pode sim, combinado! Sexta eu envio o Pix por aqui. — Carla, financeiro", dia(-3), "11:15"),
      ],
    },
    {
      id: "cvs-anapaula",
      nome: "Ana Paula Souza",
      telefone: "98900000004",
      clienteId: "cli-anapaula",
      modo: "ia",
      naoLidas: 0,
      mensagens: [
        mensagem(
          "ia",
          "Olá, Ana Paula! Lembrete: sua audiência de conciliação está chegando, às 14h30, na 2ª Vara de Família. Chegue 20 minutos antes, com documento com foto. O Dr. Gabriel estará com você.",
          ontem,
          "17:00",
        ),
        mensagem("cliente", "Obrigada! Estarei lá.", ontem, "17:20"),
      ],
    },
  ];

  // CRM (contatos em negociação, perdidos e histórico) e o volume de casos de um escritório movimentado.
  const interacoes = completarDemonstracao({ clientes, casos }, { dia, hojeISO, origemCNJ: ORIGEM_FICTICIA });

  // Valores em dinheiro escritos acima em escala menor e multiplicados aqui, num ponto só.
  // Textos que citam valores (proposta, bloqueio, lembrete de parcela) já estão na escala final.
  for (const caso of casos) caso.valorCausa *= ESCALA_DOS_VALORES;
  for (const contrato of contratos) contrato.valorTotal *= ESCALA_DOS_VALORES;
  for (const lancamento of lancamentos) lancamento.valor *= ESCALA_DOS_VALORES;

  return {
    escritorio: { nome: "Ogando & Rocha Advogados", cidade: "São Luís - MA", plano: "completo" },
    usuarios,
    clientes,
    casos,
    andamentos,
    prazos,
    eventos,
    contratos,
    lancamentos,
    conversas,
    interacoes,
    geradoEm: hojeISO,
  };
}
