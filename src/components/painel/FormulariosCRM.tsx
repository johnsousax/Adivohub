"use client";

import { addDays } from "date-fns";
import { useState, type FormEvent } from "react";
import { useSessao } from "@/components/painel/ganchos";
import { avisar } from "@/components/ui/Avisos";
import { Botao } from "@/components/ui/Botao";
import { AreaTexto, Entrada, Selecao } from "@/components/ui/Campos";
import { Modal, RodapeModal } from "@/components/ui/Modal";
import { useLoja } from "@/lib/dados/loja";
import { paraISO } from "@/lib/datas";
import { MOTIVOS_PERDA, TIPOS_INTERACAO, type Cliente, type MotivoPerda, type TipoInteracao } from "@/lib/tipos";

/* ------------------------------ Registrar contato ----------------------------- */

const TIPOS_REGISTRAVEIS = (Object.keys(TIPOS_INTERACAO) as TipoInteracao[]).filter((t) => t !== "etapa");

interface PropsInteracao {
  aberto: boolean;
  aoFechar: () => void;
  contato: Cliente;
  /** Texto inicial do resumo (ex.: o próximo passo que acabou de ser feito). */
  resumoInicial?: string;
}

/** Registra um contato feito (ligação, WhatsApp, reunião...) e já combina o próximo passo. */
export function ModalInteracao(props: PropsInteracao) {
  return (
    <Modal
      aberto={props.aberto}
      aoFechar={props.aoFechar}
      titulo="Registrar contato"
      descricao={`Fica no histórico de ${props.contato.nome}.`}
      largura="lg"
    >
      <CamposInteracao {...props} />
    </Modal>
  );
}

function CamposInteracao({ aoFechar, contato, resumoInicial }: PropsInteracao) {
  const sessao = useSessao();
  const usuarios = useLoja((s) => s.usuarios);
  const registrar = useLoja((s) => s.registrarInteracao);
  const definirProximoPasso = useLoja((s) => s.definirProximoPasso);
  const emAberto = contato.status === "lead";
  const [erro, definirErro] = useState<string>();
  const [comProximo, definirComProximo] = useState(emAberto);
  const usuarioId = usuarios.some((u) => u.id === sessao.id) ? sessao.id : contato.responsavelId;

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const resumo = String(dados.get("resumo") ?? "").trim();
    if (resumo.length < 3) return definirErro("Escreva o que foi conversado.");
    const agora = new Date();
    const dois = (n: number) => String(n).padStart(2, "0");
    registrar({
      clienteId: contato.id,
      tipo: String(dados.get("tipo")) as TipoInteracao,
      resumo,
      em: `${paraISO(agora)}T${dois(agora.getHours())}:${dois(agora.getMinutes())}:00`,
      usuarioId,
    });
    if (emAberto) {
      const descricao = String(dados.get("proximo") ?? "").trim();
      const data = String(dados.get("dataProximo") ?? "");
      definirProximoPasso(contato.id, comProximo && descricao && data ? { descricao, data } : undefined);
    }
    avisar("Contato registrado.");
    aoFechar();
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Selecao rotulo="Como foi" name="tipo" defaultValue="ligacao">
        {TIPOS_REGISTRAVEIS.map((tipo) => (
          <option key={tipo} value={tipo}>
            {TIPOS_INTERACAO[tipo]}
          </option>
        ))}
      </Selecao>
      <div className="hidden sm:block" />
      <AreaTexto
        rotulo="O que foi conversado"
        name="resumo"
        defaultValue={resumoInicial}
        erro={erro}
        maxLength={2000}
        rows={3}
        required
        autoFocus
        className="sm:col-span-2"
      />
      {emAberto && (
        <fieldset className="rounded-2xl bg-fundo p-4 sm:col-span-2">
          <legend className="sr-only">Próximo passo</legend>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={comProximo}
              onChange={(e) => definirComProximo(e.target.checked)}
              className="size-4 accent-tinta"
            />
            Combinar o próximo passo
          </label>
          {comProximo && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_11rem]">
              <Entrada
                rotulo="Próximo passo"
                name="proximo"
                defaultValue={contato.proximoPasso?.descricao ?? ""}
                placeholder="Ex.: ligar para saber se aprovou a proposta"
                maxLength={200}
                required
              />
              <Entrada
                rotulo="Quando"
                name="dataProximo"
                type="date"
                defaultValue={contato.proximoPasso?.data ?? paraISO(addDays(new Date(), 2))}
                required
              />
            </div>
          )}
        </fieldset>
      )}
      <div className="sm:col-span-2">
        <RodapeModal>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">Registrar</Botao>
        </RodapeModal>
      </div>
    </form>
  );
}

/* ------------------------------- Contato perdido ------------------------------- */

interface PropsPerda {
  aberto: boolean;
  aoFechar: () => void;
  contato: Cliente;
}

/** Tira o contato do funil guardando o motivo, que alimenta os indicadores. */
export function ModalPerda(props: PropsPerda) {
  return (
    <Modal aberto={props.aberto} aoFechar={props.aoFechar} titulo="Marcar como perdido" descricao={props.contato.nome} largura="sm">
      <CamposPerda {...props} />
    </Modal>
  );
}

function CamposPerda({ aoFechar, contato }: PropsPerda) {
  const marcarPerdido = useLoja((s) => s.marcarPerdido);

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    marcarPerdido(contato.id, String(dados.get("motivo")) as MotivoPerda, String(dados.get("detalhe") ?? "").slice(0, 300));
    avisar(`${contato.nome} saiu do funil. Dá para reabrir quando quiser.`, "info");
    aoFechar();
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <Selecao rotulo="Por que não fechou" name="motivo" defaultValue="preco">
        {Object.entries(MOTIVOS_PERDA).map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </Selecao>
      <AreaTexto rotulo="Detalhe (opcional)" name="detalhe" rows={2} maxLength={300} />
      <RodapeModal>
        <Botao variante="fantasma" onClick={aoFechar}>
          Cancelar
        </Botao>
        <Botao variante="perigo" type="submit">
          Marcar como perdido
        </Botao>
      </RodapeModal>
    </form>
  );
}
