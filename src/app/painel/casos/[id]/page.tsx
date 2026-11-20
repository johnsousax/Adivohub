import type { Metadata } from "next";
import { TelaCaso } from "@/components/telas/Caso";

export const metadata: Metadata = { title: "Caso" };

// Tela renderizada no navegador (ver layout do painel): fora da validação de navegação instantânea.
export const instant = false;

export default function Pagina() {
  return <TelaCaso />;
}
