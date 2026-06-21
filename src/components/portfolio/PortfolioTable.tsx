"use client"

import { PortfolioPosition } from "@/types"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Props {
  positions: PortfolioPosition[]
  loading?: boolean
}

export function PortfolioTable({ positions, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="animate-pulse p-8 text-center text-muted-foreground text-sm">
          Carregando cotações...
        </div>
      </div>
    )
  }

  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-border p-12 text-center text-muted-foreground text-sm">
        Nenhum ativo na carteira. Adicione um lançamento para começar.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground text-xs">
            <th className="text-left px-4 py-3 font-medium">Ativo</th>
            <th className="text-right px-4 py-3 font-medium">Qtd</th>
            <th className="text-right px-4 py-3 font-medium">P. Médio</th>
            <th className="text-right px-4 py-3 font-medium">Cotação</th>
            <th className="text-right px-4 py-3 font-medium">Var. Dia</th>
            <th className="text-right px-4 py-3 font-medium">Valor Total</th>
            <th className="text-right px-4 py-3 font-medium">P&L R$</th>
            <th className="text-right px-4 py-3 font-medium">P&L %</th>
            <th className="text-right px-4 py-3 font-medium">Aloc.</th>
            <th className="text-right px-4 py-3 font-medium">DY</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {positions.map((p) => {
            const isGain = p.gainLoss >= 0
            const isDayGain = (p.regularMarketChangePercent ?? 0) >= 0
            return (
              <tr key={p.ticker} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold">{p.ticker}</div>
                  {p.shortName && (
                    <div className="text-xs text-muted-foreground truncate max-w-32">{p.shortName}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{p.quantity.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(p.averagePrice)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(p.currentPrice)}</td>
                <td className={cn("px-4 py-3 text-right tabular-nums text-xs font-medium", isDayGain ? "text-green-500" : "text-red-500")}>
                  <span className="flex items-center justify-end gap-0.5">
                    {isDayGain ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {formatPercent(p.regularMarketChangePercent ?? 0)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(p.currentValue)}</td>
                <td className={cn("px-4 py-3 text-right tabular-nums font-medium", isGain ? "text-green-500" : "text-red-500")}>
                  {formatCurrency(p.gainLoss)}
                </td>
                <td className={cn("px-4 py-3 text-right tabular-nums font-medium", isGain ? "text-green-500" : "text-red-500")}>
                  {formatPercent(p.gainLossPercent)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {p.allocationPercent.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {p.dividendYield != null ? `${p.dividendYield.toFixed(2)}%` : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/stock/${p.ticker}`}>
                    <ExternalLink size={14} className="text-muted-foreground hover:text-foreground" />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
