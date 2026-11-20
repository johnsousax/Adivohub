import { connection } from "next/server";
import { LEGAL, MARCA, URL_SITE } from "@/lib/marca";

/**
 * security.txt (RFC 9116): diz a quem encontrar uma falha de segurança como avisar.
 * A data de validade é renovada a cada resposta, como pede a norma (menos de um ano).
 */
export async function GET() {
  await connection();
  const validade = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");
  const contato = LEGAL.emailPrivacidade ? `mailto:${LEGAL.emailPrivacidade}` : `https://wa.me/${MARCA.whatsapp.e164}`;
  const linhas = [
    `Contact: ${contato}`,
    `Expires: ${validade}`,
    "Preferred-Languages: pt, en",
    `Canonical: ${URL_SITE}/.well-known/security.txt`,
    `Policy: ${URL_SITE}/privacidade#seguranca`,
  ];
  return new Response(`${linhas.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
