import type { Metadata } from "next";
import { TelaVisaoGeral } from "@/components/telas/VisaoGeral";

export const metadata: Metadata = { title: "Visão geral" };

// Tela renderizada no navegador (ver layout do painel): fora da validação de navegação instantânea.
export const instant = false;

export default function Pagina() {
  return <TelaVisaoGeral />;
}
