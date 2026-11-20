import type { Metadata } from "next";
import { TelaCasos } from "@/components/telas/Casos";

export const metadata: Metadata = { title: "Casos" };

// Tela renderizada no navegador (ver layout do painel): fora da validação de navegação instantânea.
export const instant = false;

export default function Pagina() {
  return <TelaCasos />;
}
