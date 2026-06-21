"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  Briefcase,
  Calendar,
  Compass,
  Star,
  BarChart2,
  TrendingUp,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface Props {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

const links = [
  { href: "/screener", label: "Radar B3", icon: Compass },
  { href: "/portfolio", label: "Minha Carteira", icon: Briefcase },
  { href: "/simulador-renda", label: "Simulador de Renda", icon: TrendingUp },
  { href: "/proventos", label: "Calendário de Dividendos", icon: Calendar },
  { href: "/watchlist", label: "Favoritas", icon: Star },
  { href: "/compare", label: "Comparar", icon: BarChart2 },
]

export function Sidebar({ user }: Props) {
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

      <div className="px-3 py-3 border-t border-border space-y-1">
        <div className="flex items-center gap-2 px-3 py-2">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? ""}
              width={24}
              height={24}
              className="rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </aside>
  )
}
