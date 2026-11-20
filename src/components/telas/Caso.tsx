"use client";

import { CalendarPlus, ChevronLeft, Copy, FileText, MessageCircle, Pencil, Plus, Scale, Sparkles, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { FormCaso } from "@/components/painel/FormulariosCadastro";
import { FormEvento, FormPrazo } from "@/components/painel/FormulariosRotina";
import { useHoje, useNomes } from "@/components/painel/ganchos";
import { LinhaPrazo, SugestoesDaIA } from "@/components/painel/Pecas";
import { avisar } from "@/components/ui/Avisos";
import { CabecalhoCartao, Cartao, Etiqueta, Vazio } from "@/components/ui/Basicos";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Selecao } from "@/components/ui/Campos";
import { Modal, RodapeModal, useDialogo } from "@/components/ui/Modal";
import { useLoja } from "@/lib/dados/loja";
import { situacao } from "@/lib/dados/metricas";
import { paraISO } from "@/lib/datas";
import { brl, dataCurta, dataSemana, hora } from "@/lib/formatos";
import { AREAS, FASES, TIPOS_CONTRATO, type FaseCaso, type TipoAndamento } from "@/lib/tipos";
import { linkWhatsApp, saudacao } from "@/lib/whatsapp";
import { TOM_DA_FASE } from "./Casos";

const ICONE_ANDAMENTO: Record<TipoAndamento, typeof FileText> = {
  publicacao: Sparkles,
  andamento: FileText,
  nota: StickyNote,
};

const ROTULO_ANDAMENTO: Record<TipoAndamento, string> = {
  publicacao: "Publicação",
  andamento: "Andamento",
  nota: "Nota interna",
};

