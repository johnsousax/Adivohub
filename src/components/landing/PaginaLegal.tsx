import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/marca/Logo";
import { BotaoLink } from "@/components/ui/Botao";
import { dataCurta } from "@/lib/formatos";
import { LEGAL, MARCA } from "@/lib/marca";
import { linkWhatsApp } from "@/lib/whatsapp";
import { IconeWhatsApp } from "./Pecas";
import { Rodape } from "./Secoes";

/** Endereço do canal de privacidade: o e-mail, se houver; senão, o WhatsApp de vendas. */
export function canalDePrivacidade(): { rotulo: string; href: string } {
  if (LEGAL.emailPrivacidade) return { rotulo: LEGAL.emailPrivacidade, href: `mailto:${LEGAL.emailPrivacidade}` };
  return {
    rotulo: `WhatsApp ${MARCA.whatsapp.exibicao}`,
    href: linkWhatsApp(`Olá! Quero falar sobre privacidade e meus dados no ${MARCA.nome}.`),
  };
}

/** Moldura das páginas de texto legal (privacidade e termos). */
export function PaginaLegal({ titulo, resumo, children }: { titulo: string; resumo: string; children: ReactNode }) {
  return (
    <>
      <header className="border-b border-white/[0.08] bg-noite">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-5 sm:px-8">
          <Link href="/" aria-label={`${MARCA.nome} — página inicial`}>
            <Logo claro />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" className="rounded-full px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white">
              Voltar ao site
            </Link>
            <span className="hidden sm:block">
              <BotaoLink href={linkWhatsApp()} variante="ouro" tamanho="p">
                <IconeWhatsApp className="size-4" />
                WhatsApp
              </BotaoLink>
            </span>
          </div>
        </div>
      </header>

      <main className="bg-white px-5 py-14 sm:px-8 sm:py-20">
        <article className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold text-ouro-700">
            Versão {LEGAL.versao} · em vigor desde {dataCurta(LEGAL.vigenteDesde)}
          </p>
          <h1 className="mt-3 text-[2.2rem] leading-[1.08] font-bold tracking-[-0.04em] sm:text-[3rem]">{titulo}</h1>
          <p className="mt-5 text-lg leading-relaxed text-mudo">{resumo}</p>
          <div className="texto-legal mt-10">{children}</div>
        </article>
      </main>
      <Rodape />
    </>
  );
}

/** Seção numerada de um documento legal. */
export function Clausula({ id, titulo, children }: { id?: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}
