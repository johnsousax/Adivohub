import type { Metadata } from "next";
import { TelaClientes } from "@/components/telas/Clientes";

export const metadata: Metadata = { title: "Clientes" };

// Tela renderizada no navegador (ver layout do painel): fora da validação de navegação instantânea.
export const instant = false;

export default function Pagina() {
  return <TelaClientes />;
}
