"use client";

import { Plus, Scale } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FormCaso } from "@/components/painel/FormulariosCadastro";
import { useNomes } from "@/components/painel/ganchos";
import { EtiquetaPrazo } from "@/components/painel/Pecas";
import { Quadro } from "@/components/painel/Quadro";
import { avisar } from "@/components/ui/Avisos";
import { Abas, Avatar, CabecalhoPagina, Cartao, Etiqueta, Vazio, type Tom } from "@/components/ui/Basicos";
import { Botao } from "@/components/ui/Botao";
import { Busca, Filtro } from "@/components/ui/Campos";
import { useDialogo } from "@/components/ui/Modal";
import { useLoja } from "@/lib/dados/loja";
import { prazosAbertos } from "@/lib/dados/metricas";
import { brl, plural } from "@/lib/formatos";
import { AREAS, FASES, ORDEM_FASES, type AreaDireito, type Caso, type FaseCaso } from "@/lib/tipos";

export const TOM_DA_FASE: Record<FaseCaso, Tom> = {
  inicial: "neutro",
  instrucao: "info",
  sentenca: "alerta",
  recurso: "ouro",
  execucao: "ok",
  encerrado: "neutro",
};

function semAcento(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function TelaCasos() {
  const nomes = useNomes();
  const form = useDialogo();
  const casos = useLoja((s) => s.casos);
  const usuarios = useLoja((s) => s.usuarios);
  const prazos = useLoja((s) => s.prazos);
  const atualizarCaso = useLoja((s) => s.atualizarCaso);

  const [visao, definirVisao] = useState<"lista" | "quadro">("lista");
  const [termo, definirTermo] = useState("");
  const [area, definirArea] = useState<AreaDireito | "">("");
  const [responsavel, definirResponsavel] = useState("");
  const [mostrarEncerrados, definirMostrarEncerrados] = useState(false);

  const proximoPrazo = useMemo(() => {
    const mapa = new Map<string, (typeof prazos)[number]>();
    for (const prazo of prazosAbertos(prazos)) if (!mapa.has(prazo.casoId)) mapa.set(prazo.casoId, prazo);
    return mapa;
  }, [prazos]);

  const filtrados = useMemo(() => {
    const busca = semAcento(termo.trim());
    const digitos = termo.replace(/\D/g, "");
    return casos.filter((c) => {
      if (area && c.area !== area) return false;
      if (responsavel && c.responsavelId !== responsavel) return false;
      if (!busca) return true;
      const alvo = semAcento(`${c.titulo} ${c.tipoAcao} ${nomes.cliente(c.clienteId)} ${c.parteContraria} ${c.orgao}`);
      return alvo.includes(busca) || (digitos.length >= 4 && (c.numeroCNJ ?? "").replace(/\D/g, "").includes(digitos));
    });
  }, [casos, termo, area, responsavel, nomes]);

  const ativos = casos.filter((c) => c.fase !== "encerrado").length;
  const daLista = filtrados.filter((c) => mostrarEncerrados || c.fase !== "encerrado");

  function mover(id: string, fase: FaseCaso) {
    const caso = casos.find((c) => c.id === id);
    if (!caso || caso.fase === fase) return;
    atualizarCaso(id, { fase });
    avisar(`${caso.titulo} movido para ${FASES[fase]}.`);
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Casos"
        descricao={`${plural(ativos, "caso ativo", "casos ativos")} · ${plural(casos.length - ativos, "encerrado", "encerrados")}`}
        acoes={
          <Botao onClick={form.abrir}>
            <Plus className="size-4" aria-hidden="true" />
            Novo caso
          </Botao>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Busca
          value={termo}
          onChange={(e) => definirTermo(e.target.value)}
          placeholder="Buscar por caso, cliente ou número"
          aria-label="Buscar casos"
          className="w-full sm:w-72"
        />
        <Filtro rotulo="Área" value={area} onChange={(e) => definirArea(e.target.value as AreaDireito | "")}>
          <option value="">Todas as áreas</option>
          {Object.entries(AREAS).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Filtro>
        <Filtro rotulo="Responsável" value={responsavel} onChange={(e) => definirResponsavel(e.target.value)}>
          <option value="">Toda a equipe</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </Filtro>
        <Abas
          className="ml-auto"
          rotulo="Modo de visualização"
          valor={visao}
          aoMudar={definirVisao}
          itens={[
            { id: "lista", rotulo: "Lista" },
            { id: "quadro", rotulo: "Quadro" },
          ]}
        />
      </div>

      {visao === "lista" ? (
        <Cartao className="overflow-hidden">
          {daLista.length === 0 ? (
            <Vazio
              icone={Scale}
              titulo="Nenhum caso encontrado"
              descricao="Ajuste os filtros ou cadastre um caso novo."
              acao={
                <Botao tamanho="p" onClick={form.abrir}>
                  Novo caso
                </Botao>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela min-w-[52rem]">
                <thead>
                  <tr>
                    <th>Caso</th>
                    <th>Cliente</th>
                    <th>Área</th>
                    <th>Fase</th>
                    <th>Próximo prazo</th>
                    <th>Responsável</th>
                    <th className="num">Valor da causa</th>
                  </tr>
                </thead>
                <tbody>
                  {daLista.map((caso) => (
                    <LinhaCaso key={caso.id} caso={caso} prazo={proximoPrazo.get(caso.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <label className="flex items-center gap-2.5 border-t border-linha px-5 py-3 text-sm text-mudo">
            <input
              type="checkbox"
              checked={mostrarEncerrados}
              onChange={(e) => definirMostrarEncerrados(e.target.checked)}
              className="size-4 accent-tinta"
            />
            Mostrar casos encerrados
          </label>
        </Cartao>
      ) : (
        <Quadro
          colunas={ORDEM_FASES.map((fase) => ({ id: fase, titulo: FASES[fase] }))}
          itens={filtrados}
          colunaDe={(caso) => caso.fase}
          aoMover={mover}
          vazio="Nenhum caso nesta fase."
          renderizar={(caso) => (
            <div>
              <Link href={`/painel/casos/${caso.id}`} className="block text-sm font-semibold hover:underline">
                {caso.titulo}
              </Link>
              <p className="mt-0.5 line-clamp-1 text-xs text-mudo">{caso.tipoAcao}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Etiqueta>{AREAS[caso.area]}</Etiqueta>
                <Avatar nome={nomes.usuario(caso.responsavelId)} tamanho="p" />
              </div>
              <select
                aria-label={`Mover ${caso.titulo} para outra fase`}
                value={caso.fase}
                onChange={(e) => mover(caso.id, e.target.value as FaseCaso)}
                className="mt-3 h-8 w-full rounded-lg bg-fundo px-2 text-xs text-tinta-2 ring-1 ring-linha ring-inset"
              >
                {ORDEM_FASES.map((fase) => (
                  <option key={fase} value={fase}>
                    {FASES[fase]}
                  </option>
                ))}
              </select>
            </div>
          )}
        />
      )}

      <FormCaso aberto={form.aberto} aoFechar={form.fechar} />
    </>
  );
}

function LinhaCaso({ caso, prazo }: { caso: Caso; prazo?: Parameters<typeof EtiquetaPrazo>[0]["prazo"] }) {
  const nomes = useNomes();
  return (
    <tr>
      <td>
        <Link href={`/painel/casos/${caso.id}`} className="font-medium hover:underline">
          {caso.titulo}
        </Link>
        <p className="mt-0.5 max-w-64 truncate text-xs text-mudo">{caso.tipoAcao}</p>
      </td>
      <td>
        <Link href={`/painel/clientes/${caso.clienteId}`} className="text-tinta-2 hover:underline">
          {nomes.cliente(caso.clienteId)}
        </Link>
      </td>
      <td>
        <Etiqueta>{AREAS[caso.area]}</Etiqueta>
      </td>
      <td>
        <Etiqueta tom={TOM_DA_FASE[caso.fase]}>{FASES[caso.fase]}</Etiqueta>
      </td>
      <td>{prazo ? <EtiquetaPrazo prazo={prazo} /> : <span className="text-sutil">—</span>}</td>
      <td>
        <span className="flex items-center gap-2 whitespace-nowrap text-tinta-2">
          <Avatar nome={nomes.usuario(caso.responsavelId)} tamanho="p" />
          {nomes.usuario(caso.responsavelId)}
        </span>
      </td>
      <td className="num text-tinta-2">{caso.valorCausa ? brl(caso.valorCausa, { centavos: false }) : "—"}</td>
    </tr>
  );
}
