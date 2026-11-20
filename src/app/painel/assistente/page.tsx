import type { Metadata } from "next";
import { TelaAssistente } from "@/components/telas/Assistente";

export const metadata: Metadata = { title: "Assistente" };

export default function Pagina() {
  return <TelaAssistente />;
}
