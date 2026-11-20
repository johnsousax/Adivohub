import type { Metadata } from "next";
import Link from "next/link";
import { FormLogin } from "@/components/login/FormLogin";
import { Logo } from "@/components/marca/Logo";
import { credenciaisDemo } from "@/lib/auth/credenciais";
import { MARCA } from "@/lib/marca";

export const metadata: Metadata = {
  title: "Entrar",
  description: `Acesse o painel do ${MARCA.nome}.`,
  robots: { index: false, follow: false },
};

export default function PaginaEntrar() {
  const demo = credenciaisDemo();
  return (
    <main className="grid grid-cols-1 min-h-dvh lg:grid-cols-[1.05fr_1fr]">
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
          <h1 className="text-[1.9rem] leading-tight font-bold tracking-[-0.035em]">Entrar no painel</h1>
          <p className="mt-2 text-[0.95rem] text-mudo">Use seu e-mail e sua senha para acessar o escritório.</p>
          <FormLogin demo={demo.publica ? { email: demo.email, senha: demo.senha } : null} />
          <p className="mt-8 text-sm text-mudo">
            Ainda não é cliente?{" "}
            <Link href="/#planos" className="font-medium text-tinta underline-offset-4 hover:underline">
              Conheça os planos
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
