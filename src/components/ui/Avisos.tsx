"use client";

import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

type Tipo = "sucesso" | "info" | "erro";

interface Aviso {
  id: number;
  tipo: Tipo;
  texto: string;
}

let avisos: Aviso[] = [];
let proximoId = 1;
const ouvintes = new Set<() => void>();

function notificar() {
  for (const ouvinte of ouvintes) ouvinte();
}

/** Mostra uma confirmação rápida no canto da tela. */
export function avisar(texto: string, tipo: Tipo = "sucesso") {
  const aviso = { id: proximoId++, tipo, texto };
  avisos = [...avisos, aviso].slice(-3);
  notificar();
  window.setTimeout(() => {
    avisos = avisos.filter((a) => a.id !== aviso.id);
    notificar();
  }, 4200);
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

const ICONES = { sucesso: CircleCheck, info: Info, erro: TriangleAlert } as const;
const VAZIO: Aviso[] = [];

export function Avisos() {
  const lista = useSyncExternalStore(
    assinar,
    () => avisos,
    () => VAZIO,
  );
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex flex-col items-center gap-2 px-4">
      {lista.map((aviso) => {
        const Icone = ICONES[aviso.tipo];
        return (
          <div
            key={aviso.id}
            className="pointer-events-auto flex max-w-md animate-surgir items-center gap-2.5 rounded-full bg-tinta py-2.5 pr-5 pl-4 text-sm font-medium text-white shadow-flutuante"
          >
            <Icone className={cn("size-4 shrink-0", aviso.tipo === "erro" ? "text-[#ff8a80]" : "text-ouro-300")} aria-hidden="true" />
            {aviso.texto}
          </div>
        );
      })}
    </div>
  );
}
