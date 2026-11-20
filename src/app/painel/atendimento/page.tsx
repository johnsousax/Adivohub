import type { Metadata } from "next";
import { TelaAtendimento } from "@/components/telas/Atendimento";

export const metadata: Metadata = { title: "Atendimento" };

// Tela renderizada no navegador (ver layout do painel): fora da validação de navegação instantânea.
export const instant = false;

export default function Pagina() {
  return <TelaAtendimento />;
}
