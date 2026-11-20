import type { Metadata } from "next";
import {
  ChamadaFinal,
  Duvidas,
  InteligenciaArtificial,
  Lancamento,
  Planos,
  Problema,
  Recursos,
  Rodape,
  Seguranca,
  WhatsAppFlutuante,
} from "@/components/landing/Secoes";
import { Heroi, Navegacao } from "@/components/landing/Topo";
import { MARCA, PLANOS, URL_SITE } from "@/lib/marca";

export const metadata: Metadata = {
  title: { absolute: `${MARCA.nome} — gestão jurídica com inteligência artificial` },
  description: MARCA.descricao,
  alternates: { canonical: "/" },
};

/** Dados estruturados para buscadores: o produto e os planos. */
const dadosEstruturados = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: MARCA.nome,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: MARCA.descricao,
  url: URL_SITE,
  inLanguage: "pt-BR",
  offers: PLANOS.map((plano) => ({
    "@type": "Offer",
    name: `Plano ${plano.nome}`,
    price: plano.preco,
    priceCurrency: "BRL",
  })),
};

export default function PaginaInicial() {
  return (
    <>
      <Navegacao />
      <main>
        <Heroi />
        <Problema />
        <Recursos />
        <InteligenciaArtificial />
        <Seguranca />
        <Lancamento />
        <Duvidas />
        <Planos />
        <ChamadaFinal />
      </main>
      <Rodape />
      <WhatsAppFlutuante />
      <script
        type="application/ld+json"
        // Conteúdo estático gerado aqui mesmo; "<" é escapado por segurança.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados).replace(/</g, "\\u003c") }}
      />
    </>
  );
}
