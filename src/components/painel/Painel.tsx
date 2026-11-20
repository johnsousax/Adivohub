"use client";

import { LogOut, Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { browser } from "react-dom";
import { Logo } from "@/components/marca/Logo";
import { Avatar } from "@/components/ui/Basicos";
import { Avisos } from "@/components/ui/Avisos";
import { cn } from "@/lib/cn";
import { useLoja } from "@/lib/dados/loja";
import { grupoDoPrazo } from "@/lib/dados/metricas";
import { BuscaGlobal } from "./BuscaGlobal";
import { ProvedorSessao, useHoje, useSessao } from "./ganchos";
import { itemAtivo, MENU } from "./navegacao";
import { Notificacoes } from "./Notificacoes";

/**
 * Moldura do painel. Só é renderizada no navegador, porque os dados do
 * escritório vivem no localStorage enquanto não há banco. No servidor,
 * o que vai para o HTML é o esqueleto (ver Esqueleto.tsx).
 */
export function Painel({ children }: { children: ReactNode }) {
  use(browser("O painel lê os dados do escritório guardados no navegador."));
  return (
    <ProvedorSessao>
      <Estrutura>{children}</Estrutura>
      <Avisos />
    </ProvedorSessao>
  );
}

function Estrutura({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Guardam a tela em que foram abertos: ao navegar, fecham sozinhos.
  const [menuEm, definirMenuEm] = useState<string | null>(null);
  const [buscaEm, definirBuscaEm] = useState<string | null>(null);
  const menuAberto = menuEm === pathname;
  const buscaAberta = buscaEm === pathname;
  const definirMenuAberto = (aberto: boolean) => definirMenuEm(aberto ? pathname : null);
  const definirBuscaAberta = useCallback((aberta: boolean) => definirBuscaEm(aberta ? pathname : null), [pathname]);

  useEffect(() => {
    function atalho(evento: KeyboardEvent) {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        definirBuscaAberta(true);
      }
    }
    window.addEventListener("keydown", atalho);
    return () => window.removeEventListener("keydown", atalho);
  }, [definirBuscaAberta]);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Menu lateral fixo (telas grandes) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <MenuLateral pathname={pathname} />
      </aside>

      {/* Menu deslizante (celular) */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => definirMenuAberto(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-surgir">
            <MenuLateral pathname={pathname} aoFechar={() => definirMenuAberto(false)} />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-black/[0.06] bg-fundo/80 px-4 backdrop-blur-xl sm:px-8">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => definirMenuAberto(true)}
          className="-ml-1.5 flex size-10 items-center justify-center rounded-full text-tinta-2 hover:bg-black/5 lg:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => definirBuscaAberta(true)}
          className="flex h-10 flex-1 items-center gap-2.5 rounded-full bg-white px-4 text-sm text-sutil ring-1 ring-black/[0.06] transition-shadow hover:ring-linha-forte sm:max-w-sm"
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Buscar caso, cliente ou processo</span>
          <kbd className="ml-auto hidden rounded-md bg-fundo px-1.5 py-0.5 font-sans text-[0.6875rem] font-medium text-mudo sm:block">
            Ctrl K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <Notificacoes />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[84rem] px-4 py-6 sm:px-8 sm:py-8">{children}</main>

      <BuscaGlobal aberta={buscaAberta} aoFechar={() => definirBuscaAberta(false)} />
    </div>
  );
}

function MenuLateral({ pathname, aoFechar }: { pathname: string; aoFechar?: () => void }) {
  const router = useRouter();
  const hoje = useHoje();
  const usuario = useSessao();
  const escritorio = useLoja((s) => s.escritorio);
  const prazos = useLoja((s) => s.prazos);
  const conversas = useLoja((s) => s.conversas);

  const contadores = useMemo(
    () => ({
      prazos: prazos.filter((p) => ["hoje", "atrasados"].includes(grupoDoPrazo(p, hoje))).length,
      atendimento: conversas.filter((c) => c.naoLidas > 0).length,
    }),
    [prazos, conversas, hoje],
  );

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/");
  }

  return (
    <div className="flex h-full flex-col bg-noite-1 text-white">
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <Link href="/painel" aria-label="Ir para a visão geral">
          <Logo claro />
        </Link>
        {aoFechar && (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={aoFechar}
            className="flex size-9 items-center justify-center rounded-full text-nevoa hover:bg-white/10"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Menu principal" className="rolagem-fina flex-1 space-y-6 overflow-y-auto px-3 py-3">
        {MENU.map((grupo, indice) => (
          <div key={grupo.titulo ?? indice}>
            {grupo.titulo && (
              <p className="mb-1.5 px-3 text-[0.6875rem] font-medium tracking-wide text-white/40 uppercase">{grupo.titulo}</p>
            )}
            <ul className="space-y-0.5">
              {grupo.itens.map((item) => {
                const ativo = itemAtivo(pathname, item.href);
                const contagem = item.contador ? contadores[item.contador] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                        ativo ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      <item.icone
                        className={cn("size-[1.125rem] shrink-0", ativo ? "text-ouro-300" : "text-white/45 group-hover:text-white/70")}
                        aria-hidden="true"
                      />
                      {item.rotulo}
                      {contagem > 0 && (
                        <span className="ml-auto rounded-full bg-ouro-400 px-1.5 text-[0.6875rem] leading-5 font-semibold text-noite tabular-nums">
                          {contagem}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-white/[0.08] p-3">
        <Link href="/painel/configuracoes" className="block rounded-xl bg-white/[0.05] px-3 py-2.5 transition-colors hover:bg-white/[0.08]">
          <p className="text-[0.6875rem] font-medium text-ouro-300">Modo demonstração</p>
          <p className="mt-0.5 text-xs leading-snug text-white/55">Os dados ficam só neste navegador. Não cadastre clientes reais.</p>
        </Link>
        <div className="flex items-center gap-3 px-1">
          <Avatar nome={usuario.nome} sobreEscuro />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{usuario.nome}</p>
            <p className="truncate text-xs text-white/45">{escritorio.nome}</p>
          </div>
          <button
            type="button"
            onClick={sair}
            aria-label="Sair"
            title="Sair"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
