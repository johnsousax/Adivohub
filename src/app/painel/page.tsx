import type { Metadata } from "next";
import { TelaVisaoGeral } from "@/components/telas/VisaoGeral";

export const metadata: Metadata = { title: "Visão geral" };

export default function Pagina() {
  return <TelaVisaoGeral />;
}
