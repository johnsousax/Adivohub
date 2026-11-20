import { COOKIE_SESSAO } from "@/lib/auth/sessao";

export async function POST() {
  const resposta = Response.json({ ok: true });
  resposta.headers.append(
    "Set-Cookie",
    [`${COOKIE_SESSAO}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0", process.env.NODE_ENV === "production" ? "Secure" : ""]
      .filter(Boolean)
      .join("; "),
  );
  return resposta;
}
