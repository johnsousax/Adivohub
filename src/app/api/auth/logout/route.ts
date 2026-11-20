import type { NextRequest } from "next/server";
import { cookieDeSaida } from "@/lib/auth/sessao";
import { exigirMesmaOrigem, registrarEvento } from "@/lib/servidor/respostas";

/** Encerra a sessão apagando o cookie. */
export async function POST(requisicao: NextRequest) {
  const origem = exigirMesmaOrigem(requisicao);
  if (origem) return origem;

  registrarEvento(requisicao, "logout");
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store", "Set-Cookie": cookieDeSaida() } });
}
