import type { NextRequest } from "next/server";
import { exigirSessao } from "@/lib/servidor/respostas";

/** Quem está logado — usado pelo painel para mostrar o usuário. */
export async function GET(requisicao: NextRequest) {
  const sessao = await exigirSessao(requisicao);
  if (sessao instanceof Response) return sessao;
  return Response.json(
    { usuario: { id: sessao.sub, nome: sessao.nome, email: sessao.email, papel: sessao.papel } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
