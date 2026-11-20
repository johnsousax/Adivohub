import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/opsz.css";
import "./globals.css";
import { MARCA, URL_SITE } from "@/lib/marca";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: {
    default: `${MARCA.nome} — gestão jurídica com inteligência artificial`,
    template: `%s · ${MARCA.nome}`,
  },
  description: MARCA.descricao,
  applicationName: MARCA.nome,
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: MARCA.nome,
    title: `${MARCA.nome} — gestão jurídica com inteligência artificial`,
    description: MARCA.descricao,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
