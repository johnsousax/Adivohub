import type { Metadata } from "next";
import Link from "next/link";
import { IconeWhatsApp } from "@/components/landing/Pecas";
import { EntrarNaDemonstracao, FormLogin } from "@/components/login/FormLogin";
import { Logo } from "@/components/marca/Logo";
import { BotaoLink } from "@/components/ui/Botao";
import { acessoPrivadoConfigurado, demoPublica } from "@/lib/auth/credenciais";
import { MARCA } from "@/lib/marca";
import { linkWhatsApp, MENSAGENS_VENDA } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Demonstração",
  description: `Veja o ${MARCA.nome} por dentro, com um escritório fictício.`,
  robots: { index: false, follow: false },
};

/**
 * Porta de entrada do painel. Enquanto o sistema não é vendido com cadastro aberto,
 * o visitante só abre a demonstração; para contratar, fala com a equipe no WhatsApp.
 * O formulário de senha só existe quando o acesso privado está configurado no servidor.
 */
export default function PaginaEntrar() {
  const demonstracao = demoPublica();
  const acessoPrivado = acessoPrivadoConfigurado();

  return (
    <main className="grid min-h-dvh grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-noite p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -bottom-72 left-1/2 size-[46rem] -translate-x-1/2 rounded-full bg-ouro-400/20 blur-3xl"
          aria-hidden="true"
        />
        <Link href="/" className="relative w-fit">
          <Logo claro />
        </Link>
        <div className="relative max-w-md">
          <p className="text-[2.6rem] leading-[1.05] font-bold tracking-[-0.04em]">
            O escritório inteiro em um só lugar. <span className="text-white/45">{MARCA.slogan}</span>
          </p>
          <ul className="mt-8 space-y-3 text-[0.95rem] text-white/70">
            <li>Casos, prazos e agenda organizados</li>
            <li>CRM jurídico: do primeiro contato ao contrato</li>
            <li>Honorários, cobranças e fluxo de caixa</li>
            <li>IA que resume publicações e atende no WhatsApp</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/40">Ambiente de demonstração com dados fictícios.</p>
      </section>

      <section className="flex flex-col justify-center bg-white px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 inline-block lg:hidden">
            <Logo />
          </Link>
          <h1 className="text-[1.9rem] leading-tight font-bold tracking-[-0.035em]">Veja o {MARCA.nome} por dentro</h1>

          {demonstracao ? (
            <>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-mudo">
                A demonstração abre um escritório fictício com casos, prazos, CRM, financeiro e a IA funcionando. Sem cadastro e sem senha.
              </p>
              <div className="mt-8">
                <EntrarNaDemonstracao />
              </div>
              <p className="mt-3 text-center text-xs text-mudo">Dados fictícios, guardados só no seu navegador.</p>
            </>
          ) : (
            <p className="mt-2 text-[0.95rem] leading-relaxed text-mudo">
              A demonstração está fechada no momento. Fale com a gente para ver o sistema funcionando.
            </p>
          )}

          <div className="mt-8 rounded-3xl bg-fundo p-5">
            <p className="text-sm font-semibold">Quer contratar?</p>
            <p className="mt-1 text-sm leading-relaxed text-mudo">
              O acesso do seu escritório é liberado pela nossa equipe na implantação. Fale com a gente no WhatsApp.
            </p>
            <BotaoLink href={linkWhatsApp(MENSAGENS_VENDA.geral)} variante="primario" className="mt-4 w-full">
              <IconeWhatsApp className="size-4" />
              {MARCA.whatsapp.exibicao}
            </BotaoLink>
          </div>

          {acessoPrivado && (
            <details className="mt-6 rounded-3xl p-1 ring-1 ring-linha open:p-5">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Já é cliente? Entrar com e-mail e senha</summary>
              <div className="mt-2">
                <FormLogin />
              </div>
            </details>
          )}

          <p className="mt-8 text-sm text-mudo">
            <Link href="/" className="font-medium text-tinta underline-offset-4 hover:underline">
              Conheça o {MARCA.nome}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
