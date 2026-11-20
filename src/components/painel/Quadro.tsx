"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ColunaQuadro<C extends string> {
  id: C;
  titulo: string;
}

/**
 * Quadro em colunas (kanban). Os cartões podem ser arrastados com o mouse;
 * para teclado e toque, cada cartão deve oferecer também um seletor ou botão
 * de mover (quem usa o Quadro passa isso em `renderizar`).
 */
export function Quadro<C extends string, T extends { id: string }>({
  colunas,
  itens,
  colunaDe,
  aoMover,
  renderizar,
  vazio = "Nada aqui.",
}: {
  colunas: Array<ColunaQuadro<C>>;
  itens: T[];
  colunaDe: (item: T) => C;
  aoMover: (id: string, coluna: C) => void;
  renderizar: (item: T) => ReactNode;
  vazio?: string;
}) {
  const [arrastando, definirArrastando] = useState<string | null>(null);
  const [sobre, definirSobre] = useState<C | null>(null);

  return (
    <div className="rolagem-fina -mx-4 flex gap-3 overflow-x-auto px-4 pb-3 sm:-mx-8 sm:px-8">
      {colunas.map((coluna) => {
        const daColuna = itens.filter((item) => colunaDe(item) === coluna.id);
        return (
          <section
            key={coluna.id}
            aria-label={coluna.titulo}
            onDragOver={(evento) => {
              if (!arrastando) return;
              evento.preventDefault();
              definirSobre(coluna.id);
            }}
            onDragLeave={() => definirSobre((atual) => (atual === coluna.id ? null : atual))}
            onDrop={(evento) => {
              evento.preventDefault();
              if (arrastando) aoMover(arrastando, coluna.id);
              definirArrastando(null);
              definirSobre(null);
            }}
            className={cn(
              "flex w-[17.5rem] shrink-0 flex-col rounded-3xl bg-black/[0.035] p-2 transition-colors",
              sobre === coluna.id && "bg-ouro-100/70 ring-2 ring-ouro-300 ring-inset",
            )}
          >
            <header className="flex items-center justify-between px-3 py-2">
              <h3 className="text-sm font-semibold">{coluna.titulo}</h3>
              <span className="text-xs text-mudo tabular-nums">{daColuna.length}</span>
            </header>
            <ul className="flex min-h-24 flex-1 flex-col gap-2">
              {daColuna.map((item) => (
                <li
                  key={item.id}
                  draggable
                  onDragStart={(evento) => {
                    evento.dataTransfer.effectAllowed = "move";
                    evento.dataTransfer.setData("text/plain", item.id);
                    definirArrastando(item.id);
                  }}
                  onDragEnd={() => {
                    definirArrastando(null);
                    definirSobre(null);
                  }}
                  className={cn(
                    "cursor-grab rounded-2xl bg-white p-3.5 shadow-cartao ring-1 ring-black/[0.04] active:cursor-grabbing",
                    arrastando === item.id && "opacity-40",
                  )}
                >
                  {renderizar(item)}
                </li>
              ))}
              {daColuna.length === 0 && <li className="px-3 py-6 text-center text-xs text-sutil">{vazio}</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
