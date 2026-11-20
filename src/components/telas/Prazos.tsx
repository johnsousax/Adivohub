"use client";

import { AlarmClock, CircleCheck, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FormPrazo } from "@/components/painel/FormulariosRotina";
import { useHoje } from "@/components/painel/ganchos";
import { LinhaPrazo, SugestoesDaIA } from "@/components/painel/Pecas";
import { avisar } from "@/components/ui/Avisos";
import { Abas, CabecalhoCartao, CabecalhoPagina, Cartao, Etiqueta, Vazio } from "@/components/ui/Basicos";
import { Botao } from "@/components/ui/Botao";
import { Filtro } from "@/components/ui/Campos";
import { useDialogo } from "@/components/ui/Modal";
import { useLoja } from "@/lib/dados/loja";
import { grupoDoPrazo, sugestoesPendentes, type GrupoPrazo } from "@/lib/dados/metricas";
import { plural } from "@/lib/formatos";

const GRUPOS: Array<{ id: Exclude<GrupoPrazo, "concluidos">; titulo: string; descricao: string }> = [
  { id: "atrasados", titulo: "Atrasados", descricao: "A data fatal já passou." },
  { id: "hoje", titulo: "Vencem hoje", descricao: "Data fatal hoje." },
  { id: "semana", titulo: "Próximos 7 dias", descricao: "Organize a semana." },
  { id: "proximos", titulo: "Mais adiante", descricao: "Depois de 7 dias." },
];

export function TelaPrazos() {
  const hoje = useHoje();
  const form = useDialogo();
  const prazos = useLoja((s) => s.prazos);
  const usuarios = useLoja((s) => s.usuarios);
  const andamentos = useLoja((s) => s.andamentos);
  const remover = useLoja((s) => s.removerPrazo);

  const [aba, definirAba] = useState<"abertos" | "concluidos">("abertos");
  const [responsavel, definirResponsavel] = useState("");

  const doResponsavel = useMemo(() => prazos.filter((p) => !responsavel || p.responsavelId === responsavel), [prazos, responsavel]);
  const porGrupo = useMemo(() => {
    const mapa: Record<GrupoPrazo, typeof prazos> = { atrasados: [], hoje: [], semana: [], proximos: [], concluidos: [] };
    for (const prazo of [...doResponsavel].sort((a, b) => a.dataFatal.localeCompare(b.dataFatal))) {
      mapa[grupoDoPrazo(prazo, hoje)].push(prazo);
    }
    mapa.concluidos.sort((a, b) => (b.concluidoEm ?? "").localeCompare(a.concluidoEm ?? ""));
    return mapa;
  }, [doResponsavel, hoje]);

  const abertos = doResponsavel.length - porGrupo.concluidos.length;
  const pendentes = useMemo(() => sugestoesPendentes(andamentos).length, [andamentos]);

  const botaoRemover = (id: string, titulo: string) => (
    <button
      type="button"
      aria-label={`Excluir prazo: ${titulo}`}
      title="Excluir"
      onClick={() => {
        remover(id);
        avisar("Prazo excluído.", "info");
      }}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-sutil hover:bg-critico-fundo hover:text-critico"
    >
      <Trash2 className="size-4" aria-hidden="true" />
    </button>
  );

  return (
    <>
      <CabecalhoPagina
        titulo="Prazos"
        descricao={`${plural(abertos, "prazo em aberto", "prazos em aberto")}${porGrupo.atrasados.length ? ` · ${plural(porGrupo.atrasados.length, "atrasado", "atrasados")}` : ""}`}
        acoes={
          <Botao onClick={form.abrir}>
            <Plus className="size-4" aria-hidden="true" />
            Novo prazo
          </Botao>
        }
      />

      {pendentes > 0 && (
        <Cartao className="mb-4">
          <CabecalhoCartao
            titulo="Publicações novas"
            descricao="A IA leu, resumiu e sugeriu o prazo. O prazo só entra na lista depois da sua confirmação."
            acao={<Etiqueta tom="ouro">{plural(pendentes, "pendente", "pendentes")}</Etiqueta>}
          />
          <SugestoesDaIA className="px-5 pb-5 sm:px-6" />
        </Cartao>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Abas
          rotulo="Situação"
          valor={aba}
          aoMudar={definirAba}
          itens={[
            { id: "abertos", rotulo: "Em aberto", contagem: abertos },
            { id: "concluidos", rotulo: "Concluídos", contagem: porGrupo.concluidos.length },
          ]}
        />
        <Filtro rotulo="Responsável" value={responsavel} onChange={(e) => definirResponsavel(e.target.value)} className="ml-auto">
          <option value="">Toda a equipe</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </Filtro>
      </div>

      {aba === "abertos" ? (
        abertos === 0 ? (
          <Cartao>
            <Vazio icone={CircleCheck} titulo="Nenhum prazo em aberto" descricao="Tudo em dia por aqui." />
          </Cartao>
        ) : (
          <div className="space-y-4">
            {GRUPOS.filter((grupo) => porGrupo[grupo.id].length > 0).map((grupo) => (
              <Cartao key={grupo.id}>
                <CabecalhoCartao
                  titulo={grupo.titulo}
                  descricao={grupo.descricao}
                  acao={
                    <Etiqueta tom={grupo.id === "atrasados" ? "critico" : grupo.id === "hoje" ? "alerta" : "neutro"}>
                      {porGrupo[grupo.id].length}
                    </Etiqueta>
                  }
                />
                <ul className="divide-y divide-linha px-5 pb-3 sm:px-6">
                  {porGrupo[grupo.id].map((prazo) => (
                    <LinhaPrazo key={prazo.id} prazo={prazo} acao={botaoRemover(prazo.id, prazo.titulo)} />
                  ))}
                </ul>
              </Cartao>
            ))}
          </div>
        )
      ) : (
        <Cartao>
          {porGrupo.concluidos.length === 0 ? (
            <Vazio icone={AlarmClock} titulo="Nenhum prazo concluído ainda" />
          ) : (
            <ul className="divide-y divide-linha px-5 py-2 sm:px-6">
              {porGrupo.concluidos.map((prazo) => (
                <LinhaPrazo key={prazo.id} prazo={prazo} />
              ))}
            </ul>
          )}
        </Cartao>
      )}

      <FormPrazo aberto={form.aberto} aoFechar={form.fechar} />
    </>
  );
}
