import type { Metadata } from "next";
import { TelaCliente } from "@/components/telas/Cliente";

export const metadata: Metadata = { title: "Cliente" };

export default function Pagina() {
  return <TelaCliente />;
}
