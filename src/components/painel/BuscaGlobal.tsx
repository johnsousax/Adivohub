"use client";

import { CornerDownLeft, Scale, Search, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useLoja } from "@/lib/dados/loja";
import { AREAS, FASES } from "@/lib/tipos";

interface Resultado {
  chave: string;
  href: string;
  titulo: string;
  detalhe: string;
  tipo: "caso" | "cliente";
}

function semAcento(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Busca rápida (Ctrl K) por casos, clientes e números de processo. */
export function BuscaGlobal({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [termo, definirTermo] = useState("");
  const [selecionado, definirSelecionado] = useState(0);
  const casos = useLoja((s) => s.casos);
  const clientes = useLoja((s) => s.clientes);

  useEffect(() => {
    const elemento = dialogo.current;
    if (!elemento) return;
    if (aberta && !elemento.open) elemento.showModal();
    if (!aberta && elemento.open) elemento.close();
    return () => {
      if (elemento.open) elemento.close();
    };
  }, [aberta]);

  const resultados = useMemo<Resultado[]>(() => {
    const busca = semAcento(termo.trim());
    const digitos = termo.replace(/\D/g, "");
    const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome]));
    const doCaso = casos
      .filter((c) => {
        if (!busca) return c.fase !== "encerrado";
        const alvo = semAcento(`${c.titulo} ${c.tipoAcao} ${nomeCliente.get(c.clienteId) ?? ""} ${c.parteContraria}`);
        return alvo.includes(busca) || (digitos.length >= 4 && (c.numeroCNJ ?? "").replace(/\D/g, "").includes(digitos));
      })
      .slice(0, busca ? 6 : 4)
      .map<Resultado>((c) => ({
        chave: c.id,
        href: `/painel/casos/${c.id}`,
        titulo: c.titulo,
        detalhe: `${AREAS[c.area]} · ${FASES[c.fase]}${c.numeroCNJ ? ` · ${c.numeroCNJ}` : ""}`,
        tipo: "caso",
      }));
    const doCliente = clientes
      .filter((c) => (busca ? semAcento(`${c.nome} ${c.email} ${c.cidade}`).includes(busca) : c.status === "ativo"))
      .slice(0, busca ? 6 : 4)
      .map<Resultado>((c) => ({
        chave: c.id,
        href: `/painel/clientes/${c.id}`,
        titulo: c.nome,
        detalhe: c.status === "lead" ? "Contato no CRM" : c.status === "perdido" ? "Contato perdido (CRM)" : `Cliente · ${c.cidade}`,
        tipo: "cliente",
      }));
    return [...doCaso, ...doCliente];
  }, [termo, casos, clientes]);

  function abrir(resultado: Resultado | undefined) {
    if (!resultado) return;
    aoFechar();
    definirTermo("");
    router.push(resultado.href);
  }

  return (
    <dialog
      ref={dialogo}
      onClose={() => {
        definirTermo("");
        aoFechar();
      }}
      onClick={(evento) => {
        if (evento.target === dialogo.current) aoFechar();
      }}
      aria-label="Busca"
      className="mx-auto mt-[12vh] mb-auto w-[calc(100vw-2rem)] max-w-xl overflow-hidden rounded-3xl bg-white p-0 text-tinta shadow-flutuante open:animate-surgir"
    >
      {aberta && (
        <div>
          <div className="flex items-center gap-3 border-b border-linha px-5">
            <Search className="size-4.5 shrink-0 text-sutil" aria-hidden="true" />
            <input
              autoFocus
              value={termo}
              onChange={(evento) => {
                definirTermo(evento.target.value);
                definirSelecionado(0);
              }}
              onKeyDown={(evento) => {
                if (evento.key === "ArrowDown") {
                  evento.preventDefault();
                  definirSelecionado((i) => Math.min(i + 1, resultados.length - 1));
                } else if (evento.key === "ArrowUp") {
                  evento.preventDefault();
                  definirSelecionado((i) => Math.max(i - 1, 0));
                } else if (evento.key === "Enter") {
                  evento.preventDefault();
                  abrir(resultados[selecionado]);
                }
              }}
              placeholder="Nome do cliente, caso ou número do processo"
              aria-label="Buscar"
              className="h-14 flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-sutil"
            />
          </div>
          <ul className="rolagem-fina max-h-[52vh] overflow-y-auto p-2">
            {resultados.length === 0 && <li className="px-4 py-8 text-center text-sm text-mudo">Nada encontrado para “{termo}”.</li>}
            {resultados.map((resultado, indice) => {
              const Icone = resultado.tipo === "caso" ? Scale : UserRound;
              const ativo = indice === selecionado;
              return (
                <li key={resultado.chave}>
                  <button
                    type="button"
                    onClick={() => abrir(resultado)}
                    onPointerMove={() => definirSelecionado(indice)}
                    className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left", ativo && "bg-fundo")}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fundo text-mudo ring-1 ring-linha">
                      <Icone className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{resultado.titulo}</span>
                      <span className="block truncate text-xs text-mudo">{resultado.detalhe}</span>
                    </span>
                    {ativo && <CornerDownLeft className="size-4 shrink-0 text-sutil" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </dialog>
  );
}
