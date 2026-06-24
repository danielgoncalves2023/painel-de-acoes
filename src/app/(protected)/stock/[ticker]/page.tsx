"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import { QuoteWithModules, Transaction, PortfolioPosition } from "@/types"
import { calculateValuation } from "@/lib/valuation"
import { ValuationCards } from "@/components/stock/ValuationCards"
import { PriceChart } from "@/components/stock/PriceChart"
import { FundamentalsGrid } from "@/components/stock/FundamentalsGrid"
import { AddTransactionDialog } from "@/components/portfolio/AddTransactionDialog"
import { calcPositions, formatCurrency, formatPercent } from "@/lib/calculations"
import { calcOpportunityScore } from "@/lib/scoring"
import { DividendAnalysis } from "@/components/stock/DividendAnalysis"
import { TrendingUp, TrendingDown, ArrowLeft, Star } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params)
  const upperTicker = ticker.toUpperCase()
  const [quote, setQuote] = useState<QuoteWithModules | null>(null)
  const [position, setPosition] = useState<PortfolioPosition | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFavorited, setIsFavorited] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [detailsRes, quoteRes, txRes, watchlistRes] = await Promise.all([
        fetch(`/api/quotes/${upperTicker}/details`),
        fetch(`/api/quotes/${upperTicker}`),
        fetch("/api/transactions"),
        fetch("/api/watchlist"),
      ])
      const details: QuoteWithModules = await detailsRes.json()
      const quoteBase = await quoteRes.json()
      const transactions: Transaction[] = await txRes.json()
      const watchlistData = await watchlistRes.json()
      
      // Preços ao vivo do quoteBase + módulos (indicadores/fundamentos) do details
      const base = Array.isArray(quoteBase) ? quoteBase[0] : {}
      const merged: QuoteWithModules = { ...details, ...base, summaryProfile: details.summaryProfile, defaultKeyStatistics: details.defaultKeyStatistics, historyDividend: details.historyDividend, dividendYield: details.dividendYield }
      setQuote(merged)

      const tickerTxs = transactions.filter((t) => t.ticker === upperTicker)
      if (tickerTxs.length > 0) {
        const positions = calcPositions(tickerTxs, [details])
        setPosition(positions[0] ?? null)
      }

      const isFav = Array.isArray(watchlistData) && watchlistData.some((w: any) => w.ticker === upperTicker)
      setIsFavorited(isFav)
      
      setLoading(false)
    }
    load()
  }, [upperTicker])

  async function toggleFavorite() {
    if (toggling) return
    setToggling(true)
    try {
      if (isFavorited) {
        const res = await fetch("/api/watchlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: upperTicker }),
        })
        if (res.ok) {
          setIsFavorited(false)
        }
      } else {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: upperTicker }),
        })
        if (res.ok) {
          setIsFavorited(true)
        }
      }
    } catch (e) {
      console.error("Erro ao favoritar:", e)
    } finally {
      setToggling(false)
    }
  }

  const isPos = (quote?.regularMarketChangePercent ?? 0) >= 0

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/portfolio" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Voltar
      </Link>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Carregando dados de {upperTicker}...</div>
      ) : !quote ? (
        <div className="text-center py-16 text-muted-foreground">Ação não encontrada.</div>
      ) : (
        <>
          {/* Header */}
          {(() => {
            const valuation = calculateValuation(quote)
            const score = calcOpportunityScore({
              dy: quote.dividendYield,
              pl: quote.priceEarnings,
              pvp: quote.defaultKeyStatistics?.priceToBook,
              roe: quote.defaultKeyStatistics?.returnOnEquity,
              margemLiquida: quote.defaultKeyStatistics?.profitMargins,
              grahamMargin: valuation.grahamMargin ?? undefined,
            })
            return (
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold">{upperTicker}</h1>
                    <button
                      onClick={toggleFavorite}
                      disabled={toggling}
                      className={cn(
                        "p-1.5 rounded-lg border transition-colors flex items-center justify-center hover:bg-muted/80",
                        isFavorited
                          ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-500 hover:text-yellow-600"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                      title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    >
                      <Star size={18} className={isFavorited ? "fill-yellow-500 text-yellow-500" : ""} />
                    </button>
                    {score.label !== "Sem dados" && (
                      <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold", {
                        "border-green-400/40 bg-green-400/10 text-green-400": score.total >= 8,
                        "border-green-600/40 bg-green-600/10 text-green-600": score.total >= 6 && score.total < 8,
                        "border-yellow-500/40 bg-yellow-500/10 text-yellow-500": score.total >= 4 && score.total < 6,
                        "border-red-500/40 bg-red-500/10 text-red-500": score.total < 4,
                      })}>
                        <span className="text-base leading-none">◆</span>
                        Score {score.total.toFixed(1)} — {score.label}
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground text-sm mt-0.5">
                    {quote.longName ?? quote.shortName}
                    {quote.summaryProfile?.sector && (
                      <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">{quote.summaryProfile.sector}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{formatCurrency(quote.regularMarketPrice)}</div>
                  <div className={cn("flex items-center justify-end gap-1 text-sm font-medium mt-0.5", isPos ? "text-green-500" : "text-red-500")}>
                    {isPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {quote.regularMarketChange != null ? formatCurrency(quote.regularMarketChange) : ""} ({formatPercent(quote.regularMarketChangePercent ?? 0)}) hoje
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Mín: {formatCurrency(quote.regularMarketDayLow)} · Máx: {formatCurrency(quote.regularMarketDayHigh)}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Valuation Inteligente */}
          <ValuationCards valuation={calculateValuation(quote)} />

          {/* Minha posição */}
          {position && (
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-sm">Minha Posição</h2>
                <AddTransactionDialog onSuccess={() => {}} defaultTicker={upperTicker} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Quantidade</div>
                  <div className="font-semibold">{position.quantity.toLocaleString("pt-BR")} ações</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Preço Médio</div>
                  <div className="font-semibold">{formatCurrency(position.averagePrice)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Valor Atual</div>
                  <div className="font-semibold">{formatCurrency(position.currentValue)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Ganho / Perda</div>
                  <div className={cn("font-semibold", position.gainLoss >= 0 ? "text-green-500" : "text-red-500")}>
                    {formatCurrency(position.gainLoss)} ({formatPercent(position.gainLossPercent)})
                  </div>
                </div>
              </div>
            </div>
          )}

          {!position && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Você não possui este ativo.</span>
              <AddTransactionDialog onSuccess={() => {}} defaultTicker={upperTicker} />
            </div>
          )}

          {/* Gráfico */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4">Histórico de Preço</h2>
            <PriceChart ticker={upperTicker} />
          </div>

          {/* Indicadores */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4">Indicadores Fundamentalistas</h2>
            <FundamentalsGrid data={quote} />
          </div>

          {/* Análise de Dividendos */}
          <DividendAnalysis quote={quote} />

          {/* Histórico de Dividendos */}
          {quote.historyDividend && quote.historyDividend.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold text-sm mb-4">Histórico de Dividendos</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-xs border-b border-border">
                      <th className="text-left pb-2 font-medium">Data</th>
                      <th className="text-right pb-2 font-medium">Valor por Ação</th>
                      {position && <th className="text-right pb-2 font-medium">Total recebido (est.)</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...quote.historyDividend].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20).map((d, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="py-2 text-muted-foreground">
                          {new Date(d.date).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(d.amount)}</td>
                        {position && (
                          <td className="py-2 text-right tabular-nums text-green-500">
                            {formatCurrency(d.amount * position.quantity)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sobre */}
          {quote.summaryProfile?.longBusinessSummary && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold text-sm mb-3">Sobre a Empresa</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{quote.summaryProfile.longBusinessSummary}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
