import {
  AlarmClock,
  Bot,
  CalendarDays,
  Check,
  KeyRound,
  LayoutDashboard,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/marca/Logo";
import { BotaoLink } from "@/components/ui/Botao";
import { MARCA } from "@/lib/marca";
import { linkWhatsApp, MENSAGENS_VENDA } from "@/lib/whatsapp";
import { IconeWhatsApp, Secao, Sobretitulo, Telefone, TituloSecao } from "./Pecas";
import { Revelar } from "./Revelar";

/* -------------------------------- Problema -------------------------------- */

const DORES = [
  {
    titulo: "Prazo perdido",
    texto: "Publicações lidas no improviso e prazos controlados de cabeça. Um erro pode custar o caso e o cliente.",
  },
  {
    titulo: "Honorário não cobrado",
    texto: "Parcela atrasada sem lembrete, êxito esquecido depois do alvará, despesa que nunca volta ao caixa.",
  },
  {
    titulo: "Cliente sem resposta",
    texto: "Quem escreve às 22h e só recebe resposta no dia seguinte muitas vezes já fechou com outro escritório.",
  },
];

export function Problema() {
  return (
    <Secao>
      <Revelar efeito="foco">
        <Sobretitulo>O problema</Sobretitulo>
        <TituloSecao>
          O advogado é técnico, gestor, vendedor e cobrador. <span className="text-sutil">Ao mesmo tempo.</span>
        </TituloSecao>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mudo">
          Planilha, agenda do celular, WhatsApp pessoal, pasta no Drive e extrato do banco. Ferramentas soltas, que não conversam entre si.
          O escritório perde dinheiro em três pontos.
        </p>
      </Revelar>
      <ol className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
        {DORES.map((dor, indice) => (
          <Revelar como="li" key={dor.titulo} atraso={indice * 140} className="linha-viva border-t border-linha-forte pt-6">
            <p className="texto-ouro-escuro text-4xl font-light tracking-[-0.04em]">0{indice + 1}</p>
            <h3 className="mt-4 text-xl font-semibold">{dor.titulo}</h3>
            <p className="mt-2 leading-relaxed text-mudo">{dor.texto}</p>
          </Revelar>
        ))}
      </ol>
    </Secao>
  );
}

/* -------------------------------- Recursos -------------------------------- */

const RECURSOS: Array<{ icone: LucideIcon; titulo: string; texto: string }> = [
  {
    icone: Scale,
    titulo: "Casos e processos",
    texto: "Cada caso com número CNJ, fase, responsável, andamentos e notas da equipe. Em lista ou em quadro por fase.",
  },
  {
    icone: AlarmClock,
    titulo: "Prazos em dias úteis",
    texto: "Data fatal e data interna em cada prazo. A contagem considera fins de semana, feriados nacionais e o recesso forense.",
  },
  {
    icone: CalendarDays,
    titulo: "Agenda",
    texto: "Audiências, reuniões, consultas e prazos no mesmo calendário, com filtro por advogado.",
  },
  {
    icone: Wallet,
    titulo: "Financeiro",
    texto: "Contratos de honorários, parcelas, êxito, despesas e inadimplência. A cobrança sai pelo WhatsApp com um clique.",
  },
  {
    icone: Users,
    titulo: "Clientes e captação",
    texto: "Cadastro completo e funil de novos clientes, do primeiro contato ao contrato assinado.",
  },
  {
    icone: LayoutDashboard,
    titulo: "Visão geral",
    texto: "O recebido do mês, o que está a receber, os atrasos e os prazos do dia, na primeira tela.",
  },
];

export function Recursos() {
  return (
    <Secao id="recursos" tom="cinza">
      <Revelar efeito="foco">
        <Sobretitulo>Recursos</Sobretitulo>
        <TituloSecao>
          Um só sistema para o escritório inteiro. <span className="text-sutil">Sem planilha paralela.</span>
        </TituloSecao>
      </Revelar>
      <ul className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RECURSOS.map((recurso, indice) => (
          <Revelar como="li" key={recurso.titulo} efeito="escala" atraso={(indice % 3) * 110}>
            <div className="cartao-vivo h-full rounded-[1.75rem] bg-white p-7 shadow-cartao ring-1 ring-black/[0.04]">
              <recurso.icone className="icone-vivo size-7 text-ouro-600" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="mt-6 text-lg font-semibold">{recurso.titulo}</h3>
              <p className="mt-2 leading-relaxed text-mudo">{recurso.texto}</p>
            </div>
          </Revelar>
        ))}
      </ul>
    </Secao>
  );
}

