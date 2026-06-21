import { QuoteWithModules } from "@/types"

export interface ValuationResult {
  price: number
  grahamFairPrice: number | null
  grahamMargin: number | null
  bazinCeilingPrice: number | null
  bazinMargin: number | null
  avgDividend3y: number | null
}

export function calculateValuation(quote: QuoteWithModules): ValuationResult {
  const currentPrice = quote.regularMarketPrice

  // Graham
  const eps = quote.earningsPerShare // LPA
  const bvps = quote.defaultKeyStatistics?.bookValue // VPA
  let grahamFairPrice: number | null = null
  let grahamMargin: number | null = null

  if (eps && bvps && eps > 0 && bvps > 0) {
    grahamFairPrice = Math.sqrt(22.5 * eps * bvps)
    grahamMargin = ((grahamFairPrice - currentPrice) / currentPrice) * 100
  }

  // Bazin
  let avgDividend3y: number | null = null
  let bazinCeilingPrice: number | null = null
  let bazinMargin: number | null = null

  if (quote.historyDividend && quote.historyDividend.length > 0) {
    const now = new Date()
    const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate())
    
    // Filtra dividendos apenas dos últimos 3 anos exatos
    const recentDivs = quote.historyDividend.filter(d => {
      const dDate = new Date(d.date)
      return dDate >= threeYearsAgo && dDate <= now
    })

    if (recentDivs.length > 0) {
      const totalAmount = recentDivs.reduce((acc, d) => acc + d.amount, 0)
      
      // Como o filtro 'recentDivs' cobre exatamente um intervalo de 3 anos (36 meses),
      // dividimos a soma total dos proventos por 3 para obter a média anual correta.
      const divisor = 3
      avgDividend3y = totalAmount / divisor

      // Preço Teto Bazin com 8%
      bazinCeilingPrice = avgDividend3y / 0.08
      bazinMargin = ((bazinCeilingPrice - currentPrice) / currentPrice) * 100
    }
  }

  return {
    price: currentPrice,
    grahamFairPrice,
    grahamMargin,
    bazinCeilingPrice,
    bazinMargin,
    avgDividend3y,
  }
}
