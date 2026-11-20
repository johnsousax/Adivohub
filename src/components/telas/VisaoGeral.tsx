"use client";

import { ArrowRight, CalendarDays, CircleCheck, Gavel, MessageCircle, Plus, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { BarrasRanqueadas, CartaoGrafico, GraficoColunas, Indicador } from "@/components/graficos/Graficos";
import { FormCaso } from "@/components/painel/FormulariosCadastro";
import { FormPrazo } from "@/components/painel/FormulariosRotina";
import { useHoje, useSessao } from "@/components/painel/ganchos";
import { LinhaPrazo, SugestoesDaIA } from "@/components/painel/Pecas";
import { CabecalhoCartao, CabecalhoPagina, Cartao, Etiqueta, Vazio } from "@/components/ui/Basicos";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { useDialogo } from "@/components/ui/Modal";
import { fotografarDados, useLoja } from "@/lib/dados/loja";
import {
  contagemFunil,
  montarBriefing,
  prazosAbertos,
  proximosEventos,
  receitaPorArea,
  resumoClientes,
  resumoFinanceiro,
  serieMensal,
  sugestoesPendentes,
} from "@/lib/dados/metricas";
import { brl, dataLonga, dataSemana, hora, mesAno, mesCurto, milhares, percentual, plural } from "@/lib/formatos";
import { AREAS, ETAPAS_FUNIL, TIPOS_EVENTO } from "@/lib/tipos";
import { linkCompartilharWhatsApp } from "@/lib/whatsapp";

function saudacao(): string {
  const horas = new Date().getHours();
  if (horas < 12) return "Bom dia";
  if (horas < 18) return "Boa tarde";
  return "Boa noite";
}

export function TelaVisaoGeral() {
  const hoje = useHoje();
  const sessao = useSessao();
  const formCaso = useDialogo();
  const formPrazo = useDialogo();

  const lancamentos = useLoja((s) => s.lancamentos);
  const casos = useLoja((s) => s.casos);
  const clientes = useLoja((s) => s.clientes);
  const prazos = useLoja((s) => s.prazos);
  const eventos = useLoja((s) => s.eventos);
  const andamentos = useLoja((s) => s.andamentos);
  const conversas = useLoja((s) => s.conversas);

  const financeiro = useMemo(() => resumoFinanceiro(lancamentos, hoje), [lancamentos, hoje]);
  const serie = useMemo(() => serieMensal(lancamentos, hoje), [lancamentos, hoje]);
  const porArea = useMemo(() => receitaPorArea(lancamentos, casos, hoje), [lancamentos, casos, hoje]);
  const abertos = useMemo(() => prazosAbertos(prazos).slice(0, 6), [prazos]);
  const agenda = useMemo(() => proximosEventos(eventos, hoje, 5), [eventos, hoje]);
  const funil = useMemo(() => contagemFunil(clientes), [clientes]);
  const resumoDeClientes = useMemo(() => resumoClientes(clientes, hoje), [clientes, hoje]);
  const pendentes = useMemo(() => sugestoesPendentes(andamentos).length, [andamentos]);
  const casosAtivos = casos.filter((c) => c.fase !== "encerrado").length;

  // O briefing depende de quase tudo; recalcula quando qualquer parte muda.
  const briefing = useMemo(
    () => montarBriefing(fotografarDados(), hoje),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hoje, lancamentos, prazos, eventos, andamentos, conversas],
  );

  const primeiroNome = sessao.nome.split(" ").slice(0, 2).join(" ");
  const { proximoEvento, proximoPrazo } = briefing;
  const linhasBriefing = [
    briefing.audienciasHoje.length || briefing.compromissosHoje.length
      ? `${plural(briefing.audienciasHoje.length, "audiência", "audiências")} e ${plural(briefing.compromissosHoje.length, "outro compromisso", "outros compromissos")} hoje`
      : proximoEvento
        ? `Agenda livre hoje. Próximo: ${proximoEvento.titulo}, ${dataSemana(proximoEvento.inicio)} às ${hora(proximoEvento.inicio)}`
        : "Agenda livre hoje",
    briefing.prazosHoje.length
      ? `${plural(briefing.prazosHoje.length, "prazo vence", "prazos vencem")} hoje${briefing.prazosAtrasados.length ? ` e ${plural(briefing.prazosAtrasados.length, "está atrasado", "estão atrasados")}` : ""}`
      : `${briefing.prazosAtrasados.length ? `${plural(briefing.prazosAtrasados.length, "prazo atrasado", "prazos atrasados")}. ` : "Nenhum prazo vence hoje. "}${
          proximoPrazo ? `Próximo: ${proximoPrazo.titulo}, ${dataSemana(proximoPrazo.dataFatal)}` : "Nada pendente à frente"
        }`,
    briefing.sugestoes.length
      ? `${plural(briefing.sugestoes.length, "publicação nova", "publicações novas")} com prazo sugerido pela IA`
      : "Nenhuma publicação nova",
    `${brl(briefing.recebidoOntem, { centavos: false })} recebidos ontem · ${plural(briefing.parcelasEmAtraso, "parcela em atraso", "parcelas em atraso")}`,
  ];
  const textoWhatsApp = `*${saudacao()}, ${primeiroNome}!* Resumo de ${dataSemana(hoje)}:\n\n${linhasBriefing.map((l) => `• ${l}`).join("\n")}\n\n_Enviado pelo Vade_`;

  return (
    <>
      <CabecalhoPagina
        titulo={`${saudacao()}, ${primeiroNome}`}
        descricao={<span className="first-letter:uppercase">{dataLonga(hoje)}</span>}
        acoes={
          <>
            <Botao variante="secundario" onClick={formPrazo.abrir}>
              <Plus className="size-4" aria-hidden="true" />
              Prazo
            </Botao>
            <Botao onClick={formCaso.abrir}>
              <Plus className="size-4" aria-hidden="true" />
              Novo caso
            </Botao>
          </>
        }
      />

      {/* Briefing do dia: o resumo que a IA envia toda manhã. */}
      <section aria-label="Resumo do dia" className="relative overflow-hidden rounded-cartao bg-noite-1 p-6 text-white sm:p-7">
        <div className="pointer-events-none absolute -top-40 -right-24 size-96 rounded-full bg-ouro-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-ouro-300">
              <Sparkles className="size-4" aria-hidden="true" />
              Seu dia, resumido pela IA
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-x-10 gap-y-2.5 sm:grid-cols-2">
              {linhasBriefing.map((linha) => (
                <li key={linha} className="flex items-start gap-2.5 text-[0.95rem] text-white/85">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ouro-400" aria-hidden="true" />
                  {linha}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-2">
            <BotaoLink href={linkCompartilharWhatsApp(textoWhatsApp)} variante="ouro" tamanho="p">
              <Send className="size-4" aria-hidden="true" />
              Enviar no meu WhatsApp
            </BotaoLink>
            <BotaoLink href="/painel/assistente" variante="claro" tamanho="p">
              Perguntar ao assistente
            </BotaoLink>
          </div>
        </div>
      </section>

      <section aria-label="Indicadores" className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Recebido no mês"
          valor={brl(financeiro.recebidoMes, { centavos: false })}
          variacao={financeiro.variacaoRecebido}
          comparacao="vs. mesmo período do mês anterior"
        />
        <Indicador
          rotulo="A receber em 30 dias"
          valor={brl(financeiro.aReceber30Dias, { centavos: false })}
          apoio={plural(financeiro.parcelasAReceber30Dias, "parcela", "parcelas")}
        />
        <Indicador
          rotulo="Em atraso"
          valor={brl(financeiro.emAtraso, { centavos: false })}
          apoio={`${plural(financeiro.parcelasEmAtraso, "parcela", "parcelas")} · inadimplência de ${percentual(financeiro.inadimplencia)}`}
        />
        <Indicador
          rotulo="Casos ativos"
          valor={String(casosAtivos)}
          apoio={`${plural(resumoDeClientes.ativos, "cliente", "clientes")} · ${plural(resumoDeClientes.leads, "contato no funil", "contatos no funil")}`}
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <CartaoGrafico
          className="xl:col-span-2"
          titulo="Recebido por mês"
          descricao={`Últimos 6 meses · ${mesAno(hoje)} em destaque`}
          tabela={{
            colunas: ["Mês", "Recebido", "Despesas", "Resultado"],
            linhas: serie.map((p) => [mesAno(p.mes), brl(p.recebido), brl(p.despesas), brl(p.recebido - p.despesas)]),
          }}
        >
          <GraficoColunas
            dados={serie.map((p, i) => ({ chave: p.mes, rotulo: mesCurto(p.mes), valor: p.recebido, destaque: i === serie.length - 1 }))}
            formatar={(v) => brl(v)}
            formatarEixo={milhares}
            altura={236}
          />
        </CartaoGrafico>

        <Cartao>
          <CabecalhoCartao
            titulo="Próximos prazos"
            acao={
              <Link href="/painel/prazos" className="inline-flex items-center gap-1 text-sm font-medium text-mudo hover:text-tinta">
                Ver todos <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          />
          {abertos.length ? (
            <ul className="divide-y divide-linha px-5 pb-3 sm:px-6">
              {abertos.map((prazo) => (
                <LinhaPrazo key={prazo.id} prazo={prazo} />
              ))}
            </ul>
          ) : (
            <Vazio
              icone={CircleCheck}
              titulo="Nenhum prazo em aberto"
              descricao="Quando houver, eles aparecem aqui por ordem de vencimento."
            />
          )}
        </Cartao>
      </div>

      {pendentes > 0 && (
        <Cartao className="mt-4">
          <CabecalhoCartao
            titulo="Publicações novas"
            descricao="A IA leu, resumiu e sugeriu o prazo. O prazo só vale depois da sua confirmação."
            acao={<Etiqueta tom="ouro">{plural(pendentes, "pendente", "pendentes")}</Etiqueta>}
          />
          <SugestoesDaIA className="px-5 pb-5 sm:px-6" />
        </Cartao>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Cartao>
          <CabecalhoCartao
            titulo="Agenda"
            acao={
              <Link href="/painel/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-mudo hover:text-tinta">
                Abrir <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          />
          {agenda.length ? (
            <ul className="divide-y divide-linha px-5 pb-3 sm:px-6">
              {agenda.map((evento) => (
                <li key={evento.id} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-fundo text-tinta-2">
                    {evento.tipo === "audiencia" ? (
                      <Gavel className="size-4" aria-hidden="true" />
                    ) : (
                      <CalendarDays className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{evento.titulo}</p>
                    <p className="text-xs text-mudo">
                      <span className="capitalize">{dataSemana(evento.inicio)}</span> às {hora(evento.inicio)} · {TIPOS_EVENTO[evento.tipo]}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Vazio icone={CalendarDays} titulo="Agenda livre" descricao="Nenhum compromisso marcado." />
          )}
        </Cartao>

        <CartaoGrafico
          titulo="Receita por área"
          descricao="Recebido nos últimos 6 meses"
          tabela={{
            colunas: ["Área", "Recebido"],
            linhas: porArea.map((f) => [f.area === "outros" ? "Avulsos e outros" : AREAS[f.area], brl(f.valor)]),
          }}
        >
          <BarrasRanqueadas
            itens={porArea.map((f) => ({
              chave: f.area,
              rotulo: f.area === "outros" ? "Avulsos e outros" : AREAS[f.area],
              valor: f.valor,
            }))}
            formatar={(v) => brl(v, { centavos: false })}
          />
        </CartaoGrafico>

        <Cartao>
          <CabecalhoCartao
            titulo="Novos clientes"
            descricao="Contatos em cada etapa do funil"
            acao={
              <Link href="/painel/clientes" className="inline-flex items-center gap-1 text-sm font-medium text-mudo hover:text-tinta">
                Abrir <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          />
          <ul className="space-y-1 px-5 pb-4 sm:px-6">
            {funil.map((etapa) => (
              <li key={etapa.etapa} className="flex items-center justify-between rounded-xl px-3 py-2.5 odd:bg-fundo/70">
                <span className="text-sm text-tinta-2">{ETAPAS_FUNIL[etapa.etapa]}</span>
                <span className="text-sm font-semibold tabular-nums">{etapa.quantidade}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-linha px-5 py-3.5 sm:px-6">
            <Link href="/painel/atendimento" className="flex items-center gap-2 text-sm text-mudo hover:text-tinta">
              <MessageCircle className="size-4" aria-hidden="true" />
              {briefing.conversasAguardando
                ? `${plural(briefing.conversasAguardando, "conversa esperando", "conversas esperando")} a equipe`
                : "Atendimento em dia"}
            </Link>
          </div>
        </Cartao>
      </div>

      <FormCaso aberto={formCaso.aberto} aoFechar={formCaso.fechar} />
      <FormPrazo aberto={formPrazo.aberto} aoFechar={formPrazo.fechar} />
    </>
  );
}
