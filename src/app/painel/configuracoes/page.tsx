import type { Metadata } from "next";
import { TelaConfiguracoes } from "@/components/telas/Configuracoes";

export const metadata: Metadata = { title: "Configurações" };

// Tela renderizada no navegador (ver layout do painel): fora da validação de navegação instantânea.
export const instant = false;

export default function Pagina() {
  return <TelaConfiguracoes />;
}
