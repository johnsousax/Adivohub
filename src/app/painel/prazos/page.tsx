import type { Metadata } from "next";
import { TelaPrazos } from "@/components/telas/Prazos";

export const metadata: Metadata = { title: "Prazos" };

// Tela renderizada no navegador (ver layout do painel): fora da validação de navegação instantânea.
export const instant = false;

export default function Pagina() {
  return <TelaPrazos />;
}
