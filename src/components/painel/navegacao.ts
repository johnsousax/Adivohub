import {
  AlarmClock,
  CalendarDays,
  LayoutDashboard,
  MessageCircle,
  Scale,
  Settings,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface ItemMenu {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Qual contador mostrar ao lado do item. */
  contador?: "prazos" | "atendimento";
}

export interface GrupoMenu {
  titulo?: string;
  itens: ItemMenu[];
}

export const MENU: GrupoMenu[] = [
  {
    itens: [
      { href: "/painel", rotulo: "Visão geral", icone: LayoutDashboard },
      { href: "/painel/casos", rotulo: "Casos", icone: Scale },
      { href: "/painel/prazos", rotulo: "Prazos", icone: AlarmClock, contador: "prazos" },
      { href: "/painel/agenda", rotulo: "Agenda", icone: CalendarDays },
      { href: "/painel/clientes", rotulo: "Clientes", icone: Users },
      { href: "/painel/financeiro", rotulo: "Financeiro", icone: Wallet },
    ],
  },
  {
    titulo: "Inteligência artificial",
    itens: [
      { href: "/painel/atendimento", rotulo: "Atendimento", icone: MessageCircle, contador: "atendimento" },
      { href: "/painel/assistente", rotulo: "Assistente", icone: Sparkles },
    ],
  },
  {
    titulo: "Escritório",
    itens: [{ href: "/painel/configuracoes", rotulo: "Configurações", icone: Settings }],
  },
];

export function itemAtivo(pathname: string, href: string): boolean {
  return href === "/painel" ? pathname === "/painel" : pathname === href || pathname.startsWith(`${href}/`);
}
