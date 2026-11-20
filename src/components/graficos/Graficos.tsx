"use client";

import { ArrowDownRight, ArrowUpRight, Table2, ChartColumn } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Cartao } from "@/components/ui/Basicos";
import { cn } from "@/lib/cn";

/*
 * Gráficos do painel. Regras seguidas aqui:
 * - uma série = uma cor (dourado); o resto é contexto em cinza;
 * - marcas finas (até 24px), ponta arredondada só no lado do dado;
 * - todo valor também existe fora do tooltip (rótulo direto ou "Ver tabela");
 * - o tooltip aparece no hover e no foco do teclado.
 */

/* ------------------------------- Indicador -------------------------------- */

export function Indicador({
  rotulo,
  valor,
  variacao,
  subirEhBom = true,
  comparacao = "vs. mês anterior",
  apoio,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  /** Fração: 0.12 = +12%. */
  variacao?: number | null;
  subirEhBom?: boolean;
  comparacao?: string;
  apoio?: ReactNode;
  destaque?: boolean;
}) {
  const temVariacao = typeof variacao === "number" && Number.isFinite(variacao);
  const subiu = temVariacao && variacao >= 0;
  const bom = temVariacao && subiu === subirEhBom;
  const Seta = subiu ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-cartao p-5",
        destaque ? "bg-noite-1 text-white" : "bg-white shadow-cartao ring-1 ring-black/[0.04]",
      )}
    >
      <p className={cn("text-sm", destaque ? "text-nevoa" : "text-mudo")}>{rotulo}</p>
      <p className={cn("mt-2 text-[1.75rem] leading-none font-semibold tracking-[-0.035em]", destaque && "texto-ouro")}>{valor}</p>
      <div className={cn("mt-2.5 min-h-5 text-xs", destaque ? "text-nevoa" : "text-mudo")}>
        {temVariacao ? (
          <span className="inline-flex items-center gap-1">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                bom ? "text-ok" : "text-critico",
                destaque && (bom ? "text-[#6ee7a0]" : "text-[#ff8a80]"),
              )}
            >
              <Seta className="size-3.5" aria-hidden="true" />
              {`${subiu ? "+" : "−"}${Math.abs(variacao * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`}
            </span>
            {comparacao}
          </span>
        ) : (
          apoio
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Cartão-gráfico ---------------------------- */

export interface TabelaDeDados {
  colunas: string[];
  linhas: string[][];
}

export function CartaoGrafico({
  titulo,
  descricao,
  tabela,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  /** Os mesmos dados do gráfico, para quem prefere ler em tabela. */
  tabela: TabelaDeDados;
  children: ReactNode;
  className?: string;
}) {
  const [verTabela, definirVerTabela] = useState(false);
  const Icone = verTabela ? ChartColumn : Table2;
  return (
    <Cartao className={cn("flex flex-col", className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <h2 className="text-[0.95rem] font-semibold tracking-[-0.015em]">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-sm text-mudo">{descricao}</p>}
        </div>
        <button
          type="button"
          onClick={() => definirVerTabela((v) => !v)}
          aria-pressed={verTabela}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-mudo transition-colors hover:bg-fundo hover:text-tinta"
        >
          <Icone className="size-3.5" aria-hidden="true" />
          {verTabela ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>
      <div className="flex-1 px-5 pt-4 pb-5 sm:px-6">
        {verTabela ? (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  {tabela.colunas.map((coluna, indice) => (
                    <th key={coluna} className={indice > 0 ? "num" : undefined}>
                      {coluna}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabela.linhas.map((linha) => (
                  <tr key={linha[0]}>
                    {linha.map((celula, indice) => (
                      <td key={indice} className={indice > 0 ? "num" : undefined}>
                        {celula}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </Cartao>
  );
}

/* --------------------------------- Colunas -------------------------------- */

/** Teto "redondo" para o eixo: 1, 2, 3, 4, 5, 6 ou 8 × potência de 10 (a metade também fica redonda). */
export function tetoRedondo(maximo: number): number {
  if (maximo <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const passo of [1, 2, 3, 4, 5, 6, 8, 10]) {
    if (maximo <= passo * potencia) return passo * potencia;
  }
  return 10 * potencia;
}

export interface PontoColuna {
  chave: string;
  rotulo: string;
  valor: number;
  /** A coluna que é o assunto do gráfico (ex.: o mês atual). */
  destaque?: boolean;
}

export function GraficoColunas({
  dados,
  formatar,
  formatarEixo,
  altura = 176,
}: {
  dados: PontoColuna[];
  formatar: (valor: number) => string;
  formatarEixo: (valor: number) => string;
  altura?: number;
}) {
  const [ativa, definirAtiva] = useState<string | null>(null);
  const teto = tetoRedondo(Math.max(...dados.map((d) => d.valor), 0));
  const marcas = [teto, teto / 2, 0];

  return (
    <div className="flex gap-3">
      {/* Eixo Y: carrega os valores que não têm rótulo direto. */}
      <div
        className="flex flex-col justify-between pb-6 text-right text-[0.6875rem] text-sutil tabular-nums"
        style={{ height: altura + 24 }}
        aria-hidden="true"
      >
        {marcas.map((marca) => (
          <span key={marca} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
            {formatarEixo(marca)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: altura }}>
          {[0, 50, 100].map((posicao) => (
            <div key={posicao} className="absolute inset-x-0 border-t border-linha" style={{ top: `${posicao}%` }} aria-hidden="true" />
          ))}
          <div className="absolute inset-0 flex">
            {dados.map((ponto) => {
              const fracao = ponto.valor / teto;
              const emFoco = ativa === ponto.chave;
              return (
                <button
                  key={ponto.chave}
                  type="button"
                  aria-label={`${ponto.rotulo}: ${formatar(ponto.valor)}`}
                  onPointerEnter={() => definirAtiva(ponto.chave)}
                  onPointerLeave={() => definirAtiva(null)}
                  onFocus={() => definirAtiva(ponto.chave)}
                  onBlur={() => definirAtiva(null)}
                  className="group relative flex h-full flex-1 items-end justify-center rounded-md focus-visible:outline-offset-0"
                >
                  <span
                    className={cn(
                      "w-[min(24px,56%)] rounded-t-[4px] transition-[filter,opacity]",
                      ponto.destaque ? "bg-grafico" : "bg-grafico-contexto",
                      emFoco && "brightness-90",
                    )}
                    style={{ height: `${Math.max(fracao * 100, ponto.valor > 0 ? 1.5 : 0)}%` }}
                  />
                  {/* Rótulo direto só na coluna em destaque; some quando o tooltip está aberto. */}
                  {ponto.destaque && !emFoco && (
                    <span
                      className="pointer-events-none absolute text-[0.6875rem] font-semibold whitespace-nowrap text-tinta"
                      style={{ bottom: `calc(${fracao * 100}% + 6px)` }}
                    >
                      {formatarEixo(ponto.valor)}
                    </span>
                  )}
                  {emFoco && (
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute z-10 rounded-lg bg-tinta px-2.5 py-1.5 text-left whitespace-nowrap shadow-flutuante"
                      style={{ bottom: `calc(${Math.min(fracao * 100, 78)}% + 8px)` }}
                    >
                      <span className="block text-xs font-semibold text-white">{formatar(ponto.valor)}</span>
                      <span className="block text-[0.6875rem] text-nevoa capitalize">{ponto.rotulo}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex h-6 items-end" aria-hidden="true">
          {dados.map((ponto) => (
            <span
              key={ponto.chave}
              className={cn("flex-1 text-center text-[0.6875rem] leading-none", ponto.destaque ? "font-semibold text-tinta" : "text-sutil")}
            >
              {ponto.rotulo}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Barras ranqueadas --------------------------- */

export interface ItemBarra {
  chave: string;
  rotulo: string;
  valor: number;
}

/** Partes de um todo comparadas entre si: uma barra por parte, da maior para a menor. */
export function BarrasRanqueadas({ itens, formatar }: { itens: ItemBarra[]; formatar: (valor: number) => string }) {
  const maximo = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <ul className="space-y-3.5">
      {itens.map((item) => (
        <li key={item.chave}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-tinta-2">{item.rotulo}</span>
            <span className="font-medium tabular-nums">{formatar(item.valor)}</span>
          </div>
          <div
            className="h-2 rounded-r-[4px] bg-grafico"
            style={{ width: `${Math.max((item.valor / maximo) * 100, 1.5)}%` }}
            role="presentation"
          />
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------- Medidor -------------------------------- */

export function Medidor({ fracao, tom = "ouro", rotulo }: { fracao: number; tom?: "ouro" | "critico" | "ok"; rotulo: string }) {
  const limitada = Math.min(Math.max(fracao, 0), 1);
  const cores = {
    ouro: ["bg-ouro-100", "bg-ouro-500"],
    critico: ["bg-critico-fundo", "bg-critico"],
    ok: ["bg-ok-fundo", "bg-ok"],
  }[tom];
  return (
    <div
      role="meter"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(limitada * 100)}
      className={cn("h-2 overflow-hidden rounded-full", cores[0])}
    >
      <div className={cn("h-full rounded-full", cores[1])} style={{ width: `${limitada * 100}%` }} />
    </div>
  );
}
