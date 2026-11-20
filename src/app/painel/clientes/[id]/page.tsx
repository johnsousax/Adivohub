import type { Metadata } from "next";
import { TelaCliente } from "@/components/telas/Cliente";

export const metadata: Metadata = { title: "Cliente" };

// Tela renderizada no navegador (ver layout do painel): fora da validação de navegação instantânea.
export const instant = false;

export default function Pagina() {
  return <TelaCliente />;
}
