"use client";

import { addDays, addMonths, endOfMonth, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlarmClock, CalendarDays, ChevronLeft, ChevronRight, Gavel, MapPin, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FormEvento } from "@/components/painel/FormulariosRotina";
import { useHoje, useNomes } from "@/components/painel/ganchos";
import { avisar } from "@/components/ui/Avisos";
import { CabecalhoPagina, Cartao, Etiqueta, Vazio } from "@/components/ui/Basicos";
import { Botao } from "@/components/ui/Botao";
import { Filtro } from "@/components/ui/Campos";
import { useDialogo } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { useLoja } from "@/lib/dados/loja";
import { feriados, paraISO } from "@/lib/datas";
import { dataLonga, hora, plural } from "@/lib/formatos";
import { TIPOS_EVENTO } from "@/lib/tipos";

const DIAS_DA_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function TelaAgenda() {
  const hoje = useHoje();
  const nomes = useNomes();
  const form = useDialogo();
  const eventos = useLoja((s) => s.eventos);
  const prazos = useLoja((s) => s.prazos);
  const usuarios = useLoja((s) => s.usuarios);
  const removerEvento = useLoja((s) => s.removerEvento);

  const [mes, definirMes] = useState(() => startOfMonth(hoje));
  const [selecionado, definirSelecionado] = useState(() => paraISO(hoje));
  const [responsavel, definirResponsavel] = useState("");

  const eventosFiltrados = useMemo(() => eventos.filter((e) => !responsavel || e.responsavelId === responsavel), [eventos, responsavel]);
  const prazosAbertos = useMemo(
    () => prazos.filter((p) => !p.concluidoEm && (!responsavel || p.responsavelId === responsavel)),
    [prazos, responsavel],
  );

  /** Semanas completas (domingo a sábado) que cobrem o mês visível. */
  const dias = useMemo(() => {
    const inicio = startOfWeek(mes, { weekStartsOn: 0 });
    const fim = endOfMonth(mes);
    const lista: Date[] = [];
    for (let dia = inicio; dia <= fim || lista.length % 7 !== 0; dia = addDays(dia, 1)) lista.push(dia);
    return lista;
  }, [mes]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, { eventos: typeof eventos; prazos: typeof prazos }>();
    const obter = (iso: string) => {
      let item = mapa.get(iso);
      if (!item) {
        item = { eventos: [], prazos: [] };
        mapa.set(iso, item);
      }
      return item;
    };
    for (const evento of eventosFiltrados) obter(evento.inicio.slice(0, 10)).eventos.push(evento);
    for (const prazo of prazosAbertos) obter(prazo.dataFatal).prazos.push(prazo);
    for (const item of mapa.values()) item.eventos.sort((a, b) => a.inicio.localeCompare(b.inicio));
    return mapa;
  }, [eventosFiltrados, prazosAbertos]);

  const hojeISO = paraISO(hoje);
  const doDia = porDia.get(selecionado) ?? { eventos: [], prazos: [] };
  const dataSelecionada = parseISO(selecionado);
  const feriado = feriados(dataSelecionada.getFullYear()).get(selecionado);

  function irPara(data: Date) {
    definirMes(startOfMonth(data));
    definirSelecionado(paraISO(data));
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Agenda"
        descricao="Audiências, reuniões, consultas e prazos em um só calendário."
        acoes={
          <Botao onClick={form.abrir}>
            <Plus className="size-4" aria-hidden="true" />
            Novo compromisso
          </Botao>
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_22rem]">
        <Cartao className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-lg font-semibold tracking-[-0.02em] first-letter:uppercase">
              {format(mes, "MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
            <Filtro rotulo="Responsável" value={responsavel} onChange={(e) => definirResponsavel(e.target.value)}>
              <option value="">Toda a equipe</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Filtro>
            <Botao variante="secundario" tamanho="p" onClick={() => irPara(hoje)}>
              Hoje
            </Botao>
            <div className="flex">
              <button
                type="button"
                aria-label="Mês anterior"
                onClick={() => definirMes((m) => addMonths(m, -1))}
                className="flex size-9 items-center justify-center rounded-full text-tinta-2 hover:bg-fundo"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Próximo mês"
                onClick={() => definirMes((m) => addMonths(m, 1))}
                className="flex size-9 items-center justify-center rounded-full text-tinta-2 hover:bg-fundo"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-medium text-mudo" aria-hidden="true">
            {DIAS_DA_SEMANA.map((dia) => (
              <div key={dia} className="pb-2 capitalize">
                {dia}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl bg-linha ring-1 ring-linha">
            {dias.map((dia) => {
              const iso = paraISO(dia);
              const itens = porDia.get(iso);
              const doMes = isSameMonth(dia, mes);
              const ehHoje = iso === hojeISO;
              const ativo = iso === selecionado;
              const total = (itens?.eventos.length ?? 0) + (itens?.prazos.length ?? 0);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => definirSelecionado(iso)}
                  aria-pressed={ativo}
                  aria-label={`${dataLonga(dia)}${total ? `, ${plural(total, "item", "itens")}` : ""}`}
                  className={cn(
                    "flex min-h-[4.25rem] flex-col gap-1 bg-white p-1.5 text-left transition-colors hover:bg-fundo focus-visible:z-10 sm:min-h-[6.5rem] sm:p-2",
                    !doMes && "bg-fundo/60",
                    ativo && "bg-ouro-50 hover:bg-ouro-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums",
                      ehHoje ? "bg-tinta text-white" : doMes ? "text-tinta" : "text-sutil",
                    )}
                  >
                    {dia.getDate()}
                  </span>
                  {/* Telas largas: títulos. Celular: só marcadores. */}
                  <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                    {itens?.eventos.slice(0, 2).map((evento) => (
                      <span
                        key={evento.id}
                        className="truncate rounded-md bg-fundo px-1.5 py-0.5 text-[0.6875rem] leading-tight text-tinta-2"
                      >
                        <span className="tabular-nums">{hora(evento.inicio)}</span> {evento.titulo}
                      </span>
                    ))}
                    {itens?.prazos.slice(0, 1).map((prazo) => (
                      <span
                        key={prazo.id}
                        className="truncate rounded-md bg-ouro-100 px-1.5 py-0.5 text-[0.6875rem] leading-tight text-ouro-800"
                      >
                        Prazo: {prazo.titulo}
                      </span>
                    ))}
                    {total > 3 && <span className="px-1.5 text-[0.6875rem] text-mudo">+{total - 3}</span>}
                  </span>
                  <span className="flex gap-1 sm:hidden" aria-hidden="true">
                    {itens?.eventos.length ? <span className="size-1.5 rounded-full bg-tinta" /> : null}
                    {itens?.prazos.length ? <span className="size-1.5 rounded-full bg-ouro-500" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mudo">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-tinta" /> Compromisso
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-ouro-500" /> Prazo (data fatal)
            </span>
          </p>
        </Cartao>

        <Cartao className="self-start">
          <div className="px-5 pt-5 pb-3 sm:px-6">
            <h2 className="text-[0.95rem] font-semibold first-letter:uppercase">{dataLonga(dataSelecionada)}</h2>
            <p className="mt-0.5 text-sm text-mudo">
              {feriado ? `Feriado: ${feriado}. ` : ""}
              {doDia.eventos.length + doDia.prazos.length === 0
                ? "Dia livre."
                : `${plural(doDia.eventos.length, "compromisso", "compromissos")} · ${plural(doDia.prazos.length, "prazo", "prazos")}`}
            </p>
          </div>

          {doDia.eventos.length + doDia.prazos.length === 0 ? (
            <Vazio
              icone={CalendarDays}
              titulo="Nada marcado"
              acao={
                <Botao tamanho="p" variante="secundario" onClick={form.abrir}>
                  Marcar compromisso
                </Botao>
              }
            />
          ) : (
            <ul className="divide-y divide-linha px-5 pb-3 sm:px-6">
              {doDia.prazos.map((prazo) => (
                <li key={prazo.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-ouro-50 text-ouro-700">
                    <AlarmClock className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{prazo.titulo}</p>
                    <p className="text-xs text-mudo">
                      Data fatal ·{" "}
                      <Link href={`/painel/casos/${prazo.casoId}`} className="hover:underline">
                        {nomes.caso(prazo.casoId)}
                      </Link>{" "}
                      · {nomes.usuario(prazo.responsavelId)}
                    </p>
                  </div>
                </li>
              ))}
              {doDia.eventos.map((evento) => (
                <li key={evento.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-fundo text-tinta-2">
                    {evento.tipo === "audiencia" ? (
                      <Gavel className="size-4" aria-hidden="true" />
                    ) : (
                      <CalendarDays className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{evento.titulo}</p>
                    <p className="text-xs text-mudo">
                      {hora(evento.inicio)}–{hora(evento.fim)} · {TIPOS_EVENTO[evento.tipo]} · {nomes.usuario(evento.responsavelId)}
                    </p>
                    {evento.local && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-mudo">
                        <MapPin className="size-3 shrink-0" aria-hidden="true" />
                        {evento.local}
                      </p>
                    )}
                    {evento.criadoPorIA && (
                      <Etiqueta tom="ouro" icone={Sparkles} className="mt-1.5">
                        Agendado pela IA
                      </Etiqueta>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Excluir compromisso: ${evento.titulo}`}
                    title="Excluir"
                    onClick={() => {
                      removerEvento(evento.id);
                      avisar("Compromisso excluído.", "info");
                    }}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-sutil hover:bg-critico-fundo hover:text-critico"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {doDia.eventos.length + doDia.prazos.length > 0 && (
            <div className="border-t border-linha px-5 py-3.5 sm:px-6">
              <button
                type="button"
                onClick={form.abrir}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-mudo hover:text-tinta"
              >
                <Plus className="size-4" aria-hidden="true" />
                Marcar neste dia
              </button>
            </div>
          )}
        </Cartao>
      </div>

      <FormEvento aberto={form.aberto} aoFechar={form.fechar} dia={selecionado} />
    </>
  );
}
