import type { NextRequest } from "next/server";
import { configIA } from "@/lib/ia/config";
import { exigirSessao } from "@/lib/servidor/respostas";

export interface EstadoIntegracoes {
  ia: { conectada: boolean; modeloAssistente: string; modeloAtendimento: string };
  whatsapp: { conectado: boolean };
  pagamentos: { conectado: boolean };
  tribunais: { conectado: boolean };
  banco: { conectado: boolean };
}

/** Situação das integrações, para a tela de Configurações. Só para quem está logado. */
export async function GET(requisicao: NextRequest) {
  const sessao = await exigirSessao(requisicao);
  if (sessao instanceof Response) return sessao;

  const ia = configIA();
  const estado: EstadoIntegracoes = {
    ia: { conectada: ia.ativa, modeloAssistente: ia.modeloAssistente, modeloAtendimento: ia.modeloAtendimento },
    whatsapp: { conectado: Boolean(process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_APP_SECRET) },
    pagamentos: { conectado: false },
    tribunais: { conectado: false },
    banco: { conectado: false },
  };
  return Response.json(estado, { headers: { "Cache-Control": "no-store" } });
}
