import type { NextRequest } from "next/server";
import { z } from "zod";
import { conferirCredenciais, credenciaisDemo, USUARIO_DEMO } from "@/lib/auth/credenciais";
import { assinarSessao, COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS, sessaoDisponivel } from "@/lib/auth/sessao";
import { erro, lerJson, limitar } from "@/lib/servidor/respostas";

const Corpo = z.object({
  email: z.string().trim().min(3).max(200),
  senha: z.string().min(1).max(200),
});

export async function POST(requisicao: NextRequest) {
  // 10 tentativas a cada 5 minutos por IP.
  const bloqueio = limitar(requisicao, "login", 10, 5 * 60_000);
  if (bloqueio) return bloqueio;

  if (!sessaoDisponivel()) {
    console.error("[auth] AUTH_SECRET ausente: login desativado em produção.");
    return erro(503, "Login indisponível: o servidor ainda não foi configurado (AUTH_SECRET).");
  }

  const json = await lerJson(requisicao, 2_000);
  if (json instanceof Response) return json;
  const corpo = Corpo.safeParse(json);
  if (!corpo.success) return erro(400, "Informe e-mail e senha.");

  if (!conferirCredenciais(corpo.data.email, corpo.data.senha)) {
    return erro(401, "E-mail ou senha incorretos.");
  }

  const usuario = { ...USUARIO_DEMO, email: credenciaisDemo().email };
  const token = await assinarSessao(usuario);
  if (!token) return erro(503, "Login indisponível no momento.");

  const resposta = Response.json({ usuario: { nome: usuario.nome, email: usuario.email } });
  resposta.headers.append(
    "Set-Cookie",
    [
      `${COOKIE_SESSAO}=${token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${DURACAO_SESSAO_SEGUNDOS}`,
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; "),
  );
  return resposta;
}
