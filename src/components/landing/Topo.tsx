import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/marca/Logo";
import { BotaoLink } from "@/components/ui/Botao";
import { linkWhatsApp, MENSAGENS_VENDA } from "@/lib/whatsapp";
import telaPainel from "../../../public/produto/painel.png";
import { IconeWhatsApp, Janela } from "./Pecas";

const LINKS = [
  { href: "#recursos", rotulo: "Recursos" },
  { href: "#ia", rotulo: "Inteligência artificial" },
  { href: "#planos", rotulo: "Planos" },
  { href: "#duvidas", rotulo: "Dúvidas" },
];

export function Navegacao() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-noite/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="Vade — página inicial">
          <Logo claro />
        </Link>
        <nav aria-label="Seções" className="ml-4 hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-white/65 transition-colors hover:text-white">
              {link.rotulo}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/entrar" className="rounded-full px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white">
            Entrar
          </Link>
          <span className="hidden sm:block">
            <BotaoLink href={linkWhatsApp(MENSAGENS_VENDA.geral)} variante="ouro" tamanho="p">
              <IconeWhatsApp className="size-4" />
              Falar no WhatsApp
            </BotaoLink>
          </span>
        </div>
      </div>
    </header>
  );
}

export function Heroi() {
  return (
    <section className="relative overflow-hidden bg-noite px-5 pt-32 text-white sm:px-8 sm:pt-40">
      <div
        className="pointer-events-none absolute top-[38%] left-1/2 h-[42rem] w-[70rem] -translate-x-1/2 rounded-full bg-ouro-400/20 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl text-center">
        <p className="texto-ouro inline-block text-[0.95rem] font-semibold">Gestão jurídica com inteligência artificial</p>
        <h1 className="mx-auto mt-5 max-w-4xl text-[2.75rem] leading-[1.02] font-bold tracking-[-0.045em] text-balance sm:text-[4.75rem]">
          O escritório inteiro <span className="texto-ouro">em um só lugar.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-white/65 sm:text-xl">
          Casos, prazos, agenda e honorários organizados. E uma IA que resume publicações, responde suas perguntas e atende seus clientes no
          WhatsApp.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <BotaoLink href={linkWhatsApp(MENSAGENS_VENDA.geral)} variante="ouro" tamanho="g">
            <IconeWhatsApp />
            Contratar pelo WhatsApp
          </BotaoLink>
          <BotaoLink href="/entrar" variante="claro" tamanho="g">
            Ver a demonstração
            <ArrowRight className="size-4" aria-hidden="true" />
          </BotaoLink>
        </div>
        <p className="mt-5 text-sm text-white/45">Demonstração aberta, sem cadastro · Implantação feita pela nossa equipe</p>

        <Janela titulo="Vade — visão geral" className="mx-auto mt-14 max-w-5xl rounded-b-none sm:mt-20">
          {/* No celular a imagem é ampliada e deslocada para mostrar o conteúdo, sem o menu lateral. */}
          <div className="max-h-[25rem] overflow-hidden sm:max-h-none">
            <Image
              src={telaPainel}
              alt="Tela inicial do Vade: resumo do dia feito pela IA, valores recebidos e a receber, gráfico de recebimentos por mês e a lista dos próximos prazos."
              priority
              sizes="(min-width: 1100px) 1024px, (min-width: 640px) 100vw, 220vw"
              className="-ml-[44%] block w-[220%] max-w-none sm:ml-0 sm:w-full"
            />
          </div>
        </Janela>
      </div>
    </section>
  );
}
