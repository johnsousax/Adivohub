"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react";
import type { EstadoIntegracoes } from "@/app/api/integracoes/route";
import { useLoja } from "@/lib/dados/loja";

/** O dia de hoje (meia-noite), fixo enquanto a tela estiver aberta. */
export function useHoje(): Date {
  const [hoje] = useState(() => {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  });
  return hoje;
}

export interface UsuarioSessao {
  id: string;
  nome: string;
  email: string;
}

const ContextoSessao = createContext<UsuarioSessao | null>(null);

/** Busca quem está logado; se a sessão caiu, volta para o login. */
export function ProvedorSessao({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [usuario, definirUsuario] = useState<UsuarioSessao | null>(null);

  useEffect(() => {
    let ativo = true;
    fetch("/api/auth/sessao", { cache: "no-store" })
      .then(async (resposta) => {
        if (resposta.status === 401) {
          router.replace(`/entrar?de=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        if (!resposta.ok) return;
        const dados = (await resposta.json()) as { usuario: UsuarioSessao };
        if (ativo) definirUsuario(dados.usuario);
      })
      .catch(() => {
        // Sem rede: o painel continua com os dados locais.
      });
    return () => {
      ativo = false;
    };
  }, [router]);

  return <ContextoSessao value={usuario}>{children}</ContextoSessao>;
}

/** Usuário logado; antes de a sessão responder, usa o primeiro sócio do escritório. */
export function useSessao(): UsuarioSessao {
  const sessao = use(ContextoSessao);
  const usuarios = useLoja((s) => s.usuarios);
  if (sessao) return sessao;
  const padrao = usuarios[0];
  return { id: padrao?.id ?? "", nome: padrao?.nome ?? "", email: padrao?.email ?? "" };
}

/** Mapa id → nome, para mostrar responsáveis e clientes nas listas. */
export function useNomes() {
  const usuarios = useLoja((s) => s.usuarios);
  const clientes = useLoja((s) => s.clientes);
  const casos = useLoja((s) => s.casos);
  return useMemo(() => {
    const nomeUsuario = new Map(usuarios.map((u) => [u.id, u.nome]));
    const nomeCliente = new Map(clientes.map((c) => [c.id, c.nome]));
    const tituloCaso = new Map(casos.map((c) => [c.id, c.titulo]));
    return {
      usuario: (id?: string) => (id && nomeUsuario.get(id)) || "—",
      cliente: (id?: string) => (id && nomeCliente.get(id)) || "—",
      caso: (id?: string) => (id && tituloCaso.get(id)) || "—",
    };
  }, [usuarios, clientes, casos]);
}

/** Situação das integrações (IA, WhatsApp...). Buscada uma vez por sessão do navegador. */
let promessaIntegracoes: Promise<EstadoIntegracoes | null> | null = null;

export function useIntegracoes(): EstadoIntegracoes | null {
  const [estado, definirEstado] = useState<EstadoIntegracoes | null>(null);
  useEffect(() => {
    let ativo = true;
    promessaIntegracoes ??= fetch("/api/integracoes", { cache: "no-store" })
      .then((resposta) => (resposta.ok ? (resposta.json() as Promise<EstadoIntegracoes>) : null))
      .catch(() => null);
    void promessaIntegracoes.then((dados) => {
      if (ativo) definirEstado(dados);
    });
    return () => {
      ativo = false;
    };
  }, []);
  return estado;
}
