import type { NextRequest } from "next/server";
import { demoPublica, USUARIO_DEMO } from "@/lib/auth/credenciais";
import { assinarSessao, cookieDeSessao, sessaoDisponivel } from "@/lib/auth/sessao";
import { erro, exigirMesmaOrigem, limitar, registrarEvento } from "@/lib/servidor/respostas";

/**
 * Abre a demonstração pública. Não há senha: quem entra só vê dados fictícios,
 * guardados no próprio navegador, e a IA responde por regras prontas, sem custo.
 * Nenhuma credencial vai para o navegador nem fica no repositório.
 */
export async function POST(requisicao: NextRequest) {
  const origem = exigirMesmaOrigem(requisicao);
  if (origem) return origem;

  const bloqueio = limitar(requisicao, "demo", 20, 5 * 60_000);
  if (bloqueio) return bloqueio;

  if (!demoPublica()) {
    registrarEvento(requisicao, "demo.desligada", {}, "aviso");
    return erro(requisicao, 403, "A demonstração não está disponível.");
  }
  if (!sessaoDisponivel()) {
    registrarEvento(requisicao, "login.indisponivel", { motivo: "AUTH_SECRET ausente ou curto" }, "erro");
    return erro(requisicao, 503, "Demonstração indisponível no momento.");
  }

  const token = await assinarSessao({ ...USUARIO_DEMO, papel: "demo" });
  if (!token) return erro(requisicao, 503, "Demonstração indisponível no momento.");

  registrarEvento(requisicao, "demo.inicio");
  return Response.json(
    { usuario: { nome: USUARIO_DEMO.nome } },
    { headers: { "Cache-Control": "no-store", "Set-Cookie": cookieDeSessao(token) } },
  );
}
