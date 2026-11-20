import type { Metadata } from "next";
import { TelaPrazos } from "@/components/telas/Prazos";

export const metadata: Metadata = { title: "Prazos" };

export default function Pagina() {
  return <TelaPrazos />;
}