/* ----------------------------------- IA ----------------------------------- */

function ListaIA({ itens }: { itens: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {itens.map((item) => (
        <li key={item} className="flex gap-3 text-[1.02rem] leading-relaxed text-white/75">
          <Check className="mt-1 size-4 shrink-0 text-ouro-300" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function InteligenciaArtificial() {
  return (
    <Secao id="ia" tom="escuro" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 right-0 size-[40rem] rounded-full bg-ouro-400/10 blur-[120px]"
        aria-hidden="true"
      />
      <div className="relative">
        <Revelar efeito="foco">
          <Sobretitulo escuro>Inteligência artificial</Sobretitulo>
          <TituloSecao>
            Uma IA que trabalha junto. <span className="text-white/40">Não é só um chat.</span>
          </TituloSecao>
        </Revelar>

        <div className="mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Revelar>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ouro-300">
              <Sparkles className="size-4" aria-hidden="true" />
              Para o advogado
            </p>
            <h3 className="mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Começa o dia sabendo de tudo.</h3>
            <ListaIA
              itens={[
                "Resumo do dia: audiências, prazos, publicações e pagamentos.",
                "Lê cada publicação, explica em linguagem simples e sugere o prazo. Você confirma.",
                "Responde perguntas sobre casos, prazos, clientes e financeiro do escritório.",
                "Redige rascunhos de mensagens e minutas para você revisar.",
              ]}
            />
          </Revelar>
          <Revelar efeito="escala" atraso={120} className="flex justify-center">
            <Telefone
              nome="Vade IA"
              legenda="assistente do escritório"
              baloes={[
                {
                  de: "sistema",
                  hora: "07:00",
                  texto: (
                    <>
                      Bom dia, Dra. Ana! Seu dia:
                      <br />
                      <br />
                      <strong>1 audiência</strong>: 10h, Ferreira (3ª Vara do Trabalho)
                      <br />
                      <strong>1 prazo vence hoje</strong>: contrarrazões em Silva × INSS
                      <br />
                      <strong>3 publicações novas</strong>, com prazo sugerido
                    </>
                  ),
                },
                { de: "cliente", hora: "07:12", texto: "resume a publicação do Mendes" },
                {
                  de: "sistema",
                  hora: "07:12",
                  texto:
                    "A seguradora apresentou defesa. Temos 15 dias úteis para a réplica. Sugiro data interna dois dias antes, com o Dr. Pedro. Confirmo?",
                },
                { de: "cliente", hora: "07:13", texto: "confirma" },
              ]}
            />
          </Revelar>
        </div>

        <div className="mt-24 grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Revelar efeito="escala" className="order-2 flex justify-center lg:order-1">
            <Telefone
              nome="Seu escritório"
              legenda="atendimento virtual"
              baloes={[
                { de: "cliente", hora: "22:41", texto: "Boa noite! Fui demitido e não recebi minhas verbas. Vocês atendem?" },
                {
                  de: "sistema",
                  hora: "22:41",
                  texto:
                    "Boa noite! Aqui é o atendimento virtual do escritório. Atendemos, sim. Quando foi a demissão e quanto tempo você trabalhou lá?",
                },
                { de: "cliente", hora: "22:42", texto: "Mês passado. Trabalhei 4 anos." },
                {
                  de: "sistema",
                  hora: "22:42",
                  texto: "Perfeito! O Dr. Pedro tem horário amanhã às 10h ou às 16h (online). Qual prefere?",
                },
                { de: "cliente", hora: "22:43", texto: "16h" },
                { de: "sistema", hora: "22:43", texto: "Agendado para amanhã às 16h. Eu lembro você 1 hora antes." },
              ]}
            />
          </Revelar>
          <Revelar atraso={120} className="order-1 lg:order-2">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-ouro-300">
              <UserRoundCheck className="size-4" aria-hidden="true" />
              Para os seus clientes
            </p>
            <h3 className="mt-3 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Atendimento a qualquer hora.</h3>
            <ListaIA
              itens={[
                "Faz a triagem de quem chega, entende o caso e agenda a consulta.",
                "Explica o andamento do processo em linguagem simples.",
                "Passa a conversa para a equipe quando a pessoa pede ou o assunto exige.",
                "Sempre se identifica como atendimento virtual e não dá parecer jurídico.",
              ]}
            />
          </Revelar>
        </div>

        <Revelar className="mt-20 flex flex-col gap-4 rounded-[1.75rem] bg-white/[0.05] p-7 ring-1 ring-white/10 sm:flex-row sm:items-center sm:gap-6">
          <ShieldCheck className="size-9 shrink-0 text-ouro-300" strokeWidth={1.4} aria-hidden="true" />
          <p className="text-[1.02rem] leading-relaxed text-white/75">
            <strong className="font-semibold text-white">A IA sugere. O advogado decide.</strong> Nenhum prazo entra na agenda sem a sua
            confirmação, e o atendente não faz captação ativa: só responde quem procurou o escritório, como pede a OAB.
          </p>
        </Revelar>
      </div>
    </Secao>
  );
}

/* -------------------------------- Segurança ------------------------------- */

const PROTECOES: Array<{ icone: LucideIcon; titulo: string; texto: string }> = [
  {
    icone: Lock,
    titulo: "Conexão e navegador protegidos",
    texto:
      "Todo o tráfego é criptografado, e o site só executa o próprio código: um script injetado por terceiros é bloqueado pelo navegador.",
  },
  {
    icone: KeyRound,
    titulo: "Acesso com várias travas",
    texto:
      "Sessão que scripts não conseguem ler, limite de tentativas de login com espera crescente e recusa de chamadas vindas de outros sites.",
  },
  {
    icone: Bot,
    titulo: "IA com rédea curta",
    texto:
      "A IA só recebe os dados do próprio escritório, só agenda em horários que o sistema ofereceu e trata mensagens de clientes como informação, nunca como ordem.",
  },
  {
    icone: ShieldCheck,
    titulo: "Privacidade e LGPD",
    texto:
      "Sem rastreadores nem anúncios. No banco de dados, ligado na implantação, cada escritório fica isolado dos demais e toda alteração deixa registro.",
  },
];

export function Seguranca() {
  return (
    <Secao id="seguranca" tom="cinza">
      <Revelar efeito="foco">
        <Sobretitulo>Segurança</Sobretitulo>
        <TituloSecao>
          Sigilo profissional levado a sério. <span className="text-sutil">Em todas as camadas.</span>
        </TituloSecao>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mudo">
          O {MARCA.nome} é construído em camadas de defesa: se uma falhar, a seguinte segura. O que o site coleta, e o que não coleta, está
          na nossa{" "}
          <Link href="/privacidade" className="font-medium text-tinta underline underline-offset-4">
            política de privacidade
          </Link>
          .
        </p>
      </Revelar>
      <ul className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PROTECOES.map((protecao, indice) => (
          <Revelar como="li" key={protecao.titulo} efeito="escala" atraso={(indice % 2) * 110}>
            <div className="cartao-vivo flex h-full gap-5 rounded-[1.75rem] bg-white p-7 shadow-cartao ring-1 ring-black/[0.04]">
              <protecao.icone className="icone-vivo mt-0.5 size-7 shrink-0 text-ouro-600" strokeWidth={1.5} aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold">{protecao.titulo}</h3>
                <p className="mt-2 leading-relaxed text-mudo">{protecao.texto}</p>
              </div>
            </div>
          </Revelar>
        ))}
      </ul>
    </Secao>
  );
}

/* ------------------------------- Lançamento ------------------------------- */

const PRONTO = [
  "Visão geral com o resumo do dia",
  "Casos, prazos e agenda",
  "Financeiro: contratos, cobranças e despesas",
  "Clientes e funil de captação",
  "Assistente e atendente de IA",
];
const NA_IMPLANTACAO = [
  "Número oficial de WhatsApp do escritório",
  "Captura automática de publicações dos tribunais",
  "Cobrança por Pix e boleto com baixa automática",
  "Migração dos dados que você já tem",
];

export function Lancamento() {
  return (
    <Secao>
      <Revelar efeito="foco">
        <Sobretitulo>Escritórios fundadores</Sobretitulo>
        <TituloSecao>
          Estamos abrindo as primeiras vagas. <span className="text-sutil">Com implantação feita por nós.</span>
        </TituloSecao>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mudo">
          O {MARCA.nome} está em lançamento. Os primeiros escritórios entram com acompanhamento direto da nossa equipe e participam das
          decisões do produto. Veja com transparência o que já funciona e o que é ligado junto com o seu escritório.
        </p>
      </Revelar>
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Revelar efeito="escala" className="rounded-[1.75rem] bg-fundo p-7 sm:p-8">
          <h3 className="text-lg font-semibold">Pronto para usar hoje</h3>
          <p className="mt-1 text-sm text-mudo">Tudo isto está na demonstração aberta.</p>
          <ul className="mt-6 space-y-3">
            {PRONTO.map((item) => (
              <li key={item} className="flex gap-3 leading-relaxed">
                <Check className="mt-1 size-4 shrink-0 text-ok" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Revelar>
        <Revelar efeito="escala" atraso={130} className="rounded-[1.75rem] bg-noite-1 p-7 text-white sm:p-8">
          <h3 className="text-lg font-semibold">Ligado na implantação do seu escritório</h3>
          <p className="mt-1 text-sm text-white/50">Depende de contas e dados do próprio escritório.</p>
          <ul className="mt-6 space-y-3">
            {NA_IMPLANTACAO.map((item) => (
              <li key={item} className="flex gap-3 leading-relaxed text-white/80">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ouro-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Revelar>
      </div>
    </Secao>
  );
}

/* --------------------------------- Dúvidas -------------------------------- */

const DUVIDAS = [
  {
    pergunta: "Como funciona a contratação?",
    resposta:
      "Você chama no WhatsApp, fazemos uma demonstração de 30 minutos com a rotina do seu escritório e combinamos a implantação. A configuração e a migração dos seus dados ficam por nossa conta.",
  },
  {
    pergunta: "Posso conhecer antes de contratar?",
    resposta:
      "Sim. A demonstração é aberta e não pede cadastro: você entra em um escritório fictício e usa o sistema à vontade. O que você fizer lá fica só no seu navegador.",
  },
  {
    pergunta: "A IA substitui o advogado?",
    resposta:
      "Não. Ela cuida do que é repetitivo: resume publicações, sugere prazos, organiza o dia e faz o primeiro atendimento. Parecer, estratégia e decisão continuam com o advogado, e todo prazo sugerido precisa da sua confirmação.",
  },
  {
    pergunta: "Como a IA lida com as regras de publicidade da OAB?",
    resposta:
      "O atendente se identifica como atendimento virtual, não dá parecer nem promete resultado, não aborda ninguém por conta própria e passa a conversa para a equipe sempre que a pessoa pede ou o assunto exige. As mensagens são configuráveis, e a responsabilidade final pelo atendimento continua sendo do escritório.",
  },
  {
    pergunta: "Os dados do escritório ficam seguros?",
    resposta:
      "O site só aceita conexão criptografada, bloqueia scripts de terceiros, limita tentativas de login e não usa rastreadores. A demonstração guarda os dados só no seu navegador, por isso não cadastre nela clientes reais. Na implantação, o banco de dados isola cada escritório dos demais e registra toda alteração.",
  },
  {
    pergunta: "O que já funciona e o que ainda depende da implantação?",
    resposta:
      "Painel, casos, prazos, agenda, financeiro, clientes e a IA já funcionam na demonstração. O número oficial de WhatsApp, a captura de publicações dos tribunais e a cobrança por Pix e boleto são ligados na implantação, porque dependem de contas do próprio escritório.",
  },
];

export function Duvidas() {
  return (
    <Secao id="duvidas">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <Revelar efeito="foco">
          <Sobretitulo>Dúvidas</Sobretitulo>
          <TituloSecao className="text-[2rem] sm:text-[2.6rem]">Perguntas que os advogados fazem.</TituloSecao>
          <p className="mt-5 leading-relaxed text-mudo">
            Não achou a sua?{" "}
            <a
              href={linkWhatsApp(`Olá! Tenho uma dúvida sobre o ${MARCA.nome}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-tinta underline underline-offset-4"
            >
              Pergunte no WhatsApp
            </a>
            .
          </p>
        </Revelar>
        <Revelar atraso={120} className="divide-y divide-linha-forte border-y border-linha-forte">
          {DUVIDAS.map((duvida) => (
            <details key={duvida.pergunta} className="group py-5">
              <summary className="flex list-none items-center justify-between gap-4 text-lg font-semibold transition-colors hover:text-ouro-700 [&::-webkit-details-marker]:hidden">
                {duvida.pergunta}
                <span
                  className="relative size-5 shrink-0 text-mudo transition-transform duration-300 group-open:rotate-180"
                  aria-hidden="true"
                >
                  <span className="absolute top-1/2 left-0 h-0.5 w-5 -translate-y-1/2 rounded-full bg-current" />
                  <span className="absolute top-0 left-1/2 h-5 w-0.5 -translate-x-1/2 rounded-full bg-current transition-[rotate,opacity] duration-300 group-open:rotate-90 group-open:opacity-0" />
                </span>
              </summary>
              <p className="resposta-viva mt-3 max-w-2xl leading-relaxed text-mudo">{duvida.resposta}</p>
            </details>
          ))}
        </Revelar>
      </div>
    </Secao>
  );
}

/* ------------------------------ Chamada final ------------------------------ */

export function ChamadaFinal() {
  return (
    <section className="relative overflow-hidden bg-noite px-5 py-24 text-center text-white sm:px-8 sm:py-32">
      <div
        className="luz-viva pointer-events-none absolute -bottom-[26rem] left-1/2 h-[40rem] w-[64rem] -translate-x-1/2 rounded-full bg-ouro-400/25 blur-[110px]"
        aria-hidden="true"
      />
      <Revelar efeito="foco" className="relative mx-auto max-w-3xl">
        <h2 className="text-[2.4rem] leading-[1.04] font-bold tracking-[-0.045em] text-balance sm:text-[4rem]">
          Leve o {MARCA.nome} para o seu escritório. <span className="texto-ouro">{MARCA.slogan}</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/65">
          Chame no WhatsApp, veja uma demonstração de 30 minutos e saia com um plano de implantação.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <BotaoLink href={linkWhatsApp(MENSAGENS_VENDA.geral)} variante="ouro" tamanho="g">
            <IconeWhatsApp />
            Contratar pelo WhatsApp
          </BotaoLink>
          <BotaoLink href={linkWhatsApp(MENSAGENS_VENDA.demonstracao)} variante="claro" tamanho="g">
            Agendar demonstração
          </BotaoLink>
        </div>
        <p className="mt-6 text-sm text-white/45">WhatsApp {MARCA.whatsapp.exibicao}</p>
      </Revelar>
    </section>
  );
}

/* --------------------------------- Rodapé --------------------------------- */

export function Rodape() {
  return (
    <footer className="border-t border-white/[0.08] bg-noite px-5 py-10 text-white sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo claro />
          <p className="mt-2 text-sm text-white/45">Gestão jurídica com inteligência artificial.</p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/65">
          <Link href="/#recursos" className="hover:text-white">
            Recursos
          </Link>
          <Link href="/privacidade" className="hover:text-white">
            Privacidade
          </Link>
          <Link href="/termos" className="hover:text-white">
            Termos de uso
          </Link>
          <Link href="/entrar" className="hover:text-white">
            Entrar
          </Link>
          <a href={linkWhatsApp(MENSAGENS_VENDA.geral)} target="_blank" rel="noopener noreferrer" className="hover:text-white">
            WhatsApp {MARCA.whatsapp.exibicao}
          </a>
        </nav>
      </div>
    </footer>
  );
}

/** Botão fixo no canto: o caminho mais curto até o WhatsApp de vendas. */
export function WhatsAppFlutuante() {
  return (
    <a
      href={linkWhatsApp(MENSAGENS_VENDA.geral)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com o Vade no WhatsApp"
      className="flutuante-vivo fundo-ouro fixed right-4 bottom-4 z-40 flex h-14 items-center gap-2.5 rounded-full px-5 font-semibold text-tinta shadow-[0_18px_40px_-10px_rgb(0_0_0/0.55)] transition-[scale] duration-300 hover:scale-[1.04] sm:right-6 sm:bottom-6"
    >
      <IconeWhatsApp className="size-6" />
      <span className="hidden sm:inline">Falar no WhatsApp</span>
    </a>
  );
}
