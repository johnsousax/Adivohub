import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
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

/** Atraso da animação de entrada, para os blocos do topo chegarem em sequência. */
const atraso = (ms: number) => ({ "--atraso": `${ms}ms` }) as CSSProperties;

export function Navegacao() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-noite/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="Vade — página inicial">
          <Logo claro />
        </Link>
        <nav aria-label="Seções" className="ml-4 hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="link-vivo pb-0.5 text-sm text-white/65 hover:text-white">
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
      {/* Linha dourada que acompanha o avanço da leitura (só onde o navegador oferece o recurso). */}
      <div className="progresso-leitura fundo-ouro absolute inset-x-0 -bottom-px h-0.5" aria-hidden="true" />
    </header>
  );
}

export function Heroi() {
  return (
    <section className="relative overflow-hidden bg-noite px-5 pt-32 text-white sm:px-8 sm:pt-40">
      <div
        className="luz-viva pointer-events-none absolute top-[38%] left-1/2 h-[42rem] w-[70rem] -translate-x-1/2 rounded-full bg-ouro-400/20 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl text-center">
        <p className="entrada texto-ouro inline-block text-[0.95rem] font-semibold">Gestão jurídica com inteligência artificial</p>
        <h1
          className="entrada mx-auto mt-5 max-w-4xl text-[2.75rem] leading-[1.02] font-bold tracking-[-0.045em] text-balance sm:text-[4.75rem]"
          style={atraso(90)}
        >
          O escritório inteiro <span className="texto-ouro-vivo">em um só lugar.</span>
        </h1>
        <p className="entrada mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-white/65 sm:text-xl" style={atraso(200)}>
          Casos, prazos, agenda e honorários organizados. E uma IA que resume publicações, responde suas perguntas e atende seus clientes no
          WhatsApp.
        </p>
        <div className="entrada mt-9 flex flex-wrap items-center justify-center gap-3" style={atraso(310)}>
          <BotaoLink href={linkWhatsApp(MENSAGENS_VENDA.geral)} variante="ouro" tamanho="g">
            <IconeWhatsApp />
            Contratar pelo WhatsApp
          </BotaoLink>
          <BotaoLink href="/entrar" variante="claro" tamanho="g">
            Ver a demonstração
            <ArrowRight className="seta-viva size-4" aria-hidden="true" />
          </BotaoLink>
        </div>
        <p className="entrada mt-5 text-sm text-white/45" style={atraso(400)}>
          Demonstração aberta, sem cadastro · Implantação feita pela nossa equipe
        </p>

        {/* A janela sobe na entrada e, ao rolar, se apruma (começa levemente inclinada). */}
        <div className="entrada-janela mx-auto mt-14 max-w-5xl sm:mt-20" style={atraso(520)}>
          <div className="aprumar origin-bottom">
            <Janela titulo="Vade — visão geral" className="rounded-b-none">
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
        </div>
      </div>
    </section>
  );
}
