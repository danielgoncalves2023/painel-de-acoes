import { QuoteWithModules } from "@/types"

export interface GrahamBazinResult {
  grahamFairPrice: number | null
  grahamMargin: number | null
  bazinCeilingPrice: number | null
  bazinMargin: number | null
  avgDividend3y: number | null
}

/**
 * Calcula Graham e Bazin a partir de dados brutos.
 * Fonte única de verdade usada tanto na tela de detalhes quanto no Screener.
 *
 * Margem = (valorJusto - precoAtual) / precoAtual × 100
 * Divisor Bazin = número real de anos com pagamento (não fixo em 3).
 */
export function calcGrahamBazin(
  lpa: number,
  vpa: number,
  historyDividend: { date: string; amount: number }[],
  currentPrice: number
): GrahamBazinResult {
  // Graham
  let grahamFairPrice: number | null = null
  let grahamMargin: number | null = null
  if (lpa > 0 && vpa > 0 && currentPrice > 0) {
    grahamFairPrice = Math.sqrt(22.5 * lpa * vpa)
    grahamMargin = ((grahamFairPrice - currentPrice) / currentPrice) * 100
  }

  // Bazin — média anual dos últimos 3 anos pelo número real de anos com pagamento
  let avgDividend3y: number | null = null
  let bazinCeilingPrice: number | null = null
  let bazinMargin: number | null = null

  if (historyDividend.length > 0 && currentPrice > 0) {
    const now = new Date()
    const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate())

    const recentDivs = historyDividend.filter(d => {
      const dDate = new Date(d.date)
      return dDate >= threeYearsAgo && dDate <= now
    })

    if (recentDivs.length > 0) {
      const byYear: Record<number, number> = {}
      for (const d of recentDivs) {
        const yr = new Date(d.date).getFullYear()
        byYear[yr] = (byYear[yr] || 0) + d.amount
      }
      const years = Object.keys(byYear)
      const totalAmount = Object.values(byYear).reduce((s, v) => s + v, 0)
      avgDividend3y = totalAmount / Math.max(years.length, 1)
      bazinCeilingPrice = avgDividend3y / 0.08
      bazinMargin = ((bazinCeilingPrice - currentPrice) / currentPrice) * 100
    }
  }

  return { grahamFairPrice, grahamMargin, bazinCeilingPrice, bazinMargin, avgDividend3y }
}

export interface ValuationResult extends GrahamBazinResult {
  price: number
}

export function calculateValuation(quote: QuoteWithModules): ValuationResult {
  const currentPrice = quote.regularMarketPrice
  const lpa = quote.earningsPerShare ?? 0
  const vpa = quote.defaultKeyStatistics?.bookValue ?? 0

  const result = calcGrahamBazin(lpa, vpa, quote.historyDividend ?? [], currentPrice)

  return { price: currentPrice, ...result }
}
