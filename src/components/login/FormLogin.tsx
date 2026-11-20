"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { Entrada } from "@/components/ui/Campos";

/** Só aceita destinos internos do painel, para o login não virar redirecionador aberto. */
function destinoSeguro(valor: string | null): string {
  return valor && valor.startsWith("/painel") && !valor.startsWith("//") && !valor.includes("\\") ? valor : "/painel";
}

/**
 * Entrada no painel: e-mail e senha para o acesso privado e, quando a
 * demonstração pública está ligada, um botão que abre o escritório fictício.
 * A demonstração não tem senha: nada secreto chega ao navegador.
 */
export function FormLogin({ demonstracao }: { demonstracao: boolean }) {
  const [email, definirEmail] = useState("");
  const [senha, definirSenha] = useState("");
  const [armadilha, definirArmadilha] = useState("");
  const [erro, definirErro] = useState<string>();
  const [enviando, definirEnviando] = useState(false);

  async function entrar(rota: "/api/auth/login" | "/api/auth/demo", corpo?: Record<string, string>) {
    definirEnviando(true);
    definirErro(undefined);
    try {
      const resposta = await fetch(rota, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo ?? {}),
      });
      if (resposta.ok) {
        // Navegação completa: o proxy precisa ver o cookie novo. O destino (?de=) é lido
        // só aqui, no clique, para o formulário já vir pronto no HTML da página.
        const destino = new URLSearchParams(window.location.search).get("de");
        window.location.assign(destinoSeguro(destino));
        return;
      }
      const dados = (await resposta.json().catch(() => null)) as { erro?: string } | null;
      definirErro(dados?.erro ?? "Não foi possível entrar. Tente de novo.");
    } catch {
      definirErro("Sem conexão. Verifique a internet e tente de novo.");
    }
    definirEnviando(false);
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void entrar("/api/auth/login", { email, senha, ...(armadilha ? { site: armadilha } : {}) });
  }

  return (
    <div className="mt-8">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Entrada
          rotulo="E-mail"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => definirEmail(e.target.value)}
          required
        />
        <Entrada
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => definirSenha(e.target.value)}
          required
        />
        {/* Armadilha para robôs: fora da tela, fora da navegação por teclado e ignorada por leitores de tela. */}
        <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
          <label>
            Site
            <input
              type="text"
              name="site"
              tabIndex={-1}
              autoComplete="off"
              value={armadilha}
              onChange={(e) => definirArmadilha(e.target.value)}
            />
          </label>
        </div>
        {erro && (
          <p role="alert" className="rounded-xl bg-critico-fundo px-3.5 py-2.5 text-sm text-critico">
            {erro}
          </p>
        )}
        <Botao type="submit" tamanho="g" className="w-full" disabled={enviando || !email || !senha}>
          {enviando ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          Entrar
        </Botao>
      </form>

      {demonstracao && (
        <div className="mt-6 rounded-3xl bg-fundo p-5">
          <p className="text-sm font-semibold">Quer só conhecer?</p>
          <p className="mt-1 text-sm text-mudo">
            Abra a demonstração com um escritório fictício. Nada do que você fizer afeta dados reais.
          </p>
          <Botao variante="ouro" className="mt-4 w-full" disabled={enviando} onClick={() => void entrar("/api/auth/demo")}>
            Abrir a demonstração
            <ArrowRight className="size-4" aria-hidden="true" />
          </Botao>
        </div>
      )}
    </div>
  );
}
