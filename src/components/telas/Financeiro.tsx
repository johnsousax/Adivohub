"use client";

import { Check, CircleCheck, FileSignature, MessageCircle, Plus, Receipt, RotateCcw, Trash2, TriangleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BarrasRanqueadas, CartaoGrafico, GraficoColunas, Indicador, Medidor } from "@/components/graficos/Graficos";
import { FormContrato, FormLancamento } from "@/components/painel/FormulariosFinanceiro";
import { useHoje, useNomes } from "@/components/painel/ganchos";
import { avisar } from "@/components/ui/Avisos";
import { Abas, CabecalhoPagina, Cartao, Etiqueta, Vazio } from "@/components/ui/Basicos";
import { Botao } from "@/components/ui/Botao";
import { useDialogo } from "@/components/ui/Modal";
import { useLoja } from "@/lib/dados/loja";
import { diasDeAtraso, resumoFinanceiro, serieMensal, situacao } from "@/lib/dados/metricas";
import { paraISO } from "@/lib/datas";
import { brl, dataCurta, mesAno, mesCurto, milhares, percentual, plural } from "@/lib/formatos";
import { CATEGORIAS_DESPESA, FORMAS_PAGAMENTO, TIPOS_CONTRATO, type CategoriaDespesa, type Lancamento } from "@/lib/tipos";
import { linkWhatsApp, saudacao } from "@/lib/whatsapp";

export function EtiquetaSituacao({ lancamento }: { lancamento: Lancamento }) {
  const hoje = useHoje();
  const estado = situacao(lancamento, hoje);
  if (estado === "pago") {
    return (
      <Etiqueta tom="ok" icone={Check}>
        {lancamento.tipo === "receita" ? "Recebido" : "Pago"}
      </Etiqueta>
    );
  }
  if (estado === "atrasado") {
    const dias = diasDeAtraso(lancamento, hoje);
    return (
      <Etiqueta tom="critico" icone={TriangleAlert}>
        {plural(dias, "dia de atraso", "dias de atraso")}
      </Etiqueta>
    );
  }
  return <Etiqueta>A vencer</Etiqueta>;
}

type Aba = "receber" | "recebidos" | "despesas" | "contratos";

