import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/marca/Logo";
import { BotaoLink } from "@/components/ui/Botao";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NaoEncontrada() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-noite px-6 text-center text-white">
      <Link href="/">
        <Logo claro />
      </Link>
      <h1 className="mt-10 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Esta página não existe.</h1>
      <p className="mt-4 max-w-md text-lg text-white/60">O endereço pode ter mudado ou sido digitado errado.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <BotaoLink href="/" variante="ouro">
          Ir para o início
        </BotaoLink>
        <BotaoLink href="/painel" variante="claro">
          Abrir o painel
        </BotaoLink>
      </div>
    </main>
  );
}
