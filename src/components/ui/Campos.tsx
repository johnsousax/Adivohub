import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const CONTROLE =
  "block w-full rounded-xl bg-white px-3.5 text-sm text-tinta ring-1 ring-inset ring-linha-forte transition-shadow placeholder:text-sutil focus:outline-none focus:ring-2 focus:ring-tinta disabled:bg-fundo disabled:text-mudo";

interface PropsCampo {
  rotulo: string;
  dica?: string;
  erro?: string;
  className?: string;
}

function Moldura({ id, rotulo, dica, erro, className, children }: PropsCampo & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[0.8rem] font-medium text-tinta-2">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="mt-1.5 text-xs text-critico">
          {erro}
        </p>
      ) : (
        dica && <p className="mt-1.5 text-xs text-mudo">{dica}</p>
      )}
    </div>
  );
}

export function Entrada({ rotulo, dica, erro, className, ...resto }: PropsCampo & Omit<ComponentProps<"input">, "className">) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} dica={dica} erro={erro} className={className}>
      <input
        id={id}
        aria-invalid={Boolean(erro) || undefined}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={cn(CONTROLE, "h-10", erro && "ring-critico")}
        {...resto}
      />
    </Moldura>
  );
}

export function Selecao({ rotulo, dica, erro, className, children, ...resto }: PropsCampo & Omit<ComponentProps<"select">, "className">) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} dica={dica} erro={erro} className={className}>
      <select
        id={id}
        aria-invalid={Boolean(erro) || undefined}
        className={cn(
          CONTROLE,
          "h-10 appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9",
          erro && "ring-critico",
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236e6e73' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        {...resto}
      >
        {children}
      </select>
    </Moldura>
  );
}

export function AreaTexto({ rotulo, dica, erro, className, ...resto }: PropsCampo & Omit<ComponentProps<"textarea">, "className">) {
  const id = useId();
  return (
    <Moldura id={id} rotulo={rotulo} dica={dica} erro={erro} className={className}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={Boolean(erro) || undefined}
        className={cn(CONTROLE, "resize-y py-2.5 leading-relaxed", erro && "ring-critico")}
        {...resto}
      />
    </Moldura>
  );
}

/** Campo de busca compacto para barras de filtro. */
export function Busca({ className, ...resto }: Omit<ComponentProps<"input">, "type">) {
  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sutil"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input type="search" className={cn(CONTROLE, "h-9 rounded-full pl-9")} {...resto} />
    </div>
  );
}

/** Seletor compacto para barras de filtro (sem rótulo visível). */
export function Filtro({ rotulo, className, children, ...resto }: { rotulo: string } & ComponentProps<"select">) {
  return (
    <select
      aria-label={rotulo}
      className={cn(
        "h-9 rounded-full bg-white pr-8 pl-3.5 text-sm text-tinta-2 ring-1 ring-inset ring-linha-forte focus:outline-none focus:ring-2 focus:ring-tinta",
        className,
      )}
      {...resto}
    >
      {children}
    </select>
  );
}
