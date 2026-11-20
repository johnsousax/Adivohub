"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Estado aberto/fechado de uma janela.
 * Fecha sozinho quando a tela sai de vista (o Next mantém as telas montadas
 * ao navegar), para ninguém voltar e encontrar um formulário aberto.
 */
export function useDialogo(inicial = false) {
  const [aberto, definirAberto] = useState(inicial);
  useLayoutEffect(() => () => definirAberto(false), []);
  const abrir = useCallback(() => definirAberto(true), []);
  const fechar = useCallback(() => definirAberto(false), []);
  return { aberto, abrir, fechar };
}

export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  largura = "md",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  largura?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
    return () => {
      if (dialogo.open) dialogo.close();
    };
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(evento) => {
        // Clique no fundo escurecido (fora do conteúdo) fecha.
        if (evento.target === ref.current) aoFechar();
      }}
      aria-labelledby="titulo-modal"
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-3xl bg-white p-0 text-tinta shadow-flutuante backdrop:bg-black/40 open:animate-surgir",
        { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[largura],
      )}
    >
      {aberto && (
        <div className="flex max-h-[min(86dvh,46rem)] flex-col">
          <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div>
              <h2 id="titulo-modal" className="text-lg font-semibold tracking-[-0.02em]">
                {titulo}
              </h2>
              {descricao && <p className="mt-1 text-sm text-mudo">{descricao}</p>}
            </div>
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar"
              className="-mt-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-mudo transition-colors hover:bg-fundo hover:text-tinta"
            >
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </header>
          <div className="rolagem-fina overflow-y-auto px-6 pb-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/** Rodapé padrão de formulário dentro de um modal. */
export function RodapeModal({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap items-center justify-end gap-2">{children}</div>;
}
