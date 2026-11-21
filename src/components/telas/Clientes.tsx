"use client";

import { ArrowRight, Building2, Handshake, Plus, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FormCliente } from "@/components/painel/FormulariosCadastro";
import { useHoje, useNomes } from "@/components/painel/ganchos";
import { Avatar, CabecalhoPagina, Cartao, Etiqueta, Vazio } from "@/components/ui/Basicos";
import { Botao } from "@/components/ui/Botao";
import { Busca } from "@/components/ui/Campos";
import { useDialogo } from "@/components/ui/Modal";
import { useLoja } from "@/lib/dados/loja";
import { paraISO } from "@/lib/datas";
import { brl, plural, telefone } from "@/lib/formatos";

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
  const [termo, definirTermo] = useState("");

  // Contatos em negociação e perdidos ficam no CRM; aqui só quem já contratou.
  const ativos = useMemo(() => clientes.filter((c) => c.status === "ativo" || c.status === "inativo"), [clientes]);
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

  return (
    <>
      <CabecalhoPagina
        titulo="Clientes"
        descricao={`${plural(ativos.length, "cliente", "clientes")} · ${plural(leads.length, "contato em negociação", "contatos em negociação")} no CRM`}
        acoes={
          <Botao onClick={form.abrir}>
            <Plus className="size-4" aria-hidden="true" />
            Novo cliente
          </Botao>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href="/painel/crm"
          className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm text-tinta-2 ring-1 ring-linha-forte hover:bg-fundo"
        >
          <Handshake className="size-4 text-ouro-600" aria-hidden="true" />
          Funil de captação e retornos no CRM
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
        <Busca
          value={termo}
          onChange={(e) => definirTermo(e.target.value)}
          placeholder="Buscar cliente"
          aria-label="Buscar clientes"
          className="ml-auto w-full sm:w-64"
        />
      </div>

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

      <FormCliente aberto={form.aberto} aoFechar={form.fechar} />
    </>
  );
}
