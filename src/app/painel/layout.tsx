import type { Metadata } from "next";
import { Suspense } from "react";
import { EsqueletoPainel } from "@/components/painel/Esqueleto";
import { Painel } from "@/components/painel/Painel";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Vade" },
  robots: { index: false, follow: false },
};

/**
 * O painel é renderizado só no navegador (os dados ainda vivem no localStorage),
 * então a navegação para ele mostra primeiro o esqueleto.
 */
export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return (
    <Suspense fallback={<EsqueletoPainel />}>
      <Painel>{children}</Painel>
    </Suspense>
  );
}
