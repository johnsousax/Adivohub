import type { Metadata } from "next";
import { TelaFinanceiro } from "@/components/telas/Financeiro";

export const metadata: Metadata = { title: "Financeiro" };

export default function Pagina() {
  return <TelaFinanceiro />;
}
