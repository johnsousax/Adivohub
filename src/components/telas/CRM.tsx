"use client";

import {
  ArrowRight,
  CalendarClock,
  CircleCheck,
  Flame,
  MessageCircle,
  MessageSquarePlus,
  Plus,
  RotateCcw,
  Snowflake,
  Target,
  Thermometer,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { BarrasRanqueadas, Indicador } from "@/components/graficos/Graficos";
import { FormCliente } from "@/components/painel/FormulariosCadastro";
import { ModalInteracao, ModalPerda } from "@/components/painel/FormulariosCRM";
import { useHoje, useNomes } from "@/components/painel/ganchos";
import { Quadro } from "@/components/painel/Quadro";
import { avisar } from "@/components/ui/Avisos";
import { Abas, Avatar, CabecalhoCartao, CabecalhoPagina, Cartao, Etiqueta, Vazio } from "@/components/ui/Basicos";
import { Botao } from "@/components/ui/Botao";
import { Busca, Filtro } from "@/components/ui/Campos";
import { useDialogo } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import {
  contatosAbertos,
  desempenhoPorOrigem,
  diasNaEtapa,
  funilComValores,
  grupoDoRetorno,
  GRUPOS_RETORNO,
  motivosDePerda,
  resumoCRM,
  retornos,
  semProximoPasso,
  type GrupoRetorno,
} from "@/lib/dados/crm";
import { useLoja } from "@/lib/dados/loja";
import { brl, dataCurta, dataDiaMes, percentual, plural } from "@/lib/formatos";
import {
  AREAS,
  ETAPAS_FUNIL,
  MOTIVOS_PERDA,
  ORDEM_FUNIL,
  ORIGENS,
  TEMPERATURAS,
  type Cliente,
  type EtapaFunil,
  type Temperatura,
} from "@/lib/tipos";
import { linkWhatsApp } from "@/lib/whatsapp";

type Aba = "funil" | "retornos" | "indicadores" | "perdidos";

const ICONE_TEMPERATURA = { quente: Flame, morno: Thermometer, frio: Snowflake } as const;
const TOM_TEMPERATURA = { quente: "alerta", morno: "neutro", frio: "info" } as const;

function semAcento(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function EtiquetaTemperatura({ temperatura }: { temperatura?: Temperatura }) {
  if (!temperatura) return null;
  return (
    <Etiqueta tom={TOM_TEMPERATURA[temperatura]} icone={ICONE_TEMPERATURA[temperatura]}>
      {TEMPERATURAS[temperatura]}
    </Etiqueta>
  );
}

/** Data do próximo passo com o destaque certo: atrasado, hoje ou futuro. */
export function DataDoPasso({ data, hoje }: { data: string; hoje: Date }) {
  const grupo = grupoDoRetorno(data, hoje);
  if (grupo === "atrasados") return <Etiqueta tom="critico">Atrasado · {dataDiaMes(data)}</Etiqueta>;
  if (grupo === "hoje") return <Etiqueta tom="ouro">Hoje</Etiqueta>;
  return <span className="text-xs text-mudo tabular-nums">{dataDiaMes(data)}</span>;
}

export function TelaCRM() {
  const hoje = useHoje();
  const nomes = useNomes();
  const clientes = useLoja((s) => s.clientes);
  const moverLead = useLoja((s) => s.moverLead);
  const converterLead = useLoja((s) => s.converterLead);
  const reabrirContato = useLoja((s) => s.reabrirContato);
  const usuarios = useLoja((s) => s.usuarios);

  const formNovo = useDialogo();
  const parametros = useSearchParams();
  const [aba, definirAba] = useState<Aba>(() => {
    const pedida = parametros.get("aba");
    return pedida === "retornos" || pedida === "indicadores" || pedida === "perdidos" ? pedida : "funil";
  });
  const [responsavel, definirResponsavel] = useState("todos");
  const [termo, definirTermo] = useState("");
  const [janela, definirJanela] = useState<{ tipo: "interacao" | "perda"; contato: Cliente; resumo?: string } | null>(null);

  const filtrar = useMemo(() => {
    const busca = semAcento(termo.trim());
    return (lista: Cliente[]) =>
      lista.filter(
        (c) =>
          (responsavel === "todos" || c.responsavelId === responsavel) &&
          (!busca || semAcento(`${c.nome} ${c.observacoes ?? ""} ${c.telefone}`).includes(busca)),
      );
  }, [responsavel, termo]);

  const abertos = useMemo(() => filtrar(contatosAbertos(clientes)), [clientes, filtrar]);
  const resumo = useMemo(() => resumoCRM(filtrar(clientes), hoje), [clientes, filtrar, hoje]);
  const valoresPorEtapa = useMemo(() => new Map(funilComValores(abertos).map((e) => [e.etapa, e])), [abertos]);
  const listaRetornos = useMemo(() => retornos(abertos), [abertos]);
  const semPasso = useMemo(() => semProximoPasso(abertos), [abertos]);
  const perdidos = useMemo(
    () => filtrar(clientes.filter((c) => c.status === "perdido")).sort((a, b) => (b.perdidoEm ?? "").localeCompare(a.perdidoEm ?? "")),
    [clientes, filtrar],
  );

  function mover(id: string, etapa: EtapaFunil) {
    const contato = abertos.find((c) => c.id === id);
    if (!contato || contato.etapaFunil === etapa) return;
    moverLead(id, etapa);
    avisar(`${contato.nome}: ${ETAPAS_FUNIL[etapa]}.`);
  }

  function fechar(contato: Cliente) {
    converterLead(contato.id);
    avisar(`${contato.nome} agora é cliente.`);
  }

  const abrirInteracao = (contato: Cliente, resumoInicial?: string) => definirJanela({ tipo: "interacao", contato, resumo: resumoInicial });
  const abrirPerda = (contato: Cliente) => definirJanela({ tipo: "perda", contato });

  const atrasadosEHoje = resumo.retornosAtrasados + resumo.retornosHoje;

  return (
    <>
      <CabecalhoPagina
        titulo="CRM"
        descricao="Do primeiro contato ao contrato assinado: funil, retornos e conversão do escritório."
        acoes={
          <Botao onClick={formNovo.abrir}>
            <Plus className="size-4" aria-hidden="true" />
            Novo contato
          </Botao>
        }
      />

      <section aria-label="Indicadores do CRM" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          destaque
          rotulo="Em negociação"
          valor={brl(resumo.emNegociacao, { centavos: false })}
          apoio={`${plural(resumo.emAberto, "contato", "contatos")} no funil · ${plural(resumo.quentes, "quente", "quentes")}`}
        />
        <Indicador
          rotulo="Taxa de conversão"
          valor={resumo.taxaConversao === null ? "—" : percentual(resumo.taxaConversao, 0)}
          apoio={`Últimos 90 dias · ${plural(resumo.ganhos, "fechado", "fechados")}, ${plural(resumo.perdidos, "perdido", "perdidos")}`}
        />
        <Indicador
          rotulo="Retornos para hoje"
          valor={String(resumo.retornosHoje)}
          apoio={
            resumo.retornosAtrasados > 0 ? (
              <span className="font-medium text-critico">{plural(resumo.retornosAtrasados, "retorno atrasado", "retornos atrasados")}</span>
            ) : (
              "Nenhum retorno atrasado"
            )
          }
        />
        <Indicador
          rotulo="Ciclo de fechamento"
          valor={resumo.cicloMedioDias === null ? "—" : plural(resumo.cicloMedioDias, "dia", "dias")}
          apoio="Em média, do primeiro contato ao contrato"
        />
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Abas
          rotulo="Seção do CRM"
          valor={aba}
          aoMudar={definirAba}
          itens={[
            { id: "funil", rotulo: "Funil", contagem: abertos.length },
            { id: "retornos", rotulo: "Retornos", contagem: atrasadosEHoje },
            { id: "indicadores", rotulo: "Indicadores" },
            { id: "perdidos", rotulo: "Perdidos", contagem: perdidos.length },
          ]}
        />
        <div className="ml-auto flex w-full flex-wrap gap-2 sm:w-auto">
          <Filtro
            rotulo="Responsável"
            value={responsavel}
            onChange={(e) => definirResponsavel(e.target.value)}
            className="flex-1 sm:flex-none"
          >
            <option value="todos">Toda a equipe</option>
            {usuarios
              .filter((u) => u.papel !== "financeiro")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
          </Filtro>
          <Busca
            value={termo}
            onChange={(e) => definirTermo(e.target.value)}
            placeholder="Buscar contato"
            aria-label="Buscar contatos"
            className="w-full sm:w-56"
          />
        </div>
      </div>

      {aba === "funil" && (
        <Quadro
          colunas={ORDEM_FUNIL.map((etapa) => {
            const valor = valoresPorEtapa.get(etapa)?.valor ?? 0;
            return { id: etapa, titulo: ETAPAS_FUNIL[etapa], subtitulo: valor > 0 ? brl(valor, { centavos: false }) : undefined };
          })}
          itens={abertos}
          colunaDe={(contato) => contato.etapaFunil ?? "novo"}
          aoMover={mover}
          vazio="Nenhum contato nesta etapa."
          renderizar={(contato) => (
            <CartaoContato
              contato={contato}
              hoje={hoje}
              nomeResponsavel={nomes.usuario(contato.responsavelId)}
              aoAvancar={(etapa) => mover(contato.id, etapa)}
              aoFechar={() => fechar(contato)}
              aoRegistrar={() => abrirInteracao(contato)}
              aoPerder={() => abrirPerda(contato)}
            />
          )}
        />
      )}

      {aba === "retornos" && (
        <div className="space-y-4">
          {listaRetornos.length === 0 && semPasso.length === 0 ? (
            <Cartao>
              <Vazio icone={CalendarClock} titulo="Nenhum retorno combinado" descricao="Registre um contato e combine o próximo passo." />
            </Cartao>
          ) : (
            (Object.keys(GRUPOS_RETORNO) as GrupoRetorno[]).map((grupo) => {
              const doGrupo = listaRetornos.filter((c) => grupoDoRetorno(c.proximoPasso!.data, hoje) === grupo);
              if (doGrupo.length === 0) return null;
              return (
                <Cartao key={grupo}>
                  <CabecalhoCartao
                    titulo={GRUPOS_RETORNO[grupo]}
                    acao={
                      <span className={cn("text-sm tabular-nums", grupo === "atrasados" ? "font-semibold text-critico" : "text-mudo")}>
                        {doGrupo.length}
                      </span>
                    }
                  />
                  <ul className="divide-y divide-linha px-5 pb-2 sm:px-6">
                    {doGrupo.map((contato) => (
                      <LinhaRetorno
                        key={contato.id}
                        contato={contato}
                        hoje={hoje}
                        nomeResponsavel={nomes.usuario(contato.responsavelId)}
                        aoConcluir={() => abrirInteracao(contato, `Feito: ${contato.proximoPasso!.descricao}.`)}
                      />
                    ))}
                  </ul>
                </Cartao>
              );
            })
          )}
          {semPasso.length > 0 && (
            <Cartao>
              <CabecalhoCartao titulo="Sem próximo passo" descricao="Contatos sem retorno combinado costumam esfriar." />
              <ul className="divide-y divide-linha px-5 pb-2 sm:px-6">
                {semPasso.map((contato) => (
                  <li key={contato.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/painel/clientes/${contato.id}`} className="text-sm font-medium hover:underline">
                        {contato.nome}
                      </Link>
                      <p className="text-xs text-mudo">
                        {ETAPAS_FUNIL[contato.etapaFunil ?? "novo"]} · há {plural(diasNaEtapa(contato, hoje), "dia", "dias")} nesta etapa
                      </p>
                    </div>
                    <Botao tamanho="pp" variante="secundario" onClick={() => abrirInteracao(contato)}>
                      Combinar próximo passo
                    </Botao>
                  </li>
                ))}
              </ul>
            </Cartao>
          )}
        </div>
      )}

      {aba === "indicadores" && <Indicadores clientes={filtrar(clientes)} hoje={hoje} />}

      {aba === "perdidos" && (
        <Cartao className="overflow-hidden">
          {perdidos.length === 0 ? (
            <Vazio
              icone={Target}
              titulo="Nenhum contato perdido"
              descricao="Quando um contato não fechar, marque o motivo: ele aparece aqui e nos indicadores."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela min-w-[46rem]">
                <thead>
                  <tr>
                    <th>Contato</th>
                    <th>Motivo</th>
                    <th>Parou em</th>
                    <th className="num">Estimado</th>
                    <th>Quando</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {perdidos.map((contato) => (
                    <tr key={contato.id}>
                      <td>
                        <Link href={`/painel/clientes/${contato.id}`} className="font-medium hover:underline">
                          {contato.nome}
                        </Link>
                        <span className="block text-xs text-mudo">{ORIGENS[contato.origem]}</span>
                      </td>
                      <td className="text-tinta-2">{MOTIVOS_PERDA[contato.motivoPerda ?? "outro"]}</td>
                      <td className="whitespace-nowrap text-tinta-2">{ETAPAS_FUNIL[contato.etapaFunil ?? "novo"]}</td>
                      <td className="num">{contato.valorEstimado ? brl(contato.valorEstimado, { centavos: false }) : "—"}</td>
                      <td className="whitespace-nowrap text-tinta-2 tabular-nums">
                        {contato.perdidoEm ? dataCurta(contato.perdidoEm) : "—"}
                      </td>
                      <td className="text-right">
                        <Botao
                          tamanho="pp"
                          variante="secundario"
                          onClick={() => {
                            reabrirContato(contato.id);
                            avisar(`${contato.nome} voltou para o funil.`);
                          }}
                        >
                          <RotateCcw className="size-3" aria-hidden="true" />
                          Reabrir
                        </Botao>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      )}

      <FormCliente aberto={formNovo.aberto} aoFechar={formNovo.fechar} comoLead />
      {janela?.tipo === "interacao" && (
        <ModalInteracao aberto aoFechar={() => definirJanela(null)} contato={janela.contato} resumoInicial={janela.resumo} />
      )}
      {janela?.tipo === "perda" && <ModalPerda aberto aoFechar={() => definirJanela(null)} contato={janela.contato} />}
    </>
  );
}

/* --------------------------------- Funil ---------------------------------- */

function CartaoContato({
  contato,
  hoje,
  nomeResponsavel,
  aoAvancar,
  aoFechar,
  aoRegistrar,
  aoPerder,
}: {
  contato: Cliente;
  hoje: Date;
  nomeResponsavel: string;
  aoAvancar: (etapa: EtapaFunil) => void;
  aoFechar: () => void;
  aoRegistrar: () => void;
  aoPerder: () => void;
}) {
  const indice = ORDEM_FUNIL.indexOf(contato.etapaFunil ?? "novo");
  const proxima = ORDEM_FUNIL[indice + 1];
  const dias = diasNaEtapa(contato, hoje);
  const botaoIcone = "flex size-7 items-center justify-center rounded-full text-mudo hover:bg-fundo hover:text-tinta";

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/painel/clientes/${contato.id}`} className="text-sm leading-snug font-semibold hover:underline">
          {contato.nome}
        </Link>
        {contato.valorEstimado ? (
          <span className="shrink-0 text-xs font-semibold text-tinta tabular-nums">{brl(contato.valorEstimado, { centavos: false })}</span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <EtiquetaTemperatura temperatura={contato.temperatura} />
        {contato.areaInteresse && <Etiqueta>{AREAS[contato.areaInteresse]}</Etiqueta>}
        <Etiqueta>{ORIGENS[contato.origem]}</Etiqueta>
      </div>

      {contato.proximoPasso ? (
        <div className="mt-3 rounded-xl bg-fundo px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.6875rem] font-medium tracking-wide text-mudo uppercase">Próximo passo</span>
            <DataDoPasso data={contato.proximoPasso.data} hoje={hoje} />
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-tinta-2">{contato.proximoPasso.descricao}</p>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-alerta-fundo px-3 py-2 text-xs text-alerta">Sem próximo passo combinado</p>
      )}

      <p className="mt-2 text-[0.6875rem] text-sutil">
        {dias === 0 ? "Entrou nesta etapa hoje" : `Há ${plural(dias, "dia", "dias")} nesta etapa`}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        {proxima ? (
          <Botao tamanho="pp" variante="secundario" onClick={() => aoAvancar(proxima)}>
            Avançar
            <ArrowRight className="size-3" aria-hidden="true" />
          </Botao>
        ) : (
          <Botao tamanho="pp" onClick={aoFechar}>
            <CircleCheck className="size-3" aria-hidden="true" />
            Virou cliente
          </Botao>
        )}
        <button
          type="button"
          onClick={aoRegistrar}
          className={botaoIcone}
          aria-label={`Registrar contato com ${contato.nome}`}
          title="Registrar contato"
        >
          <MessageSquarePlus className="size-3.5" aria-hidden="true" />
        </button>
        {contato.telefone && (
          <a
            href={linkWhatsApp(undefined, contato.telefone)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Conversar com ${contato.nome} no WhatsApp`}
            title="Abrir WhatsApp"
            className={botaoIcone}
          >
            <MessageCircle className="size-3.5" aria-hidden="true" />
          </a>
        )}
        <button
          type="button"
          onClick={aoPerder}
          className={botaoIcone}
          aria-label={`Marcar ${contato.nome} como perdido`}
          title="Marcar como perdido"
        >
          <UserX className="size-3.5" aria-hidden="true" />
        </button>
        <Avatar nome={nomeResponsavel} tamanho="p" className="ml-auto" />
      </div>
    </div>
  );
}

/* -------------------------------- Retornos -------------------------------- */

function LinhaRetorno({
  contato,
  hoje,
  nomeResponsavel,
  aoConcluir,
}: {
  contato: Cliente;
  hoje: Date;
  nomeResponsavel: string;
  aoConcluir: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/painel/clientes/${contato.id}`} className="text-sm font-medium hover:underline">
            {contato.nome}
          </Link>
          <Etiqueta>{ETAPAS_FUNIL[contato.etapaFunil ?? "novo"]}</Etiqueta>
          <EtiquetaTemperatura temperatura={contato.temperatura} />
        </div>
        <p className="mt-1 text-sm text-tinta-2">{contato.proximoPasso!.descricao}</p>
      </div>
      <div className="flex items-center gap-2">
        <DataDoPasso data={contato.proximoPasso!.data} hoje={hoje} />
        <Avatar nome={nomeResponsavel} tamanho="p" />
        {contato.telefone && (
          <a
            href={linkWhatsApp(undefined, contato.telefone)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Conversar com ${contato.nome} no WhatsApp`}
            title="Abrir WhatsApp"
            className="flex size-8 items-center justify-center rounded-full text-mudo hover:bg-fundo hover:text-tinta"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
          </a>
        )}
        <Botao tamanho="pp" onClick={aoConcluir}>
          <CircleCheck className="size-3" aria-hidden="true" />
          Feito
        </Botao>
      </div>
    </li>
  );
}

/* ------------------------------- Indicadores ------------------------------ */

function Indicadores({ clientes, hoje }: { clientes: Cliente[]; hoje: Date }) {
  const funil = useMemo(() => funilComValores(clientes), [clientes]);
  const origens = useMemo(() => desempenhoPorOrigem(clientes, hoje), [clientes, hoje]);
  const motivos = useMemo(() => motivosDePerda(clientes, hoje), [clientes, hoje]);
  const maiorEtapa = Math.max(...funil.map((e) => e.quantidade), 1);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Cartao>
        <CabecalhoCartao titulo="Funil por etapa" descricao="Contatos em aberto e honorários estimados" />
        <ul className="space-y-4 px-5 pb-5 sm:px-6">
          {funil.map((etapa) => (
            <li key={etapa.etapa}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="text-tinta-2">{ETAPAS_FUNIL[etapa.etapa]}</span>
                <span className="tabular-nums">
                  <span className="font-medium">{etapa.quantidade}</span>
                  <span className="text-mudo"> · {brl(etapa.valor, { centavos: false })}</span>
                </span>
              </div>
              <div
                className="h-2 rounded-r-[4px] bg-grafico"
                style={{ width: `${Math.max((etapa.quantidade / maiorEtapa) * 100, 1.5)}%` }}
                role="presentation"
              />
            </li>
          ))}
        </ul>
      </Cartao>

      <Cartao>
        <CabecalhoCartao titulo="Por que não fecharam" descricao="Contatos perdidos nos últimos 6 meses" />
        <div className="px-5 pb-5 sm:px-6">
          {motivos.length === 0 ? (
            <p className="text-sm text-mudo">Nenhum contato perdido no período.</p>
          ) : (
            <BarrasRanqueadas
              itens={motivos.map((m) => ({ chave: m.motivo, rotulo: MOTIVOS_PERDA[m.motivo], valor: m.quantidade }))}
              formatar={(valor) => plural(valor, "contato", "contatos")}
            />
          )}
        </div>
      </Cartao>

      <Cartao className="overflow-hidden lg:col-span-2">
        <CabecalhoCartao titulo="De onde vêm os contatos" descricao="Quem chegou nos últimos 6 meses e quantos viraram cliente" />
        {origens.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-mudo sm:px-6">Nenhum contato no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela min-w-[32rem]">
              <thead>
                <tr>
                  <th>Origem</th>
                  <th className="num">Contatos</th>
                  <th className="num">Viraram cliente</th>
                  <th className="num">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {origens.map((linha) => (
                  <tr key={linha.origem}>
                    <td className="font-medium">{ORIGENS[linha.origem]}</td>
                    <td className="num">{linha.contatos}</td>
                    <td className="num">{linha.ganhos}</td>
                    <td className="num">{linha.conversao === null ? "—" : percentual(linha.conversao, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-5 pt-3 pb-5 text-xs text-mudo sm:px-6">A conversão considera só quem já teve desfecho (fechou ou foi perdido).</p>
      </Cartao>
    </div>
  );
}
