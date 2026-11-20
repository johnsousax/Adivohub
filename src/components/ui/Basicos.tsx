import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { iniciais } from "@/lib/formatos";

/* --------------------------------- Cartão --------------------------------- */

export function Cartao({ className, ...resto }: ComponentProps<"div">) {
  return <div className={cn("rounded-cartao bg-white shadow-cartao ring-1 ring-black/[0.04]", className)} {...resto} />;
}

export function CabecalhoCartao({
  titulo,
  descricao,
  acao,
  className,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 pb-3 sm:px-6", className)}>
      <div className="min-w-0">
        <h2 className="text-[0.95rem] font-semibold tracking-[-0.015em]">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-sm text-mudo">{descricao}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}

/* -------------------------------- Etiqueta -------------------------------- */

export type Tom = "neutro" | "ouro" | "ok" | "alerta" | "critico" | "info" | "escuro";

const TONS: Record<Tom, string> = {
  neutro: "bg-fundo text-tinta-2 ring-linha",
  ouro: "bg-ouro-50 text-ouro-800 ring-ouro-200",
  ok: "bg-ok-fundo text-ok ring-ok/15",
  alerta: "bg-alerta-fundo text-alerta ring-alerta/15",
  critico: "bg-critico-fundo text-critico ring-critico/15",
  info: "bg-info-fundo text-info ring-info/15",
  escuro: "bg-tinta text-white ring-tinta",
};

export function Etiqueta({
  tom = "neutro",
  icone: Icone,
  className,
  children,
}: {
  tom?: Tom;
  icone?: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONS[tom],
        className,
      )}
    >
      {Icone && <Icone className="size-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

/* --------------------------------- Avatar --------------------------------- */

export function Avatar({
  nome,
  tamanho = "m",
  sobreEscuro = false,
  className,
}: {
  nome: string;
  tamanho?: "p" | "m" | "g";
  /** Para fundos escuros (menu lateral). */
  sobreEscuro?: boolean;
  className?: string;
}) {
  const medidas = { p: "size-6 text-[0.625rem]", m: "size-8 text-xs", g: "size-11 text-sm" }[tamanho];
  return (
    <span
      title={nome}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-normal text-ouro-200",
        sobreEscuro ? "bg-white/10" : "bg-tinta",
        medidas,
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

/* ------------------------------ Estado vazio ------------------------------ */

export function Vazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-fundo text-sutil">
        <Icone className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-semibold">{titulo}</p>
      {descricao && <p className="mt-1 max-w-sm text-sm text-mudo">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

/* ---------------------------------- Abas ---------------------------------- */

export interface ItemAba<T extends string> {
  id: T;
  rotulo: string;
  contagem?: number;
}

export function Abas<T extends string>({
  itens,
  valor,
  aoMudar,
  rotulo,
  className,
}: {
  itens: Array<ItemAba<T>>;
  valor: T;
  aoMudar: (id: T) => void;
  rotulo: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={rotulo}
      className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-black/[0.05] p-1", className)}
    >
      {itens.map((item) => {
        const ativa = item.id === valor;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => aoMudar(item.id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
              ativa ? "bg-white text-tinta shadow-sm" : "text-mudo hover:text-tinta",
            )}
          >
            {item.rotulo}
            {item.contagem !== undefined && (
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", ativa ? "bg-fundo text-tinta-2" : "bg-black/[0.06]")}>
                {item.contagem}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------- Cabeçalho de página --------------------------- */

export function CabecalhoPagina({ titulo, descricao, acoes }: { titulo: string; descricao?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[1.7rem] leading-tight font-bold tracking-[-0.035em] sm:text-[2rem]">{titulo}</h1>
        {descricao && <p className="mt-1 text-[0.95rem] text-mudo">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}
