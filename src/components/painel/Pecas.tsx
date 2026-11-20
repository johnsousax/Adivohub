"use client";

import { Check, Sparkles, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { Avatar, Etiqueta, type Tom } from "@/components/ui/Basicos";
import { Botao } from "@/components/ui/Botao";
import { avisar } from "@/components/ui/Avisos";
import { cn } from "@/lib/cn";
import { useLoja } from "@/lib/dados/loja";
import { grupoDoPrazo, sugestoesPendentes, type GrupoPrazo } from "@/lib/dados/metricas";
import { dataSemana, relativo } from "@/lib/formatos";
import type { Prazo } from "@/lib/tipos";
import { useHoje, useNomes } from "./ganchos";

/* ------------------------------ Data do prazo ----------------------------- */

const TOM_DO_GRUPO: Record<GrupoPrazo, Tom> = {
  atrasados: "critico",
  hoje: "alerta",
  semana: "neutro",
  proximos: "neutro",
  concluidos: "ok",
};

export function EtiquetaPrazo({ prazo }: { prazo: Prazo }) {
  const hoje = useHoje();
  const grupo = grupoDoPrazo(prazo, hoje);
  if (grupo === "concluidos") {
    return (
      <Etiqueta tom="ok" icone={Check}>
        Concluído
      </Etiqueta>
    );
  }
  return (
    <span
      title={`Data fatal: ${dataSemana(prazo.dataFatal)} (${relativo(prazo.dataFatal, hoje)}) · data interna: ${dataSemana(prazo.dataInterna)}`}
    >
      <Etiqueta
        tom={TOM_DO_GRUPO[grupo]}
        icone={grupo === "atrasados" ? TriangleAlert : undefined}
        className={grupo === "hoje" ? undefined : "capitalize"}
      >
        {grupo === "atrasados"
          ? `Atrasado · ${dataSemana(prazo.dataFatal)}`
          : grupo === "hoje"
            ? "Vence hoje"
            : dataSemana(prazo.dataFatal)}
      </Etiqueta>
    </span>
  );
}

/* ------------------------------ Linha de prazo ---------------------------- */

export function LinhaPrazo({ prazo, mostrarCaso = true, acao }: { prazo: Prazo; mostrarCaso?: boolean; acao?: ReactNode }) {
  const nomes = useNomes();
  const alternar = useLoja((s) => s.alternarPrazo);
  const concluido = Boolean(prazo.concluidoEm);

  return (
    // Em cartões estreitos a data desce para a linha de baixo, em vez de espremer o título.
    <li className="@container py-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={concluido}
          aria-label={concluido ? `Reabrir: ${prazo.titulo}` : `Concluir: ${prazo.titulo}`}
          onClick={() => {
            alternar(prazo.id);
            avisar(concluido ? "Prazo reaberto." : "Prazo concluído.");
          }}
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ring-1 transition-colors ring-inset",
            concluido ? "bg-tinta text-white ring-tinta" : "bg-white text-transparent ring-linha-forte hover:ring-tinta",
          )}
        >
          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1 @md:flex @md:items-center @md:gap-3">
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-sm font-medium", concluido && "text-mudo line-through")}>{prazo.titulo}</p>
            {mostrarCaso && (
              <Link href={`/painel/casos/${prazo.casoId}`} className="block truncate text-xs text-mudo hover:text-tinta hover:underline">
                {nomes.caso(prazo.casoId)}
              </Link>
            )}
          </div>
          <div className="mt-1.5 flex shrink-0 items-center gap-2 @md:mt-0">
            <EtiquetaPrazo prazo={prazo} />
            <Avatar nome={nomes.usuario(prazo.responsavelId)} tamanho="p" />
          </div>
        </div>
        {acao}
      </div>
    </li>
  );
}

/* --------------------------- Sugestões da IA ------------------------------ */

/** Publicações lidas pela IA com prazo sugerido: o advogado confirma ou descarta. */
export function SugestoesDaIA({ casoId, className }: { casoId?: string; className?: string }) {
  const nomes = useNomes();
  const andamentos = useLoja((s) => s.andamentos);
  const responder = useLoja((s) => s.responderSugestao);
  const pendentes = useMemo(() => sugestoesPendentes(andamentos).filter((a) => !casoId || a.casoId === casoId), [andamentos, casoId]);

  if (pendentes.length === 0) return null;

  return (
    <ul className={cn("space-y-3", className)}>
      {pendentes.map((andamento) => {
        const sugestao = andamento.sugestao!;
        return (
          <li key={andamento.id} className="rounded-2xl bg-ouro-50/70 p-4 ring-1 ring-ouro-200/70 ring-inset">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-ouro-700 ring-1 ring-ouro-200">
                <Sparkles className="size-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {andamento.titulo}
                  {!casoId && (
                    <>
                      {" · "}
                      <Link href={`/painel/casos/${andamento.casoId}`} className="font-medium text-tinta-2 hover:underline">
                        {nomes.caso(andamento.casoId)}
                      </Link>
                    </>
                  )}
                </p>
                <p className="mt-1 text-sm text-tinta-2">{andamento.resumoIA}</p>
                <p className="mt-2 text-sm">
                  <span className="text-mudo">Prazo sugerido: </span>
                  <span className="font-medium">{sugestao.titulo}</span>
                  <span className="text-mudo">
                    {" "}
                    · {sugestao.diasUteis} dias úteis · vence {dataSemana(sugestao.dataFatal)} · interno {dataSemana(sugestao.dataInterna)}{" "}
                    · {nomes.usuario(sugestao.responsavelId)}
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Botao
                    tamanho="p"
                    onClick={() => {
                      responder(andamento.id, "confirmada");
                      avisar(`Prazo criado: ${sugestao.titulo}.`);
                    }}
                  >
                    <Check className="size-4" aria-hidden="true" />
                    Confirmar prazo
                  </Botao>
                  <Botao
                    tamanho="p"
                    variante="fantasma"
                    onClick={() => {
                      responder(andamento.id, "descartada");
                      avisar("Sugestão descartada.", "info");
                    }}
                  >
                    <X className="size-4" aria-hidden="true" />
                    Descartar
                  </Botao>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
