"use client";

import { AlarmClock, Bell, MessageCircle, Sparkles, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useLoja } from "@/lib/dados/loja";
import { grupoDoPrazo, resumoFinanceiro, sugestoesPendentes } from "@/lib/dados/metricas";
import { brl, plural } from "@/lib/formatos";
import { useHoje } from "./ganchos";

interface Alerta {
  chave: string;
  href: string;
  icone: LucideIcon;
  titulo: string;
  detalhe: string;
  urgente?: boolean;
}

/** Sino da barra superior: o que precisa de atenção agora. */
export function Notificacoes() {
  const hoje = useHoje();
  const [aberto, definirAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const prazos = useLoja((s) => s.prazos);
  const andamentos = useLoja((s) => s.andamentos);
  const lancamentos = useLoja((s) => s.lancamentos);
  const conversas = useLoja((s) => s.conversas);

  useLayoutEffect(() => () => definirAberto(false), []);

  useEffect(() => {
    if (!aberto) return;
    function fora(evento: PointerEvent) {
      if (!raiz.current?.contains(evento.target as Node)) definirAberto(false);
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") definirAberto(false);
    }
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const alertas = useMemo<Alerta[]>(() => {
    const lista: Alerta[] = [];
    const atrasados = prazos.filter((p) => grupoDoPrazo(p, hoje) === "atrasados").length;
    const vencemHoje = prazos.filter((p) => grupoDoPrazo(p, hoje) === "hoje").length;
    const sugestoes = sugestoesPendentes(andamentos).length;
    const financeiro = resumoFinanceiro(lancamentos, hoje);
    const aguardando = conversas.filter((c) => c.naoLidas > 0).length;

    if (atrasados)
      lista.push({
        chave: "atrasados",
        href: "/painel/prazos",
        icone: AlarmClock,
        titulo: plural(atrasados, "prazo atrasado", "prazos atrasados"),
        detalhe: "Confira e regularize o quanto antes.",
        urgente: true,
      });
    if (vencemHoje)
      lista.push({
        chave: "hoje",
        href: "/painel/prazos",
        icone: AlarmClock,
        titulo: `${plural(vencemHoje, "prazo vence", "prazos vencem")} hoje`,
        detalhe: "Data fatal hoje.",
      });
    if (sugestoes)
      lista.push({
        chave: "sugestoes",
        href: "/painel/prazos",
        icone: Sparkles,
        titulo: plural(sugestoes, "publicação nova", "publicações novas"),
        detalhe: "A IA sugeriu prazos. Falta você confirmar.",
      });
    if (aguardando)
      lista.push({
        chave: "conversas",
        href: "/painel/atendimento",
        icone: MessageCircle,
        titulo: plural(aguardando, "conversa esperando", "conversas esperando"),
        detalhe: "Clientes aguardando a equipe no WhatsApp.",
      });
    if (financeiro.parcelasEmAtraso)
      lista.push({
        chave: "financeiro",
        href: "/painel/financeiro",
        icone: Wallet,
        titulo: `${brl(financeiro.emAtraso)} em atraso`,
        detalhe: plural(financeiro.parcelasEmAtraso, "parcela vencida", "parcelas vencidas"),
      });
    return lista;
  }, [prazos, andamentos, lancamentos, conversas, hoje]);

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-label={`Avisos${alertas.length ? ` (${alertas.length})` : ""}`}
        aria-expanded={aberto}
        onClick={() => definirAberto((v) => !v)}
        className="relative flex size-10 items-center justify-center rounded-full text-tinta-2 transition-colors hover:bg-black/5"
      >
        <Bell className="size-[1.15rem]" aria-hidden="true" />
        {alertas.length > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-ouro-500 ring-2 ring-fundo" />}
      </button>

      {aberto && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-surgir overflow-hidden rounded-3xl bg-white shadow-flutuante">
          <p className="px-5 pt-4 pb-2 text-sm font-semibold">Precisa da sua atenção</p>
          {alertas.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-mudo">Tudo em dia. Nada pendente agora.</p>
          ) : (
            <ul className="p-2 pt-0">
              {alertas.map((alerta) => (
                <li key={alerta.chave}>
                  <Link
                    href={alerta.href}
                    onClick={() => definirAberto(false)}
                    className="flex items-start gap-3 rounded-2xl px-3 py-2.5 hover:bg-fundo"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                        alerta.urgente ? "bg-critico-fundo text-critico" : "bg-ouro-50 text-ouro-700",
                      )}
                    >
                      <alerta.icone className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{alerta.titulo}</span>
                      <span className="block text-xs text-mudo">{alerta.detalhe}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
