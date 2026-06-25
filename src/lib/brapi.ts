import { Quote, QuoteWithModules, HistoricalPrice } from "@/types"
import { calcDyFromHistory } from "@/lib/calculations"
import YahooFinance from "yahoo-finance2"

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

const BASE = "https://brapi.dev/api"
const TOKEN = process.env.BRAPI_TOKEN ?? "demo"

async function get<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?"
  const res = await fetch(`${BASE}${path}${sep}token=${TOKEN}`, {
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`brapi error ${res.status}: ${path}`)
  return res.json()
}

export async function getQuote(ticker: string): Promise<Quote> {
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

  const [base, yfStats, yfDivs] = await Promise.allSettled([
    get<{ results: Quote[] }>(`/quote/${ticker}`),
    yahooFinance.quoteSummary(`${ticker}.SA`, { modules: ["summaryDetail"] }).catch(() => null),
    yahooFinance.chart(`${ticker}.SA`, { period1: threeYearsAgo, interval: "1mo" }).catch(() => null)
  ])

  const quote = base.status === "fulfilled" ? base.value.results[0] : ({} as Quote)
  const stats = yfStats.status === "fulfilled" ? yfStats.value?.summaryDetail : null
  const divs = yfDivs.status === "fulfilled" && yfDivs.value?.events?.dividends ? yfDivs.value.events.dividends : []

  const historyDividend = (divs as any[]).map((d: any) => ({
    date: typeof d.date === "object" ? d.date.toISOString() : new Date(d.date).toISOString(),
    amount: d.amount ?? 0
  }))

  const currentPrice = (quote as Quote).regularMarketPrice
  const dyFromHistory = calcDyFromHistory(historyDividend, currentPrice)

  return {
    ...quote,
    dividendYield: dyFromHistory ?? (stats?.dividendYield != null
      ? stats.dividendYield * 100
      : quote.dividendYield),
  }
}

export async function getQuoteWithModules(ticker: string): Promise<QuoteWithModules> {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const [base, profile, yfStats, yfDivs] = await Promise.allSettled([
    get<{ results: QuoteWithModules[] }>(`/quote/${ticker}`),
    get<{ results: QuoteWithModules[] }>(`/quote/${ticker}?modules=summaryProfile`),
    yahooFinance.quoteSummary(`${ticker}.SA`, { modules: ["summaryDetail", "defaultKeyStatistics", "financialData", "price"] }).catch(() => null),
    yahooFinance.chart(`${ticker}.SA`, { period1: threeYearsAgo, interval: "1mo" }).catch(() => null)
  ])

  const b = base.status === "fulfilled" ? base.value.results[0] : {}
  const p = profile.status === "fulfilled" ? profile.value.results[0] : {}
  const yf = yfStats.status === "fulfilled" ? yfStats.value : null
  const divs = yfDivs.status === "fulfilled" && yfDivs.value?.events?.dividends ? yfDivs.value.events.dividends : []

  const stats = yf?.summaryDetail
  const dks = yf?.defaultKeyStatistics
  const fd = yf?.financialData
  const priceModule = (yf as any)?.price

  const historyDividend = divs.map((d: any) => ({
    date: typeof d.date === "object" ? d.date.toISOString() : new Date(d.date).toISOString(),
    amount: d.amount ?? 0
  }))

  const currentPrice = (b as Quote).regularMarketPrice
  const dyFromHistory = calcDyFromHistory(historyDividend, currentPrice)

  const brapiBase = b as any

  // LPA: BRAPI retorna null para units — usa Yahoo trailingEps como fallback
  const earningsPerShare = brapiBase.earningsPerShare ?? dks?.trailingEps ?? null

  // P/L: BRAPI retorna null para units — usa trailingPE do Yahoo ou recalcula
  const priceEarnings = brapiBase.priceEarnings
    ?? (dks as any)?.trailingPE
    ?? (earningsPerShare && currentPrice && earningsPerShare > 0 ? currentPrice / earningsPerShare : null)

  return {
    ...b,
    earningsPerShare,
    priceEarnings,
    defaultKeyStatistics: {
      ...((b as QuoteWithModules).defaultKeyStatistics),
      ...dks,
      returnOnEquity: fd?.returnOnEquity ?? dks?.returnOnEquity,
      profitMargins: fd?.profitMargins ?? dks?.profitMargins,
      priceToBook: dks?.priceToBook,
      bookValue: dks?.bookValue,
      payoutRatio: stats?.payoutRatio,
    },
    summaryProfile: (p as QuoteWithModules).summaryProfile,
    // DY calculado a partir da soma real dos últimos 12 meses de histórico
    dividendYield: dyFromHistory ?? (stats?.dividendYield != null
      ? stats.dividendYield * 100
      : (b as QuoteWithModules).dividendYield),
    historyDividend,
    // marketCap: prefere BRAPI, fallback Yahoo price module (cobre units como TAEE11)
    marketCap: brapiBase.marketCap ?? priceModule?.marketCap ?? null,
    exDividendDate: stats?.exDividendDate
      ? (stats.exDividendDate instanceof Date
          ? stats.exDividendDate.toISOString().split("T")[0]
          : String(stats.exDividendDate).split("T")[0])
      : null,
  } as QuoteWithModules
}

export async function getQuotes(tickers: string[]): Promise<Quote[]> {
  if (tickers.length === 0) return []
  // Plano gratuito não suporta múltiplos tickers numa só chamada — busca em paralelo
  const results = await Promise.allSettled(tickers.map((t) => getQuote(t)))
  return results
    .filter((r): r is PromiseFulfilledResult<Quote> => r.status === "fulfilled")
    .map((r) => r.value)
}

export async function getHistorical(
  ticker: string,
  range: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y" = "1y"
): Promise<HistoricalPrice[]> {
  try {
    const now = new Date()
    let period1 = new Date()
    if (range === "1d") period1.setDate(now.getDate() - 1)
    else if (range === "5d") period1.setDate(now.getDate() - 5)
    else if (range === "1mo") period1.setMonth(now.getMonth() - 1)
    else if (range === "3mo") period1.setMonth(now.getMonth() - 3)
    else if (range === "6mo") period1.setMonth(now.getMonth() - 6)
    else if (range === "1y") period1.setFullYear(now.getFullYear() - 1)
    else if (range === "2y") period1.setFullYear(now.getFullYear() - 2)

    const cleanTicker = ticker.startsWith("^") ? ticker : `${ticker}.SA`
    const result = await yahooFinance.chart(cleanTicker, { period1, interval: "1d" })
    if (!result || !result.quotes) return []

    return result.quotes.map((q: any) => ({
      date: typeof q.date === "object" ? q.date.toISOString() : new Date(q.date).toISOString(),
      open: q.open ?? 0,
      high: q.high ?? 0,
      low: q.low ?? 0,
      close: q.close ?? 0,
      volume: q.volume ?? 0,
    }))
  } catch (err) {
    console.error("[getHistorical error]", err)
    return []
  }
}

export async function searchTickers(query: string): Promise<{ stock: string; name: string }[]> {
  const data = await get<{ stocks: { stock: string; name: string }[] }>(
    `/available?search=${encodeURIComponent(query)}`
  )
  return data.stocks ?? []
}
