"use client";

import { ArrowRight, Building2, CircleCheck, MessageCircle, Plus, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FormCliente } from "@/components/painel/FormulariosCadastro";
import { useHoje, useNomes } from "@/components/painel/ganchos";
import { Quadro } from "@/components/painel/Quadro";
import { avisar } from "@/components/ui/Avisos";
import { Abas, Avatar, CabecalhoPagina, Cartao, Etiqueta, Vazio } from "@/components/ui/Basicos";
import { Botao } from "@/components/ui/Botao";
import { Busca } from "@/components/ui/Campos";
import { useDialogo } from "@/components/ui/Modal";
import { useLoja } from "@/lib/dados/loja";
import { paraISO } from "@/lib/datas";
import { brl, plural, telefone } from "@/lib/formatos";
import { AREAS, ETAPAS_FUNIL, ORDEM_FUNIL, ORIGENS, type EtapaFunil } from "@/lib/tipos";
import { linkWhatsApp } from "@/lib/whatsapp";

function semAcento(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function TelaClientes() {
  const hoje = useHoje();
  const nomes = useNomes();
  const form = useDialogo();
  const clientes = useLoja((s) => s.clientes);
  const casos = useLoja((s) => s.casos);
  const lancamentos = useLoja((s) => s.lancamentos);
  const moverLead = useLoja((s) => s.moverLead);
  const converterLead = useLoja((s) => s.converterLead);

  const [aba, definirAba] = useState<"clientes" | "funil">("clientes");
  const [termo, definirTermo] = useState("");

  const ativos = useMemo(() => clientes.filter((c) => c.status !== "lead"), [clientes]);
  const leads = useMemo(() => clientes.filter((c) => c.status === "lead"), [clientes]);

  const resumoPorCliente = useMemo(() => {
    const hojeISO = paraISO(hoje);
    const mapa = new Map<string, { casos: number; emAberto: number; emAtraso: number }>();
    const obter = (id: string) => {
      let item = mapa.get(id);
      if (!item) {
        item = { casos: 0, emAberto: 0, emAtraso: 0 };
        mapa.set(id, item);
      }
      return item;
    };
    for (const caso of casos) if (caso.fase !== "encerrado") obter(caso.clienteId).casos += 1;
    for (const l of lancamentos) {
      if (l.tipo !== "receita" || l.pagoEm || !l.clienteId) continue;
      const item = obter(l.clienteId);
      item.emAberto += l.valor;
      if (l.vencimento < hojeISO) item.emAtraso += l.valor;
    }
    return mapa;
  }, [casos, lancamentos, hoje]);

  const filtrados = useMemo(() => {
    const busca = semAcento(termo.trim());
    if (!busca) return ativos;
    return ativos.filter((c) => semAcento(`${c.nome} ${c.email} ${c.cidade} ${c.documento}`).includes(busca));
  }, [ativos, termo]);

  function mover(id: string, etapa: EtapaFunil) {
    const lead = leads.find((c) => c.id === id);
    if (!lead || lead.etapaFunil === etapa) return;
    moverLead(id, etapa);
    avisar(`${lead.nome}: ${ETAPAS_FUNIL[etapa]}.`);
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        descricao={`${plural(ativos.length, "cliente", "clientes")} · ${plural(leads.length, "contato no funil", "contatos no funil")}`}
        acoes={
          <Botao onClick={form.abrir}>
            <Plus className="size-4" aria-hidden="true" />
            {aba === "funil" ? "Novo contato" : "Novo cliente"}
          </Botao>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Abas
          rotulo="Seção"
          valor={aba}
          aoMudar={definirAba}
          itens={[
            { id: "clientes", rotulo: "Clientes", contagem: ativos.length },
            { id: "funil", rotulo: "Funil de captação", contagem: leads.length },
          ]}
        />
        {aba === "clientes" && (
          <Busca
            value={termo}
            onChange={(e) => definirTermo(e.target.value)}
            placeholder="Buscar cliente"
            aria-label="Buscar clientes"
            className="ml-auto w-full sm:w-64"
          />
        )}
      </div>

      {aba === "clientes" ? (
        <Cartao className="overflow-hidden">
          {filtrados.length === 0 ? (
            <Vazio icone={Users} titulo="Nenhum cliente encontrado" descricao="Ajuste a busca ou cadastre um cliente novo." />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela min-w-[46rem]">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contato</th>
                    <th>Cidade</th>
                    <th className="num">Casos ativos</th>
                    <th className="num">Em aberto</th>
                    <th>Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((cliente) => {
                    const resumo = resumoPorCliente.get(cliente.id);
                    return (
                      <tr key={cliente.id}>
                        <td>
                          <Link href={`/painel/clientes/${cliente.id}`} className="flex items-center gap-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-fundo text-mudo ring-1 ring-linha">
                              {cliente.tipo === "PJ" ? (
                                <Building2 className="size-4" aria-hidden="true" />
                              ) : (
                                <UserRound className="size-4" aria-hidden="true" />
                              )}
                            </span>
                            <span>
                              <span className="block font-medium hover:underline">{cliente.nome}</span>
                              <span className="block text-xs text-mudo">{cliente.tipo === "PJ" ? "Pessoa jurídica" : "Pessoa física"}</span>
                            </span>
                          </Link>
                        </td>
                        <td>
                          <span className="block whitespace-nowrap text-tinta-2 tabular-nums">
                            {cliente.telefone ? telefone(cliente.telefone) : "—"}
                          </span>
                          <span className="block max-w-48 truncate text-xs text-mudo">{cliente.email}</span>
                        </td>
                        <td className="whitespace-nowrap text-tinta-2">{cliente.cidade}</td>
                        <td className="num">{resumo?.casos ?? 0}</td>
                        <td className="num">
                          {resumo?.emAberto ? brl(resumo.emAberto, { centavos: false }) : "—"}
                          {resumo?.emAtraso ? (
                            <Etiqueta tom="critico" className="ml-2">
                              atraso
                            </Etiqueta>
                          ) : null}
                        </td>
                        <td>
                          <span className="flex items-center gap-2 whitespace-nowrap text-tinta-2">
                            <Avatar nome={nomes.usuario(cliente.responsavelId)} tamanho="p" />
                            {nomes.usuario(cliente.responsavelId)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      ) : (
        <Quadro
          colunas={ORDEM_FUNIL.map((etapa) => ({ id: etapa, titulo: ETAPAS_FUNIL[etapa] }))}
          itens={leads}
          colunaDe={(lead) => lead.etapaFunil ?? "novo"}
          aoMover={mover}
          vazio="Nenhum contato nesta etapa."
          renderizar={(lead) => {
            const indice = ORDEM_FUNIL.indexOf(lead.etapaFunil ?? "novo");
            const proxima = ORDEM_FUNIL[indice + 1];
            return (
              <div>
                <Link href={`/painel/clientes/${lead.id}`} className="block text-sm font-semibold hover:underline">
                  {lead.nome}
                </Link>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {lead.areaInteresse && <Etiqueta>{AREAS[lead.areaInteresse]}</Etiqueta>}
                  <Etiqueta>{ORIGENS[lead.origem]}</Etiqueta>
                </div>
                {lead.observacoes && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-mudo">{lead.observacoes}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {proxima ? (
                    <Botao tamanho="pp" variante="secundario" onClick={() => mover(lead.id, proxima)}>
                      Avançar
                      <ArrowRight className="size-3" aria-hidden="true" />
                    </Botao>
                  ) : (
                    <Botao
                      tamanho="pp"
                      onClick={() => {
                        converterLead(lead.id);
                        avisar(`${lead.nome} agora é cliente.`);
                      }}
                    >
                      <CircleCheck className="size-3" aria-hidden="true" />
                      Virou cliente
                    </Botao>
                  )}
                  {lead.telefone && (
                    <a
                      href={linkWhatsApp(undefined, lead.telefone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Conversar com ${lead.nome} no WhatsApp`}
                      title="Abrir WhatsApp"
                      className="flex size-7 items-center justify-center rounded-full text-mudo hover:bg-fundo hover:text-tinta"
                    >
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                  <Avatar nome={nomes.usuario(lead.responsavelId)} tamanho="p" className="ml-auto" />
                </div>
              </div>
            );
          }}
        />
      )}

      <FormCliente aberto={form.aberto} aoFechar={form.fechar} comoLead={aba === "funil"} />
    </>
  );
}
