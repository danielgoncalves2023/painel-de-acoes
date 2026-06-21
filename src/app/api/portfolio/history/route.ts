import { NextResponse } from "next/server"
import YahooFinance from "yahoo-finance2"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet } from "@/lib/cache"

export const dynamic = "force-dynamic"

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  validation: { logErrors: false }
})

interface PricePoint {
  date: Date
  close: number
}

interface DivPoint {
  date: Date
  amount: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "month" // "week" | "month" | "year"

    // 1. Busca todas as transações da carteira no banco
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: "asc" },
    })

    if (transactions.length === 0) {
      return NextResponse.json({ history: [], summary: { totalAporte: 0, totalDividendos: 0, rentabilidade: 0 } })
    }

    const tickers = [...new Set(transactions.map((t) => t.ticker))]

    // 2. Define os pontos e limites no tempo
    const now = new Date()
    const points: { label: string; startDate: Date; endDate: Date }[] = []

    if (period === "week") {
      // Últimas 12 semanas
      for (let i = 11; i >= 0; i--) {
        const endDate = new Date(now)
        endDate.setDate(now.getDate() - i * 7)
        endDate.setHours(23, 59, 59, 999)

        const startDate = new Date(endDate)
        startDate.setDate(endDate.getDate() - 6)
        startDate.setHours(0, 0, 0, 0)

        points.push({
          label: `Semana ${12 - i}`,
          startDate,
          endDate,
        })
      }
    } else if (period === "year") {
      // Últimos 5 anos
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i
        const startDate = new Date(year, 0, 1, 0, 0, 0, 0)
        const endDate = new Date(year, 11, 31, 23, 59, 59, 999)

        points.push({
          label: String(year),
          startDate,
          endDate,
        })
      }
    } else {
      // Padrão: últimos 12 meses
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const startDate = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
        const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)

        const label = endDate.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
        points.push({
          label,
          startDate,
          endDate,
        })
      }
    }

    // 3. Busca histórico de fechamentos e dividendos dos ativos
    const pricesMap = new Map<string, PricePoint[]>()
    const dividendsMap = new Map<string, DivPoint[]>()

    const queryStart = new Date(points[0].startDate)
    queryStart.setMonth(queryStart.getMonth() - 2) // Folga de 2 meses para ter dados iniciais

    await Promise.all(
      tickers.map(async (ticker) => {
        // A. Busca histórico de preços (com cache)
        const cacheKey = `history:prices:${ticker}:${period}`
        let priceHistory = cacheGet<PricePoint[]>(cacheKey)

        if (!priceHistory) {
          try {
            const result = await yf.chart(`${ticker}.SA`, {
              period1: queryStart,
              interval: period === "week" ? "1wk" : "1mo",
            })

            priceHistory = (result.quotes || [])
              .map((q: any) => ({
                date: new Date(q.date),
                close: q.close ?? q.adjclose ?? 0,
              }))
              .filter((q) => q.close > 0)

            cacheSet(cacheKey, priceHistory, 1 * 60 * 60 * 1000) // Cache por 1 hora
          } catch (err: any) {
            console.error(`Erro ao buscar histórico de preços de ${ticker}:`, err.message)
            priceHistory = []
          }
        }
        pricesMap.set(ticker, priceHistory)

        // B. Busca dividendos históricos salvos no banco local
        const fund = await (prisma as any).stockFundamental.findUnique({
          where: { ticker },
        })

        let divList: DivPoint[] = []
        if (fund && fund.historyDivRaw) {
          try {
            const parsed = JSON.parse(fund.historyDivRaw)
            divList = parsed.map((d: any) => ({
              date: new Date(d.date),
              amount: d.amount,
            }))
          } catch {
            divList = []
          }
        }
        dividendsMap.set(ticker, divList)
      })
    )

    // 4. Calcula a evolução histórica nos pontos do tempo
    const history = points.map((p) => {
      let totalPatrimonio = 0
      let totalAportePeriodo = 0
      let totalDividendosPeriodo = 0

      for (const ticker of tickers) {
        // Aportes no período atual (Compras - Vendas)
        const txsInPeriod = transactions.filter(
          (t) => t.ticker === ticker && new Date(t.date) >= p.startDate && new Date(t.date) <= p.endDate
        )
        const aporteAsset = txsInPeriod.reduce((acc, t) => {
          const value = t.quantity * t.price
          return t.type === "BUY" ? acc + value : acc - value
        }, 0)
        totalAportePeriodo += aporteAsset

        // Quantidade total acumulada até o final deste período
        const txsUntilEnd = transactions.filter(
          (t) => t.ticker === ticker && new Date(t.date) <= p.endDate
        )
        const quantityAtEnd = txsUntilEnd.reduce((acc, t) => {
          return t.type === "BUY" ? acc + t.quantity : acc - t.quantity
        }, 0)

        // Valor de mercado do ativo ao final do período (patrimônio)
        if (quantityAtEnd > 0) {
          const priceHistory = pricesMap.get(ticker) || []
          const pastPrices = priceHistory.filter((ph) => ph.date <= p.endDate)
          
          let priceAtEnd = 0
          if (pastPrices.length > 0) {
            // Ordena cronologicamente e pega o fechamento mais próximo do final do período
            pastPrices.sort((a, b) => b.date.getTime() - a.date.getTime())
            priceAtEnd = pastPrices[0].close
          } else {
            priceAtEnd = priceHistory[0]?.close || 0
          }

          totalPatrimonio += quantityAtEnd * priceAtEnd
        }

        // Dividendos recebidos no período
        const divs = dividendsMap.get(ticker) || []
        const divsInPeriod = divs.filter(
          (d) => d.date >= p.startDate && d.date <= p.endDate
        )

        for (const d of divsInPeriod) {
          const exDate = new Date(d.date)
          exDate.setUTCHours(0, 0, 0, 0)

          // Quantidade de ações que o investidor tinha na Data Ex do provento (apenas movimentações anteriores à Data Ex)
          const qtyOnExDate = transactions
            .filter((t) => {
              const txDate = new Date(t.date)
              txDate.setUTCHours(0, 0, 0, 0)
              return t.ticker === ticker && txDate < exDate
            })
            .reduce((sum, t) => {
              return t.type === "BUY" ? sum + t.quantity : sum - t.quantity
            }, 0)

          if (qtyOnExDate > 0) {
            totalDividendosPeriodo += qtyOnExDate * d.amount
          }
        }
      }

      return {
        label: p.label,
        patrimonio: Math.round(totalPatrimonio * 100) / 100,
        aporte: Math.round(totalAportePeriodo * 100) / 100,
        dividendos: Math.round(totalDividendosPeriodo * 100) / 100,
      }
    })

    // 5. Gera os KPIs agregados de todo o período coberto pelo gráfico
    const totalAportesNoGrafico = history.reduce((sum, h) => sum + h.aporte, 0)
    const totalDividendosNoGrafico = history.reduce((sum, h) => sum + h.dividendos, 0)
    
    // Patrimônio final menos patrimônio inicial ajustado pelos aportes
    const finalPatr = history[history.length - 1].patrimonio
    const initialPatr = history[0].patrimonio - history[0].aporte
    const rentabilidade = finalPatr + totalDividendosNoGrafico - (initialPatr + totalAportesNoGrafico)

    return NextResponse.json({
      history,
      summary: {
        totalAporte: Math.round(totalAportesNoGrafico * 100) / 100,
        totalDividendos: Math.round(totalDividendosNoGrafico * 100) / 100,
        rentabilidade: Math.round(rentabilidade * 100) / 100,
      },
    })
  } catch (err: any) {
    console.error("Portfolio history API error:", err)
    return NextResponse.json({ error: "Failed to fetch portfolio history", details: err.message }, { status: 500 })
  }
}
