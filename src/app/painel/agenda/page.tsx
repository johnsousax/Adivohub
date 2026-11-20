import type { Metadata } from "next";
import { TelaAgenda } from "@/components/telas/Agenda";

export const metadata: Metadata = { title: "Agenda" };

export default function Pagina() {
  return <TelaAgenda />;
}
