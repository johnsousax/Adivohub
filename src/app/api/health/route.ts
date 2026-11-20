import { connection } from "next/server";

/** Verificação de disponibilidade (monitoramento/uptime). Não expõe configuração. */
export async function GET() {
  await connection();
  return Response.json({ status: "ok", servico: "vade", horario: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
