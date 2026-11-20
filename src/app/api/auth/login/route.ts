import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { conferirAcessoPrivado, normalizarEmail, USUARIO_DEMO } from "@/lib/auth/credenciais";
import { assinarSessao, cookieDeSessao, sessaoDisponivel } from "@/lib/auth/sessao";
import { esperaPorFalhas, ipDaRequisicao, limparFalhas, registrarFalha } from "@/lib/servidor/limite";
import { mascararEmail } from "@/lib/servidor/registro";
import { erro, exigirMesmaOrigem, lerJson, limitar, registrarEvento } from "@/lib/servidor/respostas";

/** Campos exatos do pedido: qualquer campo a mais é recusado. */
const Corpo = z.strictObject({
  email: z.string().trim().min(3).max(200),
  senha: z.string().min(1).max(200),
  /** Armadilha para robôs: campo invisível no formulário. Pessoa nenhuma preenche. */
  site: z.string().max(200).optional(),
});

/** A mesma mensagem para e-mail inexistente, senha errada e acesso não configurado. */
const MENSAGEM_NEUTRA = "E-mail ou senha inválidos.";

/** Login do acesso privado (conta definida por variáveis de ambiente). */
export async function POST(requisicao: NextRequest) {
  const origem = exigirMesmaOrigem(requisicao);
  if (origem) return origem;

  // Camada 1: 5 tentativas por minuto por IP, certas ou erradas.
  const bloqueio = limitar(requisicao, "login", 5, 60_000);
  if (bloqueio) return bloqueio;

  if (!sessaoDisponivel()) {
    registrarEvento(requisicao, "login.indisponivel", { motivo: "AUTH_SECRET ausente ou curto" }, "erro");
    return erro(requisicao, 503, "Login indisponível no momento.");
  }

  const json = await lerJson(requisicao, 2_000);
  if (json instanceof Response) return json;
  const corpo = Corpo.safeParse(json);
  if (!corpo.success) {
    registrarEvento(requisicao, "pedido.invalido", {}, "aviso");
    return erro(requisicao, 400, "Informe e-mail e senha.");
  }

  const email = normalizarEmail(corpo.data.email);
  const chaveIp = `login:ip:${ipDaRequisicao(requisicao)}`;
  const chaveConta = `login:conta:${createHash("sha256").update(email).digest("hex").slice(0, 32)}`;

  // Camada 2: espera crescente depois de 5 erros, por IP e por conta.
  const espera = Math.max(esperaPorFalhas(chaveIp), esperaPorFalhas(chaveConta));
  if (espera > 0) {
    registrarEvento(requisicao, "login.bloqueado", { email: mascararEmail(email), espera }, "aviso");
    return erro(requisicao, 429, "Muitas tentativas. Tente de novo em alguns minutos.", { "Retry-After": String(espera) });
  }

  // O hash da senha é sempre calculado, para o tempo de resposta não denunciar nada.
  const usuario = await conferirAcessoPrivado(email, corpo.data.senha);
  const ehRobo = Boolean(corpo.data.site);

  if (!usuario || ehRobo) {
    registrarFalha(chaveIp);
    registrarFalha(chaveConta);
    registrarEvento(requisicao, ehRobo ? "login.robo" : "login.falha", { email: mascararEmail(email) }, "aviso");
    return erro(requisicao, 401, MENSAGEM_NEUTRA);
  }

  const token = await assinarSessao({ sub: USUARIO_DEMO.sub, nome: usuario.nome, email: usuario.email, papel: "equipe" });
  if (!token) return erro(requisicao, 503, "Login indisponível no momento.");

  limparFalhas(chaveIp);
  limparFalhas(chaveConta);
  registrarEvento(requisicao, "login.ok", { email: mascararEmail(email) });

  return Response.json(
    { usuario: { nome: usuario.nome } },
    { headers: { "Cache-Control": "no-store", "Set-Cookie": cookieDeSessao(token) } },
  );
}
