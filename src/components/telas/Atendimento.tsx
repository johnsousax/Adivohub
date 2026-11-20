"use client";

import { addMinutes, format, parseISO } from "date-fns";
import { ArrowLeft, Bot, Info, MessageCircle, Plus, SendHorizontal, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { RespostaRotaAtendimento } from "@/app/api/ia/atendimento/route";
import { useHoje, useIntegracoes, useSessao } from "@/components/painel/ganchos";
import { avisar } from "@/components/ui/Avisos";
import { Abas, Avatar, CabecalhoPagina, Cartao, Etiqueta, Vazio } from "@/components/ui/Basicos";
import { Botao } from "@/components/ui/Botao";
import { cn } from "@/lib/cn";
import { fotografarDados, obterLoja, useLoja } from "@/lib/dados/loja";
import { paraISO } from "@/lib/datas";
import { dataDiaMes, dataSemana, hora, plural, telefone } from "@/lib/formatos";
import { montarPedidoAtendimento } from "@/lib/ia/contexto";
import type { Conversa, Mensagem } from "@/lib/tipos";

function quando(mensagem: Mensagem, hojeISO: string): string {
  const dia = mensagem.enviadaEm.slice(0, 10);
  return dia === hojeISO ? hora(mensagem.enviadaEm) : `${dataDiaMes(mensagem.enviadaEm)}, ${hora(mensagem.enviadaEm)}`;
}

const CONTATOS_DE_TESTE = ["Rafael Nogueira", "Camila Teixeira", "Diego Barros", "Patrícia Leal", "Marcelo Pinto"];

export function TelaAtendimento() {
  const hoje = useHoje();
  const hojeISO = paraISO(hoje);
  const sessao = useSessao();
  const integracoes = useIntegracoes();
  const parametros = useSearchParams();

  const conversas = useLoja((s) => s.conversas);
  const usuarios = useLoja((s) => s.usuarios);
  const enviarMensagem = useLoja((s) => s.enviarMensagem);
  const definirModo = useLoja((s) => s.definirModoConversa);
  const marcarLida = useLoja((s) => s.marcarConversaLida);
  const transferir = useLoja((s) => s.transferirParaEquipe);
  const novaConversa = useLoja((s) => s.novaConversa);
  const adicionarCliente = useLoja((s) => s.adicionarCliente);
  const adicionarEvento = useLoja((s) => s.adicionarEvento);
  const moverLead = useLoja((s) => s.moverLead);

  const ordenadas = useMemo(
    () =>
      [...conversas].sort((a, b) => {
        const ultimaA = a.mensagens[a.mensagens.length - 1]?.enviadaEm ?? "9999";
        const ultimaB = b.mensagens[b.mensagens.length - 1]?.enviadaEm ?? "9999";
        return ultimaB.localeCompare(ultimaA);
      }),
    [conversas],
  );

  const [selecionadaId, definirSelecionadaId] = useState<string | null>(() => parametros.get("conversa"));
  const [listaNoCelular, definirListaNoCelular] = useState(() => !parametros.get("conversa"));
  const [papel, definirPapel] = useState<"equipe" | "cliente">("cliente");
  const [texto, definirTexto] = useState("");
  const [digitando, definirDigitando] = useState<string | null>(null);
  const fimDaConversa = useRef<HTMLDivElement>(null);

  const conversa = ordenadas.find((c) => c.id === selecionadaId) ?? ordenadas[0];
  const totalDeMensagens = conversa?.mensagens.length ?? 0;
  const aguardando = conversas.filter((c) => c.naoLidas > 0).length;

  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ block: "end" });
  }, [conversa?.id, totalDeMensagens, digitando]);

  function abrir(alvo: Conversa) {
    definirSelecionadaId(alvo.id);
    definirListaNoCelular(false);
    definirTexto("");
  }

  function iniciarTeste() {
    const nome = CONTATOS_DE_TESTE[conversas.length % CONTATOS_DE_TESTE.length];
    const fone = `9898${String(1000000 + conversas.length * 7919).slice(-7)}`;
    const lead = adicionarCliente({
      tipo: "PF",
      nome,
      documento: "",
      email: "",
      telefone: fone,
      cidade: "São Luís - MA",
      origem: "whatsapp",
      status: "lead",
      etapaFunil: "novo",
      responsavelId: sessao.id || usuarios[0]?.id || "",
      criadoEm: hojeISO,
      observacoes: "Contato criado para testar o atendente virtual.",
    });
    const nova = novaConversa(nome, fone, lead.id);
    definirPapel("cliente");
    abrir(nova);
    avisar("Conversa de teste criada. Escreva como se fosse o cliente.", "info");
  }

  async function responderComIA(conversaId: string) {
    const atual = obterLoja()
      .getState()
      .conversas.find((c) => c.id === conversaId);
    if (!atual || atual.modo !== "ia") return;

    definirDigitando(conversaId);
    try {
      const pedido = montarPedidoAtendimento(fotografarDados(), atual, hoje);
      const resposta = await fetch("/api/ia/atendimento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedido),
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const dados = (await resposta.json()) as RespostaRotaAtendimento;

      enviarMensagem(conversaId, "ia", dados.resposta);

      if (dados.acao === "agendar" && dados.horario) {
        const dadosAtuais = fotografarDados();
        const cliente = dadosAtuais.clientes.find((c) => c.id === atual.clienteId);
        const inicio = parseISO(dados.horario);
        adicionarEvento({
          titulo: `Consulta — ${atual.nome}`,
          tipo: "consulta",
          inicio: dados.horario,
          fim: format(addMinutes(inicio, 45), "yyyy-MM-dd'T'HH:mm:ss"),
          local: "Online (vídeo)",
          clienteId: atual.clienteId,
          responsavelId: cliente?.responsavelId ?? dadosAtuais.usuarios[0]?.id ?? "",
          criadoPorIA: true,
        });
        if (cliente?.status === "lead") moverLead(cliente.id, "consulta");
        avisar(`A IA agendou uma consulta para ${dataSemana(dados.horario)} às ${hora(dados.horario)}.`);
      }
      if (dados.acao === "transferir") {
        transferir(conversaId);
        avisar("A IA passou a conversa para a equipe.", "info");
      }
    } catch {
      avisar("A IA não respondeu agora. Tente enviar de novo.", "erro");
    } finally {
      definirDigitando(null);
    }
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const mensagem = texto.trim();
    if (!mensagem || !conversa) return;
    definirTexto("");

    if (papel === "equipe") {
      // Ao responder, a equipe assume a conversa.
      if (conversa.modo === "ia") definirModo(conversa.id, "humano");
      enviarMensagem(conversa.id, "equipe", mensagem);
      return;
    }
    enviarMensagem(conversa.id, "cliente", mensagem);
    void responderComIA(conversa.id);
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Atendimento"
        descricao={
          aguardando
            ? `${plural(aguardando, "conversa esperando", "conversas esperando")} a equipe`
            : "O atendente virtual está cuidando das conversas."
        }
        acoes={
          <Botao onClick={iniciarTeste}>
            <Plus className="size-4" aria-hidden="true" />
            Testar com novo contato
          </Botao>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-2xl bg-ouro-50 px-4 py-3 text-sm text-ouro-800 ring-1 ring-ouro-200 ring-inset">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          <strong className="font-semibold">Ambiente de simulação.</strong> O número de WhatsApp do escritório ainda não está conectado,
          então as conversas abaixo são exemplos. Use “Escrever como cliente” para ver o atendente responder.{" "}
          <Link href="/painel/configuracoes" className="font-medium underline underline-offset-2">
            Ver integrações
          </Link>
        </p>
      </div>

      <Cartao className="grid grid-cols-1 h-[calc(100dvh-19rem)] min-h-[34rem] overflow-hidden md:grid-cols-[20rem_1fr]">
        {/* Lista de conversas */}
        <aside className={cn("flex min-h-0 flex-col border-linha md:border-r", !listaNoCelular && "hidden md:flex")}>
          <p className="px-5 pt-4 pb-2 text-sm font-semibold">Conversas</p>
          <ul className="rolagem-fina flex-1 overflow-y-auto p-2 pt-0">
            {ordenadas.map((item) => {
              const ultima = item.mensagens[item.mensagens.length - 1];
              const ativa = item.id === conversa?.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      abrir(item);
                      if (item.naoLidas) marcarLida(item.id);
                    }}
                    aria-current={ativa ? "true" : undefined}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                      ativa ? "bg-fundo" : "hover:bg-fundo/60",
                    )}
                  >
                    <Avatar nome={item.nome} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{item.nome}</span>
                        {ultima && <span className="shrink-0 text-[0.6875rem] text-mudo tabular-nums">{quando(ultima, hojeISO)}</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-mudo">{ultima ? ultima.texto : "Conversa nova"}</span>
                      <span className="mt-1.5 flex items-center gap-1.5">
                        <Etiqueta tom={item.modo === "ia" ? "ouro" : "neutro"} icone={item.modo === "ia" ? Sparkles : UserRound}>
                          {item.modo === "ia" ? "IA atendendo" : "Com a equipe"}
                        </Etiqueta>
                        {item.naoLidas > 0 && <Etiqueta tom="escuro">{plural(item.naoLidas, "nova", "novas")}</Etiqueta>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Conversa aberta */}
        {conversa ? (
          <section aria-label={`Conversa com ${conversa.nome}`} className={cn("flex min-h-0 flex-col", listaNoCelular && "hidden md:flex")}>
            <header className="flex items-center gap-3 border-b border-linha px-4 py-3 sm:px-5">
              <button
                type="button"
                aria-label="Voltar para a lista"
                onClick={() => definirListaNoCelular(true)}
                className="-ml-1 flex size-9 items-center justify-center rounded-full hover:bg-fundo md:hidden"
              >
                <ArrowLeft className="size-4.5" aria-hidden="true" />
              </button>
              <Avatar nome={conversa.nome} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {conversa.clienteId ? (
                    <Link href={`/painel/clientes/${conversa.clienteId}`} className="hover:underline">
                      {conversa.nome}
                    </Link>
                  ) : (
                    conversa.nome
                  )}
                </p>
                <p className="text-xs text-mudo tabular-nums">{telefone(conversa.telefone)}</p>
              </div>
              {conversa.modo === "ia" ? (
                <Botao
                  tamanho="p"
                  variante="secundario"
                  onClick={() => {
                    definirModo(conversa.id, "humano");
                    definirPapel("equipe");
                    avisar("Você assumiu a conversa. A IA não responde mais aqui.", "info");
                  }}
                >
                  Assumir
                </Botao>
              ) : (
                <Botao
                  tamanho="p"
                  variante="secundario"
                  onClick={() => {
                    definirModo(conversa.id, "ia");
                    marcarLida(conversa.id);
                    avisar("Conversa devolvida para o atendente virtual.", "info");
                  }}
                >
                  <Sparkles className="size-4" aria-hidden="true" />
                  Devolver à IA
                </Botao>
              )}
            </header>

            <div className="rolagem-fina flex-1 space-y-3 overflow-y-auto bg-fundo/60 px-4 py-5 sm:px-6" aria-live="polite">
              {conversa.mensagens.length === 0 && (
                <p className="mx-auto max-w-xs rounded-2xl bg-white px-4 py-3 text-center text-sm text-mudo shadow-cartao">
                  Conversa nova. Escreva como cliente, por exemplo: “Fui demitido e não recebi minhas verbas”.
                </p>
              )}
              {conversa.mensagens.map((mensagem) => {
                const doCliente = mensagem.de === "cliente";
                return (
                  <div key={mensagem.id} className={cn("flex", doCliente ? "justify-start" : "justify-end")}>
                    <div className={cn("max-w-[min(34rem,82%)]", !doCliente && "text-right")}>
                      {!doCliente && (
                        <p className="mb-1 inline-flex items-center gap-1 text-[0.6875rem] font-medium text-mudo">
                          {mensagem.de === "ia" ? (
                            <Bot className="size-3" aria-hidden="true" />
                          ) : (
                            <UserRound className="size-3" aria-hidden="true" />
                          )}
                          {mensagem.de === "ia" ? "Atendente virtual" : "Equipe"}
                        </p>
                      )}
                      <p
                        className={cn(
                          "rounded-[1.25rem] px-4 py-2.5 text-left text-sm leading-relaxed whitespace-pre-wrap",
                          doCliente && "rounded-bl-md bg-white shadow-cartao",
                          mensagem.de === "ia" && "rounded-br-md bg-tinta text-white",
                          mensagem.de === "equipe" && "rounded-br-md bg-ouro-200 text-tinta",
                        )}
                      >
                        {mensagem.texto}
                      </p>
                      <p className="mt-1 text-[0.6875rem] text-sutil tabular-nums">{quando(mensagem, hojeISO)}</p>
                    </div>
                  </div>
                );
              })}
              {digitando === conversa.id && (
                <div className="flex justify-end">
                  <p className="inline-flex items-center gap-2 rounded-full bg-tinta px-4 py-2 text-xs text-white/80">
                    <Sparkles className="size-3.5 animate-pulse text-ouro-300" aria-hidden="true" />
                    Atendente virtual escrevendo…
                  </p>
                </div>
              )}
              <div ref={fimDaConversa} />
            </div>

            <footer className="border-t border-linha p-3 sm:p-4">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <Abas
                  rotulo="Escrever como"
                  valor={papel}
                  aoMudar={definirPapel}
                  itens={[
                    { id: "cliente", rotulo: "Escrever como cliente" },
                    { id: "equipe", rotulo: "Responder como equipe" },
                  ]}
                />
                <span className="text-xs text-mudo">
                  {papel === "cliente"
                    ? conversa.modo === "ia"
                      ? `Simulação: o atendente responde${integracoes ? (integracoes.ia.conectada ? " com IA (Claude)." : " em modo demonstração (regras locais).") : "."}`
                      : "Simulação: a conversa está com a equipe, então a IA não responde."
                    : conversa.modo === "ia"
                      ? "Ao enviar, você assume a conversa."
                      : `Respondendo como ${sessao.nome}.`}
                </span>
              </div>
              <form onSubmit={enviar} className="flex gap-2">
                <input
                  value={texto}
                  onChange={(e) => definirTexto(e.target.value)}
                  placeholder={papel === "cliente" ? "Mensagem do cliente (simulação)" : "Sua resposta"}
                  aria-label={papel === "cliente" ? "Mensagem do cliente" : "Resposta da equipe"}
                  maxLength={1500}
                  className="h-11 min-w-0 flex-1 rounded-full bg-fundo px-4 text-sm outline-none placeholder:text-sutil focus:ring-2 focus:ring-tinta"
                />
                <Botao type="submit" tamanho="icone" disabled={!texto.trim() || digitando === conversa.id} aria-label="Enviar">
                  <SendHorizontal className="size-4.5" aria-hidden="true" />
                </Botao>
              </form>
            </footer>
          </section>
        ) : (
          <Vazio
            icone={MessageCircle}
            titulo="Nenhuma conversa"
            descricao="Crie uma conversa de teste para ver o atendente virtual em ação."
            className="col-span-full self-center"
          />
        )}
      </Cartao>
    </>
  );
}
