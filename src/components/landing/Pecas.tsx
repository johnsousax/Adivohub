import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Ícone do WhatsApp (traço simples, sem marca registrada colorida). */
export function IconeWhatsApp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-5", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.9L3.5 20.5l4.2-1.1A8.5 8.5 0 1 0 12 3.5z" />
      <path d="M9.3 8.5c-.5 1 0 2.3 1.2 3.6 1.2 1.3 2.5 1.9 3.6 1.5.5-.2.9-.6 1.1-1.1l-1.6-1-.8.6c-.7-.3-1.4-1-1.8-1.7l.6-.9-.9-1.6c-.6 0-1.1.2-1.4.6z" />
    </svg>
  );
}

/** Moldura de seção com largura máxima e respiro vertical padronizados. */
export function Secao({
  id,
  tom = "claro",
  className,
  children,
}: {
  id?: string;
  tom?: "claro" | "cinza" | "escuro";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-16 px-5 py-20 sm:px-8 sm:py-28",
        { claro: "bg-white text-tinta", cinza: "bg-fundo text-tinta", escuro: "bg-noite text-white" }[tom],
        className,
      )}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function Sobretitulo({ children, escuro = false }: { children: ReactNode; escuro?: boolean }) {
  return <p className={cn("mb-4 text-[0.95rem] font-semibold", escuro ? "texto-ouro" : "text-ouro-700")}>{children}</p>;
}

/** Título de seção: frase forte + complemento em cinza. */
export function TituloSecao({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("max-w-3xl text-[2.1rem] leading-[1.06] font-bold tracking-[-0.04em] text-balance sm:text-[3.25rem]", className)}>
      {children}
    </h2>
  );
}

/** Janela de aplicativo (estilo desktop) para mostrar telas do produto. */
export function Janela({ titulo, className, children }: { titulo: string; className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-noite-2 shadow-[0_50px_120px_-30px_rgb(201_164_92/0.35)] ring-1 ring-white/10",
        className,
      )}
    >
      <div className="flex h-9 items-center gap-1.5 border-b border-white/[0.08] bg-noite-3/70 px-4">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto -translate-x-6 text-xs font-medium text-white/45">{titulo}</span>
      </div>
      {children}
    </div>
  );
}

export interface Balao {
  de: "cliente" | "sistema";
  texto: ReactNode;
  hora: string;
}

/** Celular com uma conversa de WhatsApp, para ilustrar a IA. */
export function Telefone({ nome, legenda, baloes, className }: { nome: string; legenda: string; baloes: Balao[]; className?: string }) {
  return (
    <div
      className={cn(
        "w-[19.5rem] max-w-full rounded-[3.1rem] bg-[#0b0b0c] p-2.5 shadow-[0_0_0_1.5px_#48484c,0_0_0_5px_#18181a,0_50px_110px_-30px_rgb(201_164_92/0.4)]",
        className,
      )}
      role="img"
      aria-label={`Exemplo de conversa no WhatsApp com ${nome}`}
    >
      <div className="overflow-hidden rounded-[2.55rem] bg-[#0b141a]">
        <div className="mx-auto mt-2.5 h-6 w-24 rounded-full bg-black" />
        <div className="flex items-center gap-2.5 border-b border-[#1f2c33] px-4 py-2.5">
          <span className="fundo-ouro flex size-8 items-center justify-center rounded-full text-sm font-bold text-tinta">{nome[0]}</span>
          <span>
            <span className="block text-sm font-semibold text-[#e9edef]">{nome}</span>
            <span className="block text-[0.6875rem] text-[#8696a0]">{legenda}</span>
          </span>
        </div>
        <div className="flex flex-col gap-2 px-3 pt-3 pb-5">
          {baloes.map((balao, indice) => (
            <p
              key={indice}
              // Cada balão chega depois do anterior quando o celular entra na tela (ver .balao em globals.css).
              style={{ "--i": indice } as CSSProperties}
              className={cn(
                "balao max-w-[86%] rounded-xl px-2.5 py-1.5 text-[0.78rem] leading-[1.45] text-[#e9edef]",
                balao.de === "cliente"
                  ? "origin-bottom-right self-end rounded-tr-[3px] bg-[#005c4b]"
                  : "origin-bottom-left self-start rounded-tl-[3px] bg-[#202c33]",
              )}
            >
              {balao.texto}
              <span className="mt-0.5 block text-right text-[0.625rem] text-[#8696a0]">{balao.hora}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
