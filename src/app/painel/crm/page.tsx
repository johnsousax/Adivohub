import type { Metadata } from "next";
import { TelaCRM } from "@/components/telas/CRM";

export const metadata: Metadata = { title: "CRM" };

export default function Pagina() {
  return <TelaCRM />;
}
