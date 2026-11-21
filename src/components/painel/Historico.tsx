"use client";

import { Bot, CalendarClock, Flag, Mail, MessageCircle, NotebookPen, Phone, Plus, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { useNomes } from "@/components/painel/ganchos";
import { CabecalhoCartao, Cartao } from "@/components/ui/Basicos";
import { Botao } from "@/components/ui/Botao";
import { useLoja } from "@/lib/dados/loja";
import { cn } from "@/lib/cn";
import { dataCurta, hora } from "@/lib/formatos";
import { TIPOS_INTERACAO, type TipoInteracao } from "@/lib/tipos";

const ICONES: Record<TipoInteracao, LucideIcon> = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  reuniao: CalendarClock,
  email: Mail,
  nota: NotebookPen,
  etapa: Flag,
};

/** Linha do tempo de contatos com o cliente ou contato, do mais recente para o mais antigo. */
export function HistoricoContatos({ clienteId, aoRegistrar }: { clienteId: string; aoRegistrar: () => void }) {
  const nomes = useNomes();
  const todas = useLoja((s) => s.interacoes);
  const interacoes = useMemo(
    () => todas.filter((i) => i.clienteId === clienteId).sort((a, b) => b.em.localeCompare(a.em)),
    [todas, clienteId],
  );

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Histórico de contatos"
        acao={
          <Botao tamanho="p" variante="fantasma" onClick={aoRegistrar}>
            <Plus className="size-4" aria-hidden="true" />
            Registrar
          </Botao>
        }
      />
      {interacoes.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-mudo sm:px-6">Nenhum contato registrado ainda.</p>
      ) : (
        <ol className="px-5 pb-4 sm:px-6">
          {interacoes.map((interacao, indice) => {
            const Icone = interacao.porIA ? Bot : ICONES[interacao.tipo];
            const marco = interacao.tipo === "etapa";
            return (
              <li key={interacao.id} className="relative flex gap-3 pb-4">
                {indice < interacoes.length - 1 && (
                  <span className="absolute top-8 bottom-0 left-[0.9rem] w-px bg-linha" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    "relative flex size-7 shrink-0 items-center justify-center rounded-full ring-1",
                    marco ? "bg-ouro-50 text-ouro-700 ring-ouro-200" : "bg-fundo text-tinta-2 ring-linha",
                  )}
                >
                  <Icone className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className={cn("text-sm leading-relaxed", marco ? "text-tinta-2" : "text-tinta")}>{interacao.resumo}</p>
                  <p className="mt-0.5 text-xs text-mudo">
                    {TIPOS_INTERACAO[interacao.tipo]} · {dataCurta(interacao.em)} às {hora(interacao.em)} ·{" "}
                    {interacao.porIA ? "atendente virtual" : nomes.usuario(interacao.usuarioId)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Cartao>
  );
}
