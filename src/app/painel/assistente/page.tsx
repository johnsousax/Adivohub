import type { Metadata } from "next";
import { TelaAssistente } from "@/components/telas/Assistente";

export const metadata: Metadata = { title: "Assistente" };

// Tela renderizada no navegador (ver layout do painel): fora da validação de navegação instantânea.
export const instant = false;

export default function Pagina() {
  return <TelaAssistente />;
}
