"use client";

import { ArrowUp, RotateCcw, Sparkles } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useHoje, useIntegracoes, useSessao } from "@/components/painel/ganchos";
import { avisar } from "@/components/ui/Avisos";
import { CabecalhoPagina, Etiqueta } from "@/components/ui/Basicos";
import { Botao } from "@/components/ui/Botao";
import { cn } from "@/lib/cn";
import { fotografarDados } from "@/lib/dados/loja";
import { montarContextoIA } from "@/lib/ia/contexto";
import type { ModoIA, PedidoAssistente } from "@/lib/ia/esquemas";

interface Turno {
  id: number;
  papel: "usuario" | "assistente";
  texto: string;
}

const SUGESTOES = [
  "Resumo do meu dia",
  "Quais prazos vencem esta semana?",
  "Quem está com parcela em atraso?",
  "Como está o caso Ferreira?",
  "Como está o funil de novos clientes?",
  "Quais publicações estão aguardando confirmação?",
];

/** **negrito** → <strong>. Todo o resto é texto puro (nada de HTML vindo da IA). */
function comNegrito(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((trecho, indice) =>
    trecho.startsWith("**") && trecho.endsWith("**") && trecho.length > 4 ? (
      <strong key={indice} className="font-semibold">
        {trecho.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={indice}>{trecho}</Fragment>
    ),
  );
}

/** Formatação mínima das respostas: parágrafos, listas com "- " e negrito. */
function TextoFormatado({ texto }: { texto: string }) {
  const blocos: ReactNode[] = [];
  let itens: string[] = [];
  const fecharLista = () => {
    if (!itens.length) return;
    blocos.push(
      <ul key={`l${blocos.length}`} className="space-y-1.5">
        {itens.map((item, indice) => (
          <li key={indice} className="flex gap-2.5">
            <span className="mt-[0.6rem] size-1 shrink-0 rounded-full bg-ouro-500" aria-hidden="true" />
            <span>{comNegrito(item)}</span>
          </li>
        ))}
      </ul>,
    );
    itens = [];
  };

  for (const linha of texto.split("\n")) {
    const item = /^\s*[-•]\s+(.*)$/.exec(linha);
    if (item) {
      itens.push(item[1]);
      continue;
    }
    fecharLista();
    if (linha.trim()) blocos.push(<p key={`p${blocos.length}`}>{comNegrito(linha.replace(/^#+\s*/, ""))}</p>);
  }
  fecharLista();
  return <div className="space-y-3">{blocos}</div>;
}

export function TelaAssistente() {
  const hoje = useHoje();
  const sessao = useSessao();
  const integracoes = useIntegracoes();
  const [turnos, definirTurnos] = useState<Turno[]>([]);
  const [texto, definirTexto] = useState("");
  const [respondendo, definirRespondendo] = useState(false);
  const [modo, definirModo] = useState<ModoIA | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const proximoId = useRef(1);
  const cancelar = useRef<AbortController | null>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [turnos]);

  // Saiu da tela no meio de uma resposta: interrompe o fluxo.
  useEffect(() => () => cancelar.current?.abort(), []);

  const modoAtual: ModoIA | null = modo ?? (integracoes ? (integracoes.ia.conectada ? "claude" : "demo") : null);

  async function perguntar(pergunta: string) {
    const limpa = pergunta.trim();
    if (!limpa || respondendo) return;

    const idPergunta = proximoId.current++;
    const idResposta = proximoId.current++;
    const historico = [...turnos, { id: idPergunta, papel: "usuario" as const, texto: limpa }];
    definirTurnos([...historico, { id: idResposta, papel: "assistente", texto: "" }]);
    definirTexto("");
    definirRespondendo(true);

    const atualizarResposta = (conteudo: string) =>
      definirTurnos((atuais) => atuais.map((t) => (t.id === idResposta ? { ...t, texto: conteudo } : t)));

    try {
      const pedido: PedidoAssistente = {
        // Só os turnos mais recentes: mantém o pedido pequeno e dentro do limite da rota.
        mensagens: historico.slice(-12).map((t) => ({ papel: t.papel, texto: t.texto.slice(0, 4000) })),
        contexto: montarContextoIA(fotografarDados(), hoje, sessao.nome),
      };
      // A API exige que a conversa comece por uma mensagem do usuário.
      while (pedido.mensagens[0]?.papel === "assistente") pedido.mensagens.shift();

      cancelar.current = new AbortController();
      const resposta = await fetch("/api/ia/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido),
        signal: cancelar.current.signal,
      });

      if (!resposta.ok || !resposta.body) {
        const corpo = (await resposta.json().catch(() => null)) as { erro?: string } | null;
        throw new Error(corpo?.erro ?? "Não foi possível responder agora.");
      }
      definirModo(resposta.headers.get("X-JustixUp-IA") === "claude" ? "claude" : "demo");

      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        acumulado += decodificador.decode(value, { stream: true });
        atualizarResposta(acumulado);
      }
      if (!acumulado.trim()) atualizarResposta("Não consegui montar uma resposta. Tente perguntar de outro jeito.");
    } catch (falha) {
      if (falha instanceof DOMException && falha.name === "AbortError") return;
      const mensagem = falha instanceof Error ? falha.message : "Não foi possível responder agora.";
      definirTurnos((atuais) => atuais.filter((t) => t.id !== idResposta));
      avisar(mensagem, "erro");
    } finally {
      definirRespondendo(false);
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void perguntar(texto);
  }

  const vazio = turnos.length === 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col">
      <CabecalhoPagina
        titulo="Assistente"
        descricao="Pergunte sobre prazos, agenda, casos, clientes e financeiro do escritório."
        acoes={
          <>
            {modoAtual && (
              <Etiqueta tom={modoAtual === "claude" ? "ouro" : "neutro"} icone={Sparkles}>
                {modoAtual === "claude" ? "IA conectada (Claude)" : "Modo demonstração"}
              </Etiqueta>
            )}
            {!vazio && (
              <Botao
                variante="secundario"
                tamanho="p"
                onClick={() => {
                  cancelar.current?.abort();
                  definirTurnos([]);
                  definirRespondendo(false);
                }}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Nova conversa
              </Botao>
            )}
          </>
        }
      />

      <div className="flex-1">
        {vazio ? (
          <div className="pt-6 sm:pt-12">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-tinta text-ouro-300">
              <Sparkles className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-bold tracking-[-0.03em]">
              Olá, {sessao.nome.split(" ").slice(0, 2).join(" ")}. <span className="text-mudo">O que você precisa saber?</span>
            </h2>
            {modoAtual === "demo" && (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-mudo">
                A IA ainda não está conectada, então respondo com regras simples sobre os dados do escritório. Com a chave da API
                configurada, as mesmas perguntas passam a ser respondidas pelo Claude, que também redige mensagens e minutas.
              </p>
            )}
            <ul className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGESTOES.map((sugestao) => (
                <li key={sugestao}>
                  <button
                    type="button"
                    onClick={() => void perguntar(sugestao)}
                    className="w-full rounded-2xl bg-white px-4 py-3.5 text-left text-sm font-medium shadow-cartao ring-1 ring-black/[0.04] transition-shadow hover:ring-linha-forte"
                  >
                    {sugestao}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="space-y-6 pb-6" aria-live="polite">
            {turnos.map((turno) =>
              turno.papel === "usuario" ? (
                <li key={turno.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-[1.25rem] rounded-br-md bg-tinta px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white">
                    {turno.texto}
                  </p>
                </li>
              ) : (
                <li key={turno.id} className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-ouro-50 text-ouro-700 ring-1 ring-ouro-200">
                    <Sparkles className={cn("size-4", !turno.texto && "animate-pulse")} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1 pt-1 text-[0.95rem] leading-relaxed">
                    {turno.texto ? (
                      <TextoFormatado texto={turno.texto} />
                    ) : (
                      <p className="text-mudo">Consultando os dados do escritório…</p>
                    )}
                  </div>
                </li>
              ),
            )}
          </ol>
        )}
        <div ref={fim} />
      </div>

      <form onSubmit={enviar} className="sticky bottom-4 mt-4 flex items-end gap-2 rounded-[1.75rem] bg-white p-2 shadow-flutuante">
        <textarea
          value={texto}
          onChange={(e) => definirTexto(e.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter" && !evento.shiftKey) {
              evento.preventDefault();
              void perguntar(texto);
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder="Pergunte algo sobre o escritório"
          aria-label="Sua pergunta"
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-4 py-2.5 text-[0.95rem] outline-none placeholder:text-sutil"
        />
        <Botao type="submit" tamanho="icone" disabled={!texto.trim() || respondendo} aria-label="Enviar pergunta">
          <ArrowUp className="size-5" aria-hidden="true" />
        </Botao>
      </form>
      <p className="mt-3 text-center text-xs text-sutil">
        A IA pode errar. Confira datas e valores antes de agir; prazos sempre dependem da sua confirmação.
      </p>
    </div>
  );
}
