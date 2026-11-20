import type { Metadata } from "next";
import { TelaClientes } from "@/components/telas/Clientes";

export const metadata: Metadata = { title: "Clientes" };

export default function Pagina() {
  return <TelaClientes />;
}
