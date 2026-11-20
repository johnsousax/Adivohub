import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variante = "primario" | "secundario" | "fantasma" | "ouro" | "perigo" | "claro";
type Tamanho = "pp" | "p" | "m" | "g" | "icone";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-tinta text-white hover:bg-black",
  secundario: "bg-white text-tinta ring-1 ring-inset ring-linha-forte hover:bg-fundo",
  fantasma: "text-tinta-2 hover:bg-black/5",
  ouro: "fundo-ouro text-tinta shadow-[0_8px_30px_-8px_rgb(201_164_92/0.6)] hover:brightness-105",
  perigo: "bg-critico text-white hover:brightness-110",
  claro: "bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/15",
};

const TAMANHOS: Record<Tamanho, string> = {
  pp: "h-7 px-2.5 text-xs",
  p: "h-9 px-3.5 text-sm",
  m: "h-10 px-4.5 text-sm",
  g: "h-12 px-6 text-[0.95rem]",
  icone: "size-11",
};

interface Comum {
  variante?: Variante;
  tamanho?: Tamanho;
  className?: string;
  children: ReactNode;
}

export function classesBotao({ variante = "primario", tamanho = "m", className }: Omit<Comum, "children">): string {
  return cn(BASE, VARIANTES[variante], TAMANHOS[tamanho], className);
}

export function Botao({ variante, tamanho, className, type = "button", ...resto }: Comum & ComponentProps<"button">) {
  return <button type={type} className={classesBotao({ variante, tamanho, className })} {...resto} />;
}

/** Link com aparência de botão. Endereços externos abrem em nova aba. */
export function BotaoLink({
  variante,
  tamanho,
  className,
  href,
  externo,
  children,
  ...resto
}: Comum & { href: string; externo?: boolean } & Omit<ComponentProps<"a">, "href">) {
  const classes = classesBotao({ variante, tamanho, className });
  if (externo ?? /^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...resto}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...resto}>
      {children}
    </Link>
  );
}
