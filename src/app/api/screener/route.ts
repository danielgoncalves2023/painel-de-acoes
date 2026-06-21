import { NextResponse } from "next/server"
import YahooFinance from "yahoo-finance2"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet } from "@/lib/cache"
import { calcDyFromHistory } from "@/lib/calculations"

export const dynamic = "force-dynamic"

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  validation: { logErrors: false }
})
const TTL_QUOTES = 5 * 60 * 1000 // cotações em tempo real: 5 min

export async function GET() {
  try {
    // 1. Busca todos os fundamentos salvos localmente
    const fundamentals = await (prisma as any).stockFundamental.findMany()

    if (fundamentals.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const tickers = fundamentals.map((f: any) => f.ticker)
    const symbols = tickers.map((t: any) => `${t}.SA`)

    // 2. Busca cotações em tempo real (em lote) para todas as ações do banco
    const cacheKey = "screener:quotes:all"
    let rawQuotes = cacheGet<any[]>(cacheKey)

    if (!rawQuotes) {
      try {
        rawQuotes = await yf.quote(symbols)
        cacheSet(cacheKey, rawQuotes, TTL_QUOTES)
      } catch (err: any) {
        console.error("Erro ao buscar cotações em lote do Yahoo:", err.message)
        rawQuotes = []
      }
    }

    const quoteMap = new Map<string, any>(
      rawQuotes.map((q: any) => [q.symbol.replace(".SA", ""), q])
    )

    // 3. Cruza dados e reconstrói valuations atualizados na hora com o preço dinâmico
    const results = fundamentals.map((f: any) => {
      const q = quoteMap.get(f.ticker)
      const currentPrice = q?.regularMarketPrice || 0

      // Deserializa histórico de dividendos e recalcula o DY atualizado com o preço de agora
      let historyDividend: { date: string; amount: number }[] = []
      try {
        historyDividend = JSON.parse(f.historyDivRaw)
      } catch {
        historyDividend = []
      }

      const dyCalculated = calcDyFromHistory(historyDividend, currentPrice)
      const dyFallback = q
        ? ((q.trailingAnnualDividendYield != null && q.trailingAnnualDividendYield > 0)
            ? q.trailingAnnualDividendYield * 100
            : (q.dividendYield || 0))
        : 0
      const dy = dyCalculated != null && dyCalculated > 0 ? dyCalculated : dyFallback

      const pl = q?.trailingPE || 0
      const pvp = q?.priceToBook || 0
      const lpa = f.lpa
      const vpa = f.vpa

      let grahamValue = 0
      if (lpa > 0 && vpa > 0) grahamValue = Math.sqrt(22.5 * lpa * vpa)

      const proventosAnuais = (dy / 100) * currentPrice
      const bazinValue = proventosAnuais / 0.08
      const grahamMargin = grahamValue > 0 ? ((grahamValue - currentPrice) / grahamValue) * 100 : -100
      const bazinMargin = bazinValue > 0 ? ((bazinValue - currentPrice) / bazinValue) * 100 : -100

      return {
        ticker: f.ticker,
        name: f.name,
        currentPrice,
        dy,
        pl,
        pvp,
        lpa,
        vpa,
        roe: f.roe,
        margemLiquida: f.margemLiquida,
        payout: f.payout,
        grahamValue,
        grahamMargin,
        bazinValue,
        bazinMargin,
      }
    })

    return NextResponse.json({ results })
  } catch (err: any) {
    console.error("Screener API error:", err)
    return NextResponse.json({ error: "Failed to fetch screener data", details: err.message }, { status: 500 })
  }
}
