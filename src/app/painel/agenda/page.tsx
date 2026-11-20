import type { Metadata } from "next";
import { TelaAgenda } from "@/components/telas/Agenda";

export const metadata: Metadata = { title: "Agenda" };

// Tela renderizada no navegador (ver layout do painel): fora da validação de navegação instantânea.
export const instant = false;

export default function Pagina() {
  return <TelaAgenda />;
}
