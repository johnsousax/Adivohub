import type { Metadata } from "next";
import { TelaFinanceiro } from "@/components/telas/Financeiro";

export const metadata: Metadata = { title: "Financeiro" };

// Tela renderizada no navegador (ver layout do painel): fora da validação de navegação instantânea.
export const instant = false;

export default function Pagina() {
  return <TelaFinanceiro />;
}
