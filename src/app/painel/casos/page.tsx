import type { Metadata } from "next";
import { TelaCasos } from "@/components/telas/Casos";

export const metadata: Metadata = { title: "Casos" };

export default function Pagina() {
  return <TelaCasos />;
}
