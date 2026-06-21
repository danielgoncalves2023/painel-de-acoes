"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Briefcase,
  Calendar,
  Compass,
  Star,
  BarChart2,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { href: "/screener", label: "Radar B3", icon: Compass },
  { href: "/portfolio", label: "Minha Carteira", icon: Briefcase },
  { href: "/simulador-renda", label: "Simulador de Renda", icon: TrendingUp },
  { href: "/proventos", label: "Calendário de Dividendos", icon: Calendar },
  { href: "/watchlist", label: "Favoritas", icon: Star },
  { href: "/compare", label: "Comparar", icon: BarChart2 },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
      <div className="px-6 py-5 border-b border-border">
        <span className="font-bold text-lg tracking-tight">📈 Painel B3</span>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-border text-xs text-muted-foreground">
        Dados: brapi.dev
      </div>
    </aside>
  )
}
