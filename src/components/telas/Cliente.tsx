"use client";

import { ChevronLeft, CircleCheck, Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { FormCaso, FormCliente } from "@/components/painel/FormulariosCadastro";
import { FormLancamento } from "@/components/painel/FormulariosFinanceiro";
import { useHoje, useNomes } from "@/components/painel/ganchos";
import { avisar } from "@/components/ui/Avisos";
import { CabecalhoCartao, Cartao, Etiqueta, Vazio } from "@/components/ui/Basicos";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Modal, RodapeModal, useDialogo } from "@/components/ui/Modal";
import { useLoja } from "@/lib/dados/loja";
import { situacao } from "@/lib/dados/metricas";
import { brl, dataCurta, telefone } from "@/lib/formatos";
import { AREAS, ETAPAS_FUNIL, FASES, ORIGENS } from "@/lib/tipos";
import { linkWhatsApp } from "@/lib/whatsapp";
import { TOM_DA_FASE } from "./Casos";
import { EtiquetaSituacao } from "./Financeiro";

export function TelaCliente() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hoje = useHoje();
  const nomes = useNomes();

  const cliente = useLoja((s) => s.clientes.find((c) => c.id === id));
  const todosCasos = useLoja((s) => s.casos);
  const todosLancamentos = useLoja((s) => s.lancamentos);
  const conversas = useLoja((s) => s.conversas);
  const converterLead = useLoja((s) => s.converterLead);
  const removerCliente = useLoja((s) => s.removerCliente);
  const marcarPago = useLoja((s) => s.marcarPago);

  const formEditar = useDialogo();
  const formCaso = useDialogo();
  const formCobranca = useDialogo();
  const confirmarExclusao = useDialogo();

  const casos = useMemo(() => todosCasos.filter((c) => c.clienteId === id), [todosCasos, id]);
  const lancamentos = useMemo(
    () =>
      todosLancamentos.filter((l) => l.clienteId === id && l.tipo === "receita").sort((a, b) => b.vencimento.localeCompare(a.vencimento)),
    [todosLancamentos, id],
  );

  if (!cliente) {
    return (
      <Cartao>
        <Vazio
          icone={UserRound}
          titulo="Cadastro não encontrado"
          descricao="Ele pode ter sido removido ou o endereço está incorreto."
          acao={
            <BotaoLink href="/painel/clientes" tamanho="p">
              Voltar para os clientes
            </BotaoLink>
          }
        />
      </Cartao>
    );
  }

  const ehLead = cliente.status === "lead";
  const conversa = conversas.find((c) => c.clienteId === cliente.id);
  const recebido = lancamentos.filter((l) => l.pagoEm).reduce((t, l) => t + l.valor, 0);
  const emAberto = lancamentos.filter((l) => !l.pagoEm).reduce((t, l) => t + l.valor, 0);
  const emAtraso = lancamentos.filter((l) => situacao(l, hoje) === "atrasado").reduce((t, l) => t + l.valor, 0);

  return (
    <>
      <Link href="/painel/clientes" className="mb-3 inline-flex items-center gap-1 text-sm text-mudo hover:text-tinta">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Clientes
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.7rem] leading-tight font-bold tracking-[-0.035em] sm:text-[2rem]">{cliente.nome}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Etiqueta tom={ehLead ? "ouro" : "ok"}>{ehLead ? `Funil: ${ETAPAS_FUNIL[cliente.etapaFunil ?? "novo"]}` : "Cliente"}</Etiqueta>
            <Etiqueta>{cliente.tipo === "PJ" ? "Pessoa jurídica" : "Pessoa física"}</Etiqueta>
            <Etiqueta>Origem: {ORIGENS[cliente.origem]}</Etiqueta>
            {ehLead && cliente.areaInteresse && <Etiqueta>{AREAS[cliente.areaInteresse]}</Etiqueta>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {cliente.telefone && (
            <BotaoLink href={linkWhatsApp(undefined, cliente.telefone)} variante="secundario">
              <MessageCircle className="size-4" aria-hidden="true" />
              WhatsApp
            </BotaoLink>
          )}
          {ehLead ? (
            <Botao
              onClick={() => {
                converterLead(cliente.id);
                avisar(`${cliente.nome} agora é cliente.`);
              }}
            >
              <CircleCheck className="size-4" aria-hidden="true" />
              Virou cliente
            </Botao>
          ) : (
            <Botao onClick={formCaso.abrir}>
              <Plus className="size-4" aria-hidden="true" />
              Novo caso
            </Botao>
          )}
          <Botao variante="secundario" onClick={formEditar.abrir}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Botao>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Cartao>
            <CabecalhoCartao
              titulo="Casos"
              acao={
                <Botao tamanho="p" variante="fantasma" onClick={formCaso.abrir}>
                  <Plus className="size-4" aria-hidden="true" />
                  Novo
                </Botao>
              }
            />
            {casos.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-mudo sm:px-6">Nenhum caso ainda.</p>
            ) : (
              <ul className="divide-y divide-linha px-5 pb-3 sm:px-6">
                {casos.map((caso) => (
                  <li key={caso.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <Link href={`/painel/casos/${caso.id}`} className="text-sm font-medium hover:underline">
                        {caso.titulo}
                      </Link>
                      <p className="truncate text-xs text-mudo">
                        {caso.tipoAcao} · {nomes.usuario(caso.responsavelId)}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Etiqueta>{AREAS[caso.area]}</Etiqueta>
                      <Etiqueta tom={TOM_DA_FASE[caso.fase]}>{FASES[caso.fase]}</Etiqueta>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao className="overflow-hidden">
            <CabecalhoCartao
              titulo="Financeiro"
              acao={
                <Botao tamanho="p" variante="fantasma" onClick={formCobranca.abrir}>
                  <Plus className="size-4" aria-hidden="true" />
                  Cobrança
                </Botao>
              }
            />
            <dl className="grid grid-cols-3 gap-2 px-5 pb-4 text-center sm:px-6">
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
            {lancamentos.length > 0 && (
              <div className="overflow-x-auto border-t border-linha">
                <table className="tabela min-w-[34rem]">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Vencimento</th>
                      <th>Situação</th>
                      <th className="num">Valor</th>
                      <th>
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lancamentos.slice(0, 12).map((l) => (
                      <tr key={l.id}>
                        <td className="max-w-64 truncate">{l.descricao}</td>
                        <td className="whitespace-nowrap text-tinta-2 tabular-nums">{dataCurta(l.vencimento)}</td>
                        <td>
                          <EtiquetaSituacao lancamento={l} />
                        </td>
                        <td className="num font-medium">{brl(l.valor)}</td>
                        <td className="text-right">
                          {!l.pagoEm && (
                            <Botao
                              tamanho="pp"
                              variante="secundario"
                              onClick={() => {
                                marcarPago(l.id);
                                avisar(`Recebimento de ${brl(l.valor)} registrado.`);
                              }}
                            >
                              Recebido
                            </Botao>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Cartao>
        </div>

        <div className="space-y-4">
          <Cartao>
            <CabecalhoCartao titulo="Contato" />
            <ul className="space-y-3 px-5 pb-5 text-sm sm:px-6">
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0 text-sutil" aria-hidden="true" />
                <span className="tabular-nums">{cliente.telefone ? telefone(cliente.telefone) : "Sem telefone"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-sutil" aria-hidden="true" />
                <span className="truncate">{cliente.email || "Sem e-mail"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="size-4 shrink-0 text-sutil" aria-hidden="true" />
                {cliente.cidade || "Sem cidade"}
              </li>
            </ul>
            <dl className="space-y-3 border-t border-linha px-5 py-4 text-sm sm:px-6">
              {cliente.documento && (
                <div>
                  <dt className="text-xs text-mudo">{cliente.tipo === "PJ" ? "CNPJ" : "CPF"}</dt>
                  <dd className="mt-0.5 tabular-nums">{cliente.documento}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-mudo">Responsável</dt>
                <dd className="mt-0.5">{nomes.usuario(cliente.responsavelId)}</dd>
              </div>
              <div>
                <dt className="text-xs text-mudo">Cadastro</dt>
                <dd className="mt-0.5">{dataCurta(cliente.criadoEm)}</dd>
              </div>
              {cliente.observacoes && (
                <div>
                  <dt className="text-xs text-mudo">Observações</dt>
                  <dd className="mt-0.5 leading-relaxed text-tinta-2">{cliente.observacoes}</dd>
                </div>
              )}
            </dl>
          </Cartao>

          {conversa && (
            <Cartao className="p-5 sm:p-6">
              <p className="text-sm font-semibold">Conversa no WhatsApp</p>
              <p className="mt-1 line-clamp-2 text-sm text-mudo">“{conversa.mensagens[conversa.mensagens.length - 1]?.texto}”</p>
              <BotaoLink href={`/painel/atendimento?conversa=${conversa.id}`} variante="secundario" className="mt-4 w-full">
                Abrir no atendimento
              </BotaoLink>
            </Cartao>
          )}

          <button
            type="button"
            onClick={confirmarExclusao.abrir}
            className="inline-flex items-center gap-2 px-1 text-sm text-mudo hover:text-critico"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Excluir este cadastro
          </button>
        </div>
      </div>

      <FormCliente aberto={formEditar.aberto} aoFechar={formEditar.fechar} cliente={cliente} />
      <FormCaso aberto={formCaso.aberto} aoFechar={formCaso.fechar} clienteId={cliente.id} />
      <FormLancamento aberto={formCobranca.aberto} aoFechar={formCobranca.fechar} tipo="receita" clienteId={cliente.id} />

      <Modal aberto={confirmarExclusao.aberto} aoFechar={confirmarExclusao.fechar} titulo="Excluir este cadastro?" largura="sm">
        <p className="text-sm text-tinta-2">
          Todos os casos, prazos, compromissos e lançamentos de <strong>{cliente.nome}</strong> serão apagados. Esta ação não pode ser
          desfeita.
        </p>
        <RodapeModal>
          <Botao variante="fantasma" onClick={confirmarExclusao.fechar}>
            Cancelar
          </Botao>
          <Botao
            variante="perigo"
            onClick={() => {
              removerCliente(cliente.id);
              avisar("Cadastro excluído.", "info");
              router.replace("/painel/clientes");
            }}
          >
            Excluir
          </Botao>
        </RodapeModal>
      </Modal>
    </>
  );
}
