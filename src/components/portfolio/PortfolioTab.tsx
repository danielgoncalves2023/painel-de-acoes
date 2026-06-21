"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Transaction, PortfolioPosition } from "@/types"
import { calcPositions, calcPortfolioSummary, formatCurrency, formatPercent } from "@/lib/calculations"
import { PortfolioTable } from "@/components/portfolio/PortfolioTable"
import { AddTransactionDialog } from "@/components/portfolio/AddTransactionDialog"
import { PortfolioHistoryCharts } from "@/components/portfolio/PortfolioHistoryCharts"
import { AllocationPieChart } from "@/components/dashboard/AllocationPieChart"
import { calcOpportunityScore } from "@/lib/scoring"
import { TrendingUp, TrendingDown, Wallet, BarChart2, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

export function PortfolioTab() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [quotesOk, setQuotesOk] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const txRes = await fetch("/api/transactions")
      if (!txRes.ok) { setPositions([]); return }
      const txData = await txRes.json()
      const transactions: Transaction[] = Array.isArray(txData) ? txData : []
      if (transactions.length === 0) {
        setPositions([])
        return
      }
      const tickers = [...new Set(transactions.map((t) => t.ticker))]
      const qRes = await fetch(`/api/quotes/${tickers.join(",")}`)
      const quotes = await qRes.json()
      setQuotesOk(Array.isArray(quotes) && quotes.length > 0)
      setPositions(calcPositions(transactions, Array.isArray(quotes) ? quotes : []))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const summary = calcPortfolioSummary(positions)
  
  const dayChange = positions.reduce((s, p) => {
    const prev = p.currentPrice / (1 + (p.regularMarketChangePercent ?? 0) / 100)
    return s + (p.currentPrice - prev) * p.quantity
  }, 0)
  
  const isGain = summary.gainLoss >= 0
  const isDayGain = dayChange >= 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Sua Carteira de Ativos</h2>
        <AddTransactionDialog onSuccess={load} />
      </div>

      {!quotesOk && positions.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400 flex items-center gap-2">
          <span>⚠️</span>
          <span>
            Cotações indisponíveis com o token <code className="font-mono bg-yellow-500/20 px-1 rounded">demo</code>.
            Cadastre-se em <strong>brapi.dev</strong>, copie seu token e adicione em{" "}
            <code className="font-mono bg-yellow-500/20 px-1 rounded">.env</code>:{" "}
            <code className="font-mono bg-yellow-500/20 px-1 rounded">BRAPI_TOKEN=seu_token</code>
          </span>
        </div>
      )}

      {/* Summary Cards */}
      {positions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Patrimônio Total"
            value={formatCurrency(summary.totalValue)}
            sub={`Investido: ${formatCurrency(summary.totalCost)}`}
            icon={<Wallet size={18} />}
          />
          <SummaryCard
            title="Ganho / Perda Total"
            value={formatCurrency(summary.gainLoss)}
            sub={formatPercent(summary.gainLossPercent)}
            positive={isGain}
            icon={isGain ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          />
          <SummaryCard
            title="Variação Hoje"
            value={formatCurrency(dayChange)}
            sub={positions.length > 0 ? `${positions.length} ativos monitorados` : "—"}
            positive={isDayGain}
            icon={isDayGain ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          />
          <SummaryCard
            title="Ativos na Carteira"
            value={String(positions.length)}
            sub="posições abertas"
            icon={<BarChart2 size={18} />}
          />
        </div>
      )}

      {/* Gráficos lado a lado */}
      {positions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PortfolioHistoryCharts />
          </div>
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base flex items-center gap-1.5 text-foreground">
                <BarChart2 size={18} className="text-primary" /> Alocação da Carteira
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Divisão proporcional do patrimônio por ativo</p>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {loading ? (
                <div className="text-muted-foreground text-sm">Carregando...</div>
              ) : (
                <AllocationPieChart positions={positions} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Oportunidades da Carteira */}
      {positions.length > 0 && (() => {
        const ranked = positions
          .map(p => ({
            ...p,
            score: calcOpportunityScore({
              dy: p.dividendYield,
              pl: p.priceEarnings,
            })
          }))
          .filter(p => p.score.label !== "Sem dados")
          .sort((a, b) => b.score.total - a.score.total)
          .slice(0, 3)

        if (ranked.length === 0) return null

        return (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-yellow-400" />
              <h2 className="font-semibold text-sm">Oportunidades para Aumentar Posição</h2>
              <span className="text-xs text-muted-foreground ml-auto">Score baseado em DY · P/L · P/VP · ROE · Graham</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ranked.map((p) => (
                <Link key={p.ticker} href={`/stock/${p.ticker}`} className="rounded-lg border border-border bg-muted/20 p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold">{p.ticker}</div>
                      {p.shortName && <div className="text-xs text-muted-foreground truncate max-w-28">{p.shortName}</div>}
                    </div>
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", {
                      "border-green-400/40 bg-green-400/10 text-green-400": p.score.total >= 8,
                      "border-green-600/40 bg-green-600/10 text-green-600": p.score.total >= 6 && p.score.total < 8,
                      "border-yellow-500/40 bg-yellow-500/10 text-yellow-500": p.score.total < 6,
                    })}>
                      {p.score.total.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-lg font-bold">{formatCurrency(p.currentPrice)}</div>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {p.dividendYield != null && <span>DY {p.dividendYield.toFixed(1)}%</span>}
                    {p.priceEarnings != null && <span>P/L {p.priceEarnings.toFixed(1)}</span>}
                  </div>
                  <div className={cn("text-xs font-medium mt-1", p.gainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                    {formatPercent(p.gainLossPercent)} {p.gainLoss >= 0 ? "ganho" : "perda"} acumulada
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })()}

      <PortfolioTable positions={positions} loading={loading} />
    </div>
  )
}

function SummaryCard({
  title, value, sub, icon, positive,
}: {
  title: string
  value: string
  sub?: string
  icon?: React.ReactNode
  positive?: boolean
}) {
  const hasColor = positive !== undefined
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</span>
        <span className={cn("text-muted-foreground", hasColor && (positive ? "text-green-500" : "text-red-500"))}>
          {icon}
        </span>
      </div>
      <div className={cn("text-2xl font-bold", hasColor && (positive ? "text-green-500" : "text-red-500"))}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  )
}
