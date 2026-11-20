import type { Metadata } from "next";
import { TelaCaso } from "@/components/telas/Caso";

export const metadata: Metadata = { title: "Caso" };

export default function Pagina() {
  return <TelaCaso />;
}
