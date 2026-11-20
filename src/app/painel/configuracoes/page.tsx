import type { Metadata } from "next";
import { TelaConfiguracoes } from "@/components/telas/Configuracoes";

export const metadata: Metadata = { title: "Configurações" };

export default function Pagina() {
  return <TelaConfiguracoes />;
}