export function TelaFinanceiro() {
  const hoje = useHoje();
  const nomes = useNomes();
  const lancamentos = useLoja((s) => s.lancamentos);
  const contratos = useLoja((s) => s.contratos);
  const clientes = useLoja((s) => s.clientes);
  const escritorio = useLoja((s) => s.escritorio);
  const marcarPago = useLoja((s) => s.marcarPago);
  const desfazerPagamento = useLoja((s) => s.desfazerPagamento);
  const remover = useLoja((s) => s.removerLancamento);

  const formCobranca = useDialogo();
  const formDespesa = useDialogo();
  const formContrato = useDialogo();
  const [aba, definirAba] = useState<Aba>("receber");

  const resumo = useMemo(() => resumoFinanceiro(lancamentos, hoje), [lancamentos, hoje]);
  const serie = useMemo(() => serieMensal(lancamentos, hoje), [lancamentos, hoje]);
  const hojeISO = paraISO(hoje);

  const aReceber = useMemo(
    () => lancamentos.filter((l) => l.tipo === "receita" && !l.pagoEm).sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    [lancamentos],
  );
  const recebidos = useMemo(
    () => lancamentos.filter((l) => l.tipo === "receita" && l.pagoEm).sort((a, b) => (b.pagoEm ?? "").localeCompare(a.pagoEm ?? "")),
    [lancamentos],
  );
  const despesas = useMemo(
    () => lancamentos.filter((l) => l.tipo === "despesa").sort((a, b) => b.vencimento.localeCompare(a.vencimento)),
    [lancamentos],
  );
  const despesasPorCategoria = useMemo(() => {
    const mes = hojeISO.slice(0, 7);
    const totais = new Map<CategoriaDespesa, number>();
    for (const l of despesas) {
      if (!l.vencimento.startsWith(mes)) continue;
      const categoria = l.categoria ?? "outros";
      totais.set(categoria, (totais.get(categoria) ?? 0) + l.valor);
    }
    return [...totais.entries()].map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
  }, [despesas, hojeISO]);

  const telefoneDoCliente = useMemo(() => new Map(clientes.map((c) => [c.id, c.telefone])), [clientes]);

  function mensagemDeCobranca(l: Lancamento): string {
    const atrasada = l.vencimento < hojeISO;
    return `${saudacao(clientes.find((c) => c.id === l.clienteId))} Aqui é do ${escritorio.nome}. ${
      atrasada
        ? `Notamos que a cobrança "${l.descricao}", de ${brl(l.valor)}, venceu em ${dataCurta(l.vencimento)}.`
        : `Lembrando que a cobrança "${l.descricao}", de ${brl(l.valor)}, vence em ${dataCurta(l.vencimento)}.`
    } Posso enviar os dados para pagamento por aqui?`;
  }

  const botaoExcluir = (l: Lancamento) => (
    <button
      type="button"
      aria-label={`Excluir lançamento: ${l.descricao}`}
      title="Excluir"
      onClick={() => {
        remover(l.id);
        avisar("Lançamento excluído.", "info");
      }}
      className="inline-flex size-8 items-center justify-center rounded-full text-sutil hover:bg-critico-fundo hover:text-critico"
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );

  return (
    <>
      <CabecalhoPagina
        titulo="Financeiro"
        descricao={<span className="first-letter:uppercase">{mesAno(hoje)}</span>}
        acoes={
          <>
            <Botao variante="secundario" onClick={formDespesa.abrir}>
              <Plus className="size-4" aria-hidden="true" />
              Despesa
            </Botao>
            <Botao variante="secundario" onClick={formContrato.abrir}>
              <FileSignature className="size-4" aria-hidden="true" />
              Contrato
            </Botao>
            <Botao onClick={formCobranca.abrir}>
              <Plus className="size-4" aria-hidden="true" />
              Nova cobrança
            </Botao>
          </>
        }
      />

      <section aria-label="Indicadores" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Recebido no mês"
          valor={brl(resumo.recebidoMes, { centavos: false })}
          variacao={resumo.variacaoRecebido}
          comparacao="vs. mesmo período do mês anterior"
        />
        <Indicador
          rotulo="A receber em 30 dias"
          valor={brl(resumo.aReceber30Dias, { centavos: false })}
          apoio={plural(resumo.parcelasAReceber30Dias, "parcela", "parcelas")}
        />
        <Indicador
          rotulo="Em atraso"
          valor={brl(resumo.emAtraso, { centavos: false })}
          apoio={`${plural(resumo.parcelasEmAtraso, "parcela", "parcelas")} · inadimplência de ${percentual(resumo.inadimplencia)}`}
        />
        <Indicador
          destaque
          rotulo="Resultado do mês até agora"
          valor={brl(resumo.resultadoMes, { centavos: false })}
          apoio={`Despesas do mês: ${brl(resumo.despesasMes, { centavos: false })}`}
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <CartaoGrafico
          className="xl:col-span-2"
          titulo="Recebido por mês"
          descricao="Últimos 6 meses · mês atual em destaque"
          tabela={{
            colunas: ["Mês", "Recebido", "Despesas", "Resultado"],
            linhas: serie.map((p) => [mesAno(p.mes), brl(p.recebido), brl(p.despesas), brl(p.recebido - p.despesas)]),
          }}
        >
          <GraficoColunas
            dados={serie.map((p, i) => ({ chave: p.mes, rotulo: mesCurto(p.mes), valor: p.recebido, destaque: i === serie.length - 1 }))}
            formatar={(v) => brl(v)}
            formatarEixo={milhares}
            altura={208}
          />
        </CartaoGrafico>

        <CartaoGrafico
          titulo="Despesas do mês"
          descricao="Por categoria"
          tabela={{
            colunas: ["Categoria", "Valor"],
            linhas: despesasPorCategoria.map((d) => [CATEGORIAS_DESPESA[d.categoria], brl(d.valor)]),
          }}
        >
          {despesasPorCategoria.length ? (
            <BarrasRanqueadas
              itens={despesasPorCategoria.map((d) => ({ chave: d.categoria, rotulo: CATEGORIAS_DESPESA[d.categoria], valor: d.valor }))}
              formatar={(v) => brl(v, { centavos: false })}
            />
          ) : (
            <p className="text-sm text-mudo">Nenhuma despesa lançada neste mês.</p>
          )}
        </CartaoGrafico>
      </div>

      <div className="mt-6 mb-4">
        <Abas
          rotulo="Lançamentos"
          valor={aba}
          aoMudar={definirAba}
          itens={[
            { id: "receber", rotulo: "A receber", contagem: aReceber.length },
            { id: "recebidos", rotulo: "Recebidos" },
            { id: "despesas", rotulo: "Despesas" },
            { id: "contratos", rotulo: "Contratos", contagem: contratos.length },
          ]}
        />
      </div>

      {aba === "receber" && (
        <Cartao className="overflow-hidden">
          {aReceber.length === 0 ? (
            <Vazio icone={CircleCheck} titulo="Nada a receber" descricao="Crie uma cobrança ou um contrato para ver as parcelas aqui." />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela min-w-[52rem]">
                <thead>
                  <tr>
                    <th>Cliente</th>
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
                  {aReceber.map((l) => {
                    const fone = l.clienteId ? telefoneDoCliente.get(l.clienteId) : undefined;
                    return (
                      <tr key={l.id}>
                        <td className="whitespace-nowrap">
                          {l.clienteId ? (
                            <Link href={`/painel/clientes/${l.clienteId}`} className="font-medium hover:underline">
                              {nomes.cliente(l.clienteId)}
                            </Link>
                          ) : (
                            <span className="text-mudo">Avulso</span>
                          )}
                        </td>
                        <td className="max-w-72 truncate text-tinta-2">{l.descricao}</td>
                        <td className="whitespace-nowrap text-tinta-2 tabular-nums">{dataCurta(l.vencimento)}</td>
                        <td>
                          <EtiquetaSituacao lancamento={l} />
                        </td>
                        <td className="num font-medium">{brl(l.valor)}</td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            {fone && (
                              <a
                                href={linkWhatsApp(mensagemDeCobranca(l), fone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-tinta-2 ring-1 ring-linha-forte ring-inset hover:bg-fundo"
                              >
                                <MessageCircle className="size-3.5" aria-hidden="true" />
                                Cobrar
                              </a>
                            )}
                            <Botao
                              tamanho="pp"
                              onClick={() => {
                                marcarPago(l.id);
                                avisar(`Recebimento de ${brl(l.valor)} registrado.`);
                              }}
                            >
                              Recebido
                            </Botao>
                            {botaoExcluir(l)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      )}

      {aba === "recebidos" && (
        <Cartao className="overflow-hidden">
          {recebidos.length === 0 ? (
            <Vazio icone={Wallet} titulo="Nenhum recebimento ainda" />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela min-w-[46rem]">
                <thead>
                  <tr>
                    <th>Recebido em</th>
                    <th>Cliente</th>
                    <th>Descrição</th>
                    <th>Forma</th>
                    <th className="num">Valor</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recebidos.slice(0, 40).map((l) => (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap text-tinta-2 tabular-nums">{dataCurta(l.pagoEm!)}</td>
                      <td className="whitespace-nowrap">
                        {l.clienteId ? nomes.cliente(l.clienteId) : <span className="text-mudo">Avulso</span>}
                      </td>
                      <td className="max-w-80 truncate text-tinta-2">{l.descricao}</td>
                      <td className="text-tinta-2">{l.forma ? FORMAS_PAGAMENTO[l.forma] : "—"}</td>
                      <td className="num font-medium">{brl(l.valor)}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          aria-label={`Desfazer recebimento: ${l.descricao}`}
                          title="Desfazer recebimento"
                          onClick={() => {
                            desfazerPagamento(l.id);
                            avisar("Recebimento desfeito: a cobrança voltou para “A receber”.", "info");
                          }}
                          className="inline-flex size-8 items-center justify-center rounded-full text-sutil hover:bg-fundo hover:text-tinta"
                        >
                          <RotateCcw className="size-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {recebidos.length > 40 && (
            <p className="border-t border-linha px-5 py-3 text-xs text-mudo">
              Mostrando os 40 recebimentos mais recentes de {recebidos.length}.
            </p>
          )}
        </Cartao>
      )}

      {aba === "despesas" && (
        <Cartao className="overflow-hidden">
          {despesas.length === 0 ? (
            <Vazio icone={Receipt} titulo="Nenhuma despesa lançada" />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela min-w-[44rem]">
                <thead>
                  <tr>
                    <th>Vencimento</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Situação</th>
                    <th className="num">Valor</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {despesas.slice(0, 40).map((l) => (
                    <tr key={l.id}>
                      <td className="whitespace-nowrap text-tinta-2 tabular-nums">{dataCurta(l.vencimento)}</td>
                      <td className="max-w-80 truncate">{l.descricao}</td>
                      <td className="text-tinta-2">{CATEGORIAS_DESPESA[l.categoria ?? "outros"]}</td>
                      <td>
                        <EtiquetaSituacao lancamento={l} />
                      </td>
                      <td className="num font-medium">{brl(l.valor)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          {!l.pagoEm && (
                            <Botao
                              tamanho="pp"
                              variante="secundario"
                              onClick={() => {
                                marcarPago(l.id);
                                avisar("Despesa marcada como paga.");
                              }}
                            >
                              Pagar
                            </Botao>
                          )}
                          {botaoExcluir(l)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      )}

      {aba === "contratos" && (
        <Cartao className="overflow-hidden">
          {contratos.length === 0 ? (
            <Vazio icone={FileSignature} titulo="Nenhum contrato cadastrado" />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela min-w-[48rem]">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th className="num">Valor</th>
                    <th className="w-56">Parcelas recebidas</th>
                  </tr>
                </thead>
                <tbody>
                  {contratos.map((contrato) => {
                    const parcelas = lancamentos.filter((l) => l.contratoId === contrato.id);
                    const pagas = parcelas.filter((l) => l.pagoEm).length;
                    return (
                      <tr key={contrato.id}>
                        <td className="whitespace-nowrap">
                          <Link href={`/painel/clientes/${contrato.clienteId}`} className="font-medium hover:underline">
                            {nomes.cliente(contrato.clienteId)}
                          </Link>
                        </td>
                        <td>
                          <Etiqueta tom={contrato.tipo === "exito" || contrato.tipo === "hibrido" ? "ouro" : "neutro"}>
                            {TIPOS_CONTRATO[contrato.tipo]}
                          </Etiqueta>
                        </td>
                        <td className="max-w-72 truncate text-tinta-2">{contrato.descricao}</td>
                        <td className="num">
                          {contrato.valorTotal
                            ? `${brl(contrato.valorTotal, { centavos: false })}${contrato.tipo === "mensal" ? "/mês" : ""}`
                            : ""}
                          {contrato.valorTotal && contrato.percentualExito ? " + " : ""}
                          {contrato.percentualExito ? `${contrato.percentualExito}%` : ""}
                        </td>
                        <td>
                          {parcelas.length ? (
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <Medidor
                                  fracao={pagas / parcelas.length}
                                  rotulo={`Parcelas recebidas de ${nomes.cliente(contrato.clienteId)}`}
                                />
                              </div>
                              <span className="text-xs whitespace-nowrap text-mudo tabular-nums">
                                {pagas} de {parcelas.length}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-mudo">Recebe no êxito</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      )}

      <FormLancamento aberto={formCobranca.aberto} aoFechar={formCobranca.fechar} tipo="receita" />
      <FormLancamento aberto={formDespesa.aberto} aoFechar={formDespesa.fechar} tipo="despesa" />
      <FormContrato aberto={formContrato.aberto} aoFechar={formContrato.fechar} />
    </>
  );
}