export function TelaCaso() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hoje = useHoje();
  const nomes = useNomes();

  const caso = useLoja((s) => s.casos.find((c) => c.id === id));
  const clientes = useLoja((s) => s.clientes);
  const todosAndamentos = useLoja((s) => s.andamentos);
  const todosPrazos = useLoja((s) => s.prazos);
  const todosEventos = useLoja((s) => s.eventos);
  const todosContratos = useLoja((s) => s.contratos);
  const todosLancamentos = useLoja((s) => s.lancamentos);
  const atualizarCaso = useLoja((s) => s.atualizarCaso);
  const removerCaso = useLoja((s) => s.removerCaso);
  const adicionarAndamento = useLoja((s) => s.adicionarAndamento);

  const formEditar = useDialogo();
  const formPrazo = useDialogo();
  const formEvento = useDialogo();
  const confirmarExclusao = useDialogo();
  const [nota, definirNota] = useState("");

  const andamentos = useMemo(
    () => todosAndamentos.filter((a) => a.casoId === id).sort((a, b) => b.data.localeCompare(a.data)),
    [todosAndamentos, id],
  );
  const prazos = useMemo(
    () =>
      todosPrazos
        .filter((p) => p.casoId === id)
        .sort((a, b) => Number(Boolean(a.concluidoEm)) - Number(Boolean(b.concluidoEm)) || a.dataFatal.localeCompare(b.dataFatal)),
    [todosPrazos, id],
  );
  const eventos = useMemo(
    () =>
      todosEventos
        .filter((e) => e.casoId === id && e.inicio >= `${paraISO(hoje)}T00:00:00`)
        .sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [todosEventos, id, hoje],
  );
  const contratos = useMemo(() => todosContratos.filter((c) => c.casoId === id), [todosContratos, id]);
  const lancamentos = useMemo(() => todosLancamentos.filter((l) => l.casoId === id && l.tipo === "receita"), [todosLancamentos, id]);

  if (!caso) {
    return (
      <Cartao>
        <Vazio
          icone={Scale}
          titulo="Caso não encontrado"
          descricao="Ele pode ter sido removido ou o endereço está incorreto."
          acao={
            <BotaoLink href="/painel/casos" tamanho="p">
              Voltar para os casos
            </BotaoLink>
          }
        />
      </Cartao>
    );
  }

  const cliente = clientes.find((c) => c.id === caso.clienteId);
  const recebido = lancamentos.filter((l) => l.pagoEm).reduce((t, l) => t + l.valor, 0);
  const emAberto = lancamentos.filter((l) => !l.pagoEm).reduce((t, l) => t + l.valor, 0);
  const emAtraso = lancamentos.filter((l) => situacao(l, hoje) === "atrasado").reduce((t, l) => t + l.valor, 0);
  const ultimoParaCliente = andamentos.find((a) => a.tipo !== "nota");

  const mensagemParaCliente = cliente
    ? `${saudacao(cliente)} Atualização do seu caso (${caso.tipoAcao}): ${
        ultimoParaCliente
          ? (ultimoParaCliente.resumoIA ?? `${ultimoParaCliente.titulo}.`)
          : `o processo está na fase de ${FASES[caso.fase].toLowerCase()}.`
      } Qualquer dúvida, é só responder por aqui.`
    : "";

  function salvarNota(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = nota.trim();
    if (!texto || !caso) return;
    adicionarAndamento({ casoId: caso.id, data: paraISO(new Date()), tipo: "nota", titulo: "Nota interna", descricao: texto });
    definirNota("");
    avisar("Nota adicionada ao caso.");
  }

  return (
    <>
      <Link href="/painel/casos" className="mb-3 inline-flex items-center gap-1 text-sm text-mudo hover:text-tinta">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Casos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.7rem] leading-tight font-bold tracking-[-0.035em] sm:text-[2rem]">{caso.titulo}</h1>
          <p className="mt-1 text-[0.95rem] text-mudo">{caso.tipoAcao}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Etiqueta>{AREAS[caso.area]}</Etiqueta>
            <Etiqueta tom={TOM_DA_FASE[caso.fase]}>{FASES[caso.fase]}</Etiqueta>
            {!caso.numeroCNJ && <Etiqueta>Consultivo</Etiqueta>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao variante="secundario" onClick={formEvento.abrir}>
            <CalendarPlus className="size-4" aria-hidden="true" />
            Compromisso
          </Botao>
          <Botao variante="secundario" onClick={formPrazo.abrir}>
            <Plus className="size-4" aria-hidden="true" />
            Prazo
          </Botao>
          <Botao onClick={formEditar.abrir}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Botao>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SugestoesDaIA casoId={caso.id} />

          <Cartao>
            <CabecalhoCartao titulo="Prazos" descricao={prazos.length ? undefined : "Nenhum prazo cadastrado neste caso."} />
            {prazos.length > 0 && (
              <ul className="divide-y divide-linha px-5 pb-3 sm:px-6">
                {prazos.map((prazo) => (
                  <LinhaPrazo key={prazo.id} prazo={prazo} mostrarCaso={false} />
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Andamentos e notas" />
            <form onSubmit={salvarNota} className="flex gap-2 px-5 pb-4 sm:px-6">
              <input
                value={nota}
                onChange={(e) => definirNota(e.target.value)}
                placeholder="Escreva uma nota interna sobre o caso"
                aria-label="Nova nota interna"
                className="h-10 min-w-0 flex-1 rounded-full bg-fundo px-4 text-sm outline-none placeholder:text-sutil focus:ring-2 focus:ring-tinta"
              />
              <Botao type="submit" variante="secundario" disabled={!nota.trim()}>
                Adicionar
              </Botao>
            </form>
            {andamentos.length === 0 ? (
              <Vazio
                icone={FileText}
                titulo="Sem andamentos ainda"
                descricao="As movimentações do processo e as notas da equipe aparecem aqui."
              />
            ) : (
              <ol className="px-5 pb-5 sm:px-6">
                {andamentos.map((andamento, indice) => {
                  const Icone = ICONE_ANDAMENTO[andamento.tipo];
                  return (
                    <li key={andamento.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {indice < andamentos.length - 1 && (
                        <span className="absolute top-9 bottom-1 left-4 w-px bg-linha" aria-hidden="true" />
                      )}
                      <span
                        className={`relative flex size-8 shrink-0 items-center justify-center rounded-full ${andamento.tipo === "publicacao" ? "bg-ouro-50 text-ouro-700 ring-1 ring-ouro-200" : "bg-fundo text-mudo"}`}
                      >
                        <Icone className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <p className="text-sm font-semibold">{andamento.titulo}</p>
                          <p className="text-xs text-mudo">
                            {ROTULO_ANDAMENTO[andamento.tipo]} · {dataCurta(andamento.data)}
                          </p>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-tinta-2">{andamento.descricao}</p>
                        {andamento.resumoIA && (
                          <p className="mt-2 rounded-xl bg-ouro-50/70 px-3 py-2 text-sm text-tinta-2">
                            <span className="font-medium text-ouro-800">Em linguagem simples: </span>
                            {andamento.resumoIA}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Cartao>
        </div>

        <div className="space-y-4">
          <Cartao>
            <CabecalhoCartao titulo="Dados do processo" />
            <dl className="space-y-3.5 px-5 pb-5 text-sm sm:px-6">
              <div>
                <dt className="text-xs text-mudo">Cliente</dt>
                <dd className="mt-0.5">
                  <Link href={`/painel/clientes/${caso.clienteId}`} className="font-medium hover:underline">
                    {nomes.cliente(caso.clienteId)}
                  </Link>
                </dd>
              </div>
              {caso.numeroCNJ && (
                <div>
                  <dt className="text-xs text-mudo">Número do processo</dt>
                  <dd className="mt-0.5 flex items-center gap-1.5">
                    <span className="font-medium tabular-nums">{caso.numeroCNJ}</span>
                    <button
                      type="button"
                      aria-label="Copiar número do processo"
                      title="Copiar"
                      onClick={() => {
                        void navigator.clipboard.writeText(caso.numeroCNJ!).then(
                          () => avisar("Número copiado."),
                          () => avisar("Não foi possível copiar.", "erro"),
                        );
                      }}
                      className="flex size-7 items-center justify-center rounded-full text-mudo hover:bg-fundo hover:text-tinta"
                    >
                      <Copy className="size-3.5" aria-hidden="true" />
                    </button>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-mudo">Vara ou órgão</dt>
                <dd className="mt-0.5">{caso.orgao}</dd>
              </div>
              <div>
                <dt className="text-xs text-mudo">Parte contrária</dt>
                <dd className="mt-0.5">{caso.parteContraria}</dd>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-mudo">Responsável</dt>
                  <dd className="mt-0.5">{nomes.usuario(caso.responsavelId)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-mudo">Valor da causa</dt>
                  <dd className="mt-0.5">{caso.valorCausa ? brl(caso.valorCausa, { centavos: false }) : "—"}</dd>
                </div>
              </div>
              {caso.descricao && (
                <div>
                  <dt className="text-xs text-mudo">Resumo</dt>
                  <dd className="mt-0.5 leading-relaxed text-tinta-2">{caso.descricao}</dd>
                </div>
              )}
            </dl>
            <div className="border-t border-linha px-5 py-4 sm:px-6">
              <Selecao
                rotulo="Fase do caso"
                value={caso.fase}
                onChange={(e) => {
                  atualizarCaso(caso.id, { fase: e.target.value as FaseCaso });
                  avisar(`Fase alterada para ${FASES[e.target.value as FaseCaso]}.`);
                }}
              >
                {Object.entries(FASES).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </Selecao>
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Honorários" />
            <div className="px-5 pb-5 sm:px-6">
              {contratos.length === 0 && lancamentos.length === 0 ? (
                <p className="text-sm text-mudo">Nenhum contrato vinculado a este caso.</p>
              ) : (
                <>
                  {contratos.map((contrato) => (
                    <p key={contrato.id} className="text-sm">
                      <span className="font-medium">{TIPOS_CONTRATO[contrato.tipo]}</span>
                      <span className="text-mudo"> · {contrato.descricao}</span>
                    </p>
                  ))}
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-fundo px-2 py-3">
                      <dt className="text-xs text-mudo">Recebido</dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{brl(recebido, { centavos: false })}</dd>
                    </div>
                    <div className="rounded-2xl bg-fundo px-2 py-3">
                      <dt className="text-xs text-mudo">Em aberto</dt>
                      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{brl(emAberto, { centavos: false })}</dd>
                    </div>
                    <div className={`rounded-2xl px-2 py-3 ${emAtraso ? "bg-critico-fundo" : "bg-fundo"}`}>
                      <dt className="text-xs text-mudo">Em atraso</dt>
                      <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${emAtraso ? "text-critico" : ""}`}>
                        {brl(emAtraso, { centavos: false })}
                      </dd>
                    </div>
                  </dl>
                </>
              )}
              <Link href="/painel/financeiro" className="mt-4 inline-block text-sm font-medium text-mudo hover:text-tinta">
                Abrir o financeiro
              </Link>
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Próximos compromissos" />
            <div className="px-5 pb-5 sm:px-6">
              {eventos.length === 0 ? (
                <p className="text-sm text-mudo">Nada marcado para este caso.</p>
              ) : (
                <ul className="space-y-3">
                  {eventos.map((evento) => (
                    <li key={evento.id} className="text-sm">
                      <p className="font-medium">{evento.titulo}</p>
                      <p className="text-xs text-mudo">
                        <span className="capitalize">{dataSemana(evento.inicio)}</span> às {hora(evento.inicio)}
                        {evento.local ? ` · ${evento.local}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>

          {cliente?.telefone && (
            <Cartao className="p-5 sm:p-6">
              <p className="text-sm font-semibold">Avisar o cliente</p>
              <p className="mt-1 text-sm text-mudo">
                Abre o WhatsApp com a atualização do caso em linguagem simples, pronta para revisar e enviar.
              </p>
              <BotaoLink href={linkWhatsApp(mensagemParaCliente, cliente.telefone)} variante="secundario" className="mt-4 w-full">
                <MessageCircle className="size-4" aria-hidden="true" />
                Enviar atualização
              </BotaoLink>
            </Cartao>
          )}

          <button
            type="button"
            onClick={confirmarExclusao.abrir}
            className="inline-flex items-center gap-2 px-1 text-sm text-mudo hover:text-critico"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Excluir este caso
          </button>
        </div>
      </div>

      <FormCaso aberto={formEditar.aberto} aoFechar={formEditar.fechar} caso={caso} />
      <FormPrazo aberto={formPrazo.aberto} aoFechar={formPrazo.fechar} casoId={caso.id} />
      <FormEvento aberto={formEvento.aberto} aoFechar={formEvento.fechar} casoId={caso.id} clienteId={caso.clienteId} />

      <Modal aberto={confirmarExclusao.aberto} aoFechar={confirmarExclusao.fechar} titulo="Excluir este caso?" largura="sm">
        <p className="text-sm text-tinta-2">
          Os prazos e andamentos de <strong>{caso.titulo}</strong> também serão apagados. Os lançamentos financeiros continuam no cadastro
          do cliente. Esta ação não pode ser desfeita.
        </p>
        <RodapeModal>
          <Botao variante="fantasma" onClick={confirmarExclusao.fechar}>
            Cancelar
          </Botao>
          <Botao
            variante="perigo"
            onClick={() => {
              removerCaso(caso.id);
              avisar("Caso excluído.", "info");
              router.replace("/painel/casos");
            }}
          >
            Excluir
          </Botao>
        </RodapeModal>
      </Modal>
    </>
  );
}
