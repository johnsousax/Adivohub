import { cn } from "@/lib/cn";
import { MARCA } from "@/lib/marca";

/** Símbolo: um "V" dourado, que também lembra um marcador de página do Vade Mecum. */
export function Simbolo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <defs>
        <linearGradient id="vade-ouro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4E2B6" />
          <stop offset="0.5" stopColor="#D9B774" />
          <stop offset="1" stopColor="#A9823F" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="#0B0B0C" />
      <path d="M9 10l7 13 7-13" fill="none" stroke="url(#vade-ouro)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, claro = false }: { className?: string; claro?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Simbolo className="size-7" />
      <span className={cn("text-[1.3rem] font-bold tracking-[-0.045em]", claro ? "text-white" : "text-tinta")}>{MARCA.nome}</span>
    </span>
  );
}
