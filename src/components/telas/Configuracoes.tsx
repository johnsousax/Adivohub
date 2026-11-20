"use client";

import { Bot, CreditCard, Database, Download, Landmark, MessageCircle, RotateCcw, type LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useIntegracoes } from "@/components/painel/ganchos";
import { avisar } from "@/components/ui/Avisos";
import { Avatar, CabecalhoCartao, CabecalhoPagina, Cartao, Etiqueta } from "@/components/ui/Basicos";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Entrada } from "@/components/ui/Campos";
import { Modal, RodapeModal, useDialogo } from "@/components/ui/Modal";
import { fotografarDados, useLoja } from "@/lib/dados/loja";
import { dataCurta } from "@/lib/formatos";
import { MARCA, PLANOS } from "@/lib/marca";
import type { Papel } from "@/lib/tipos";
import { linkWhatsApp } from "@/lib/whatsapp";

const PAPEIS: Record<Papel, string> = {
  socio: "Sócio(a)",
  advogado: "Advogado(a)",
  estagiario: "Estagiário(a)",
  financeiro: "Financeiro",
};

function Integracao({
  icone: Icone,
  nome,
  conectada,
  rotuloDesligada = "Não conectado",
  children,
}: {
  icone: LucideIcon;
  nome: string;
  conectada: boolean | null;
  rotuloDesligada?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-fundo text-tinta-2">
        <Icone className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{nome}</p>
          {conectada === null ? (
            <Etiqueta>Verificando…</Etiqueta>
          ) : conectada ? (
            <Etiqueta tom="ok">Conectado</Etiqueta>
          ) : (
            <Etiqueta tom="alerta">{rotuloDesligada}</Etiqueta>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-mudo">{children}</p>
      </div>
    </li>
  );
}

export function TelaConfiguracoes() {
  const integracoes = useIntegracoes();
  const escritorio = useLoja((s) => s.escritorio);
  const usuarios = useLoja((s) => s.usuarios);
  const geradoEm = useLoja((s) => s.geradoEm);
  const atualizarEscritorio = useLoja((s) => s.atualizarEscritorio);
  const restaurar = useLoja((s) => s.restaurarDemonstracao);
  const confirmar = useDialogo();

  const [nome, definirNome] = useState(escritorio.nome);
  const [cidade, definirCidade] = useState(escritorio.cidade);
  const plano = PLANOS.find((p) => p.id === escritorio.plano) ?? PLANOS[0];

  function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (nome.trim().length < 2) return avisar("Informe o nome do escritório.", "erro");
    atualizarEscritorio({ nome: nome.trim(), cidade: cidade.trim() });
    avisar("Dados do escritório salvos.");
  }

  function exportar() {
    const arquivo = new Blob([JSON.stringify(fotografarDados(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vade-dados-${geradoEm}.json`;
    link.click();
    URL.revokeObjectURL(url);
    avisar("Arquivo com os dados baixado.");
  }

  return (
    <>
      <CabecalhoPagina titulo="Configurações" descricao="Escritório, equipe, plano e integrações." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Cartao>
          <CabecalhoCartao titulo="Escritório" />
          <form onSubmit={salvar} className="space-y-4 px-5 pb-5 sm:px-6">
            <Entrada rotulo="Nome do escritório" value={nome} onChange={(e) => definirNome(e.target.value)} required />
            <Entrada rotulo="Cidade" value={cidade} onChange={(e) => definirCidade(e.target.value)} />
            <Botao type="submit" disabled={nome === escritorio.nome && cidade === escritorio.cidade}>
              Salvar
            </Botao>
          </form>
        </Cartao>

        <Cartao className="flex flex-col">
          <CabecalhoCartao titulo="Plano" acao={<Etiqueta tom="ouro">Demonstração</Etiqueta>} />
          <div className="flex flex-1 flex-col px-5 pb-5 sm:px-6">
            <p className="text-2xl font-bold tracking-[-0.03em]">{plano.nome}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-tinta-2">
              {plano.recursos.slice(0, 4).map((recurso) => (
                <li key={recurso} className="flex gap-2.5">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-ouro-500" aria-hidden="true" />
                  {recurso}
                </li>
              ))}
            </ul>
            <BotaoLink
              href={linkWhatsApp(`Olá! Uso a demonstração do ${MARCA.nome} e quero contratar o plano ${plano.nome}.`)}
              variante="ouro"
              className="mt-5 self-start"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Contratar pelo WhatsApp
            </BotaoLink>
          </div>
        </Cartao>

        <Cartao>
          <CabecalhoCartao titulo="Equipe" descricao="Convites e permissões por perfil entram junto com o banco de dados." />
          <ul className="divide-y divide-linha px-5 pb-3 sm:px-6">
            {usuarios.map((usuario) => (
              <li key={usuario.id} className="flex items-center gap-3 py-3">
                <Avatar nome={usuario.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{usuario.nome}</p>
                  <p className="truncate text-xs text-mudo">
                    {usuario.email}
                    {usuario.oab ? ` · ${usuario.oab}` : ""}
                  </p>
                </div>
                <Etiqueta>{PAPEIS[usuario.papel]}</Etiqueta>
              </li>
            ))}
          </ul>
        </Cartao>

        <Cartao>
          <CabecalhoCartao titulo="Integrações" descricao="O que já está ligado e o que falta para operar com clientes reais." />
          <ul className="divide-y divide-linha px-5 pb-2 sm:px-6">
            <Integracao
              icone={Bot}
              nome="Inteligência artificial (Claude)"
              conectada={integracoes ? integracoes.ia.conectada : null}
              rotuloDesligada="Modo demonstração"
            >
              {integracoes?.ia.conectada
                ? `Assistente em ${integracoes.ia.modeloAssistente} e atendente em ${integracoes.ia.modeloAtendimento}.`
                : integracoes?.ia.reservadaAoAcessoPrivado
                  ? "A chave da IA está cadastrada, mas a demonstração pública nunca a usa: aqui as respostas vêm de regras locais, sem custo. A IA paga responde só a quem entra pelo acesso privado."
                  : "Sem a chave da API, o assistente e o atendente respondem com regras locais. Para ligar, cadastre ANTHROPIC_API_KEY nas variáveis de ambiente do projeto na Vercel e entre pelo acesso privado."}
            </Integracao>
            <Integracao icone={MessageCircle} nome="WhatsApp Business" conectada={integracoes ? integracoes.whatsapp.conectado : null}>
              Exige uma conta na WhatsApp Business Platform (Meta) com o número do escritório. O endereço que recebe as mensagens já existe;
              falta ligar o envio e o histórico ao banco.
            </Integracao>
            <Integracao
              icone={CreditCard}
              nome="Pagamentos (Pix, boleto e cartão)"
              conectada={integracoes ? integracoes.pagamentos.conectado : null}
            >
              Hoje a baixa é manual e a cobrança abre o seu WhatsApp. Com um gateway conectado, a baixa passa a ser automática.
            </Integracao>
            <Integracao
              icone={Landmark}
              nome="Tribunais (processos e publicações)"
              conectada={integracoes ? integracoes.tribunais.conectado : null}
            >
              As publicações da demonstração são exemplos. A captura automática depende de um provedor de dados dos tribunais.
            </Integracao>
            <Integracao
              icone={Database}
              nome="Banco de dados"
              conectada={integracoes ? integracoes.banco.conectado : null}
              rotuloDesligada="Dados locais"
            >
              Os dados desta demonstração ficam só neste navegador. Com o banco conectado, passam a ficar na nuvem, com acesso por usuário.
            </Integracao>
          </ul>
        </Cartao>

        <Cartao className="lg:col-span-2">
          <CabecalhoCartao
            titulo="Dados da demonstração"
            descricao={`Escritório fictício gerado em ${dataCurta(geradoEm)}. Tudo o que você altera fica salvo neste navegador.`}
          />
          <div className="flex flex-wrap gap-2 px-5 pb-5 sm:px-6">
            <Botao variante="secundario" onClick={exportar}>
              <Download className="size-4" aria-hidden="true" />
              Baixar os dados (JSON)
            </Botao>
            <Botao variante="secundario" onClick={confirmar.abrir}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Restaurar a demonstração
            </Botao>
          </div>
        </Cartao>
      </div>

      <Modal aberto={confirmar.aberto} aoFechar={confirmar.fechar} titulo="Restaurar a demonstração?" largura="sm">
        <p className="text-sm text-tinta-2">
          Tudo o que foi criado ou alterado neste navegador será apagado, e o escritório fictício volta ao estado inicial, com datas a
          partir de hoje.
        </p>
        <RodapeModal>
          <Botao variante="fantasma" onClick={confirmar.fechar}>
            Cancelar
          </Botao>
          <Botao
            variante="perigo"
            onClick={() => {
              restaurar();
              const atual = fotografarDados().escritorio;
              definirNome(atual.nome);
              definirCidade(atual.cidade);
              confirmar.fechar();
              avisar("Demonstração restaurada.");
            }}
          >
            Restaurar
          </Botao>
        </RodapeModal>
      </Modal>
    </>
  );
}
