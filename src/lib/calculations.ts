import { Transaction, PortfolioPosition, Quote } from "@/types"

export function calcWeightedDY(positions: PortfolioPosition[]): number {
  const totalValue = positions.reduce((s, p) => s + p.currentValue, 0)
  if (totalValue <= 0) return 0
  return positions.reduce((sum, p) => {
    const dy = p.dividendYield ?? 0
    return sum + (dy * p.currentValue / totalValue)
  }, 0)
}

export function calcDyFromHistory(
  historyDividend: { date: string; amount: number }[] | undefined,
  currentPrice: number | undefined
): number | null {
  if (!historyDividend?.length || !currentPrice || currentPrice <= 0) return null

  const now = new Date()
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate())

  // Soma dos pagamentos dos últimos 12 meses
  const last12m = historyDividend.filter(d => new Date(d.date) >= oneYearAgo)
  const sum12m = last12m.reduce((acc, d) => acc + d.amount, 0)

  // Se tem pagamentos suficientes nos últimos 12 meses, usa diretamente
  if (last12m.length >= 2 && sum12m > 0) {
    return (sum12m / currentPrice) * 100
  }

  // Fallback: média anual dos últimos 3 anos (mais estável quando o Yahoo não tem histórico completo de 12m)
  const recent3y = historyDividend.filter(d => new Date(d.date) >= threeYearsAgo)
  if (recent3y.length === 0) return sum12m > 0 ? (sum12m / currentPrice) * 100 : null

  const byYear: Record<number, number> = {}
  for (const d of recent3y) {
    const yr = new Date(d.date).getFullYear()
    byYear[yr] = (byYear[yr] || 0) + d.amount
  }
  const years = Object.keys(byYear)
  if (years.length === 0) return null

  const totalAmount = Object.values(byYear).reduce((s, v) => s + v, 0)
  const avgAnnual = totalAmount / Math.max(years.length, 1)

  return (avgAnnual / currentPrice) * 100
}

export function calcPositions(
  transactions: Transaction[],
  quotes: Quote[]
): PortfolioPosition[] {
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]))

  const grouped = new Map<string, Transaction[]>()
  for (const t of transactions) {
    if (!grouped.has(t.ticker)) grouped.set(t.ticker, [])
    grouped.get(t.ticker)!.push(t)
  }

  const positions: PortfolioPosition[] = []
  let totalValue = 0

  for (const [ticker, txs] of grouped) {
    let quantity = 0
    let totalCost = 0

    for (const t of txs) {
      if (t.type === "BUY") {
        totalCost += t.quantity * t.price + t.brokerage
        quantity += t.quantity
      } else {
        // SELL: reduz custo proporcionalmente
        const avgCost = quantity > 0 ? totalCost / quantity : 0
        totalCost -= t.quantity * avgCost
        quantity -= t.quantity
      }
    }

    if (quantity <= 0) continue

    const quote = quoteMap.get(ticker)
    const averagePrice = totalCost / quantity
    // Se não há cotação, usa custo médio como preço atual (sem ganho/perda)
    const currentPrice = quote?.regularMarketPrice ?? averagePrice
    const currentValue = quantity * currentPrice
    const gainLoss = quote ? currentValue - totalCost : 0
    const gainLossPercent = quote && totalCost > 0 ? (gainLoss / totalCost) * 100 : 0

    totalValue += currentValue

    positions.push({
      ticker,
      quantity,
      averagePrice,
      totalCost,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPercent,
      allocationPercent: 0,
      dividendYield: quote?.dividendYield,
      priceEarnings: quote?.priceEarnings,
      shortName: quote?.shortName,
      regularMarketChangePercent: quote?.regularMarketChangePercent,
    })
  }

  // calcular alocação depois de ter totalValue
  for (const p of positions) {
    p.allocationPercent = totalValue > 0 ? (p.currentValue / totalValue) * 100 : 0
  }

  return positions.sort((a, b) => b.currentValue - a.currentValue)
}

export function calcPortfolioSummary(positions: PortfolioPosition[]) {
  const totalCost = positions.reduce((s, p) => s + p.totalCost, 0)
  const totalValue = positions.reduce((s, p) => s + p.currentValue, 0)
  const gainLoss = totalValue - totalCost
  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0

  return { totalCost, totalValue, gainLoss, gainLossPercent }
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null || isNaN(value)) return "—"
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function formatPercent(value: number, decimals = 2) {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(decimals)}%`
}
