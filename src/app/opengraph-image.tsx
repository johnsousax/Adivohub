import { ImageResponse } from "next/og";
import { MARCA } from "@/lib/marca";

export const alt = `${MARCA.nome} — gestão jurídica com inteligência artificial`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem que aparece quando o link do site é compartilhado (WhatsApp, redes sociais). */
export default function ImagemDeCompartilhamento() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 90px",
        background: "radial-gradient(circle at 78% 115%, rgba(201,164,92,0.42), rgba(201,164,92,0) 55%), #000000",
        color: "#ffffff",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: "#D9B774" }}>Gestão jurídica com inteligência artificial</div>
      <div style={{ display: "flex", marginTop: 18, fontSize: 168, fontWeight: 700, letterSpacing: -9, lineHeight: 1 }}>{MARCA.nome}</div>
      <div style={{ display: "flex", marginTop: 26, fontSize: 40, color: "#A1A1A6", maxWidth: 900, lineHeight: 1.25 }}>
        Casos, prazos, agenda e honorários em um só lugar, com IA que atende no WhatsApp.
      </div>
    </div>,
    size,
  );
}
