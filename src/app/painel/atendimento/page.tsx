import type { Metadata } from "next";
import { TelaAtendimento } from "@/components/telas/Atendimento";

export const metadata: Metadata = { title: "Atendimento" };

export default function Pagina() {
  return <TelaAtendimento />;
}
