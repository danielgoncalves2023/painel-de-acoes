import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calcPositions } from "@/lib/calculations"
import YahooFinance from "yahoo-finance2"

export const dynamic = "force-dynamic"

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] })

interface ProventoEvent {
  ticker: string
  type: "PAGO" | "PREVISTO"
  source: "carteira" | "favoritas"
  amount: number
  date: string // Data Ex ou Pagamento
  dataCom?: string // Data de corte estimada/calculada
}

// Subtrai 1 dia útil para calcular a Data Com aproximada a partir da Data Ex
function getEstimatedDataCom(exDateStr: string): string {
  const exDate = new Date(exDateStr)
  const dataCom = new Date(exDate)
  
  // Se for segunda (1), volta para sexta (5)
  if (exDate.getDay() === 1) {
    dataCom.setDate(exDate.getDate() - 3)
  } else if (exDate.getDay() === 0) {
    // Se for domingo, volta para sexta
    dataCom.setDate(exDate.getDate() - 2)
  } else {
    dataCom.setDate(exDate.getDate() - 1)
  }
  return dataCom.toISOString().split("T")[0]
}

export async function GET() {
  try {
    // 1. Obter ações da carteira e favorita
    const [transactions, watchlist] = await Promise.all([
      prisma.transaction.findMany(),
      prisma.watchlist.findMany()
    ])

    const watchlistTickers = watchlist.map(w => w.ticker)
    
    // Obter tickers da carteira com posição ativa
    let portfolioTickers: string[] = []
    if (transactions.length > 0) {
      // Como não temos quotes prontas aqui, criamos um mock simples das quotes com preço de fechamento fictício de 1
      // apenas para rodar a agregação de quantidade acumulada em calcPositions.
      const mockQuotes = Array.from(new Set(transactions.map(t => t.ticker))).map(ticker => ({
        symbol: ticker,
        regularMarketPrice: 1,
        currency: "BRL"
      })) as any[]
      
      const typedTransactions = transactions.map(t => ({
        ...t,
        type: t.type as "BUY" | "SELL",
        date: t.date instanceof Date ? t.date.toISOString() : String(t.date),
        createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt)
      }))
      const positions = calcPositions(typedTransactions, mockQuotes)
      portfolioTickers = positions.filter(p => p.quantity > 0).map(p => p.ticker)
    }

    const uniqueTickers = [...new Set([...portfolioTickers, ...watchlistTickers])]

    if (uniqueTickers.length === 0) {
      return NextResponse.json({ events: [], message: "Nenhuma ação na carteira ou favoritas" })
    }

    const now = new Date()
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(now.getFullYear() - 1)

    // 2. Buscar proventos do Yahoo Finance para cada ativo
    const events: ProventoEvent[] = []

    const portfolioSet = new Set(portfolioTickers)

    await Promise.all(
      uniqueTickers.map(async (ticker) => {
        const yahooTicker = `${ticker}.SA`
        const source: "carteira" | "favoritas" = portfolioSet.has(ticker) ? "carteira" : "favoritas"
        try {
          const [chartData, summaryData] = await Promise.all([
            yf.chart(yahooTicker, { period1: oneYearAgo, interval: "1mo" }).catch(() => null),
            yf.quoteSummary(yahooTicker, { modules: ["summaryDetail"] }).catch(() => null)
          ])

          // Histórico (Pagos nos últimos 12 meses)
          if (chartData?.events?.dividends) {
            chartData.events.dividends.forEach((div: any) => {
              const divDate = div.date instanceof Date ? div.date.toISOString() : new Date(div.date).toISOString()
              events.push({
                ticker,
                type: "PAGO",
                source,
                amount: div.amount,
                date: divDate.split("T")[0],
                dataCom: getEstimatedDataCom(divDate)
              })
            })
          }

          // Previsto (Próxima data Ex declarada)
          const summaryDetail = summaryData?.summaryDetail
          if (summaryDetail?.exDividendDate) {
            const exDateStr = summaryDetail.exDividendDate instanceof Date
              ? summaryDetail.exDividendDate.toISOString()
              : new Date(summaryDetail.exDividendDate).toISOString()
            const exDateTime = new Date(exDateStr).getTime()

            if (exDateTime > now.getTime() - 2 * 24 * 60 * 60 * 1000) {
              const isDuplicated = events.some(e => e.ticker === ticker && Math.abs(new Date(e.date).getTime() - exDateTime) < 24 * 60 * 60 * 1000)
              if (!isDuplicated) {
                events.push({
                  ticker,
                  type: "PREVISTO",
                  source,
                  amount: summaryDetail.dividendRate || 0,
                  date: exDateStr.split("T")[0],
                  dataCom: getEstimatedDataCom(exDateStr)
                })
              }
            }
          }
        } catch (e) {
          console.error(`Erro ao buscar proventos para ${ticker}:`, e)
        }
      })
    )

    // Ordena por data decrescente (mais recente primeiro)
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ events })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: "Erro ao gerar calendário de proventos", details: err.message }, { status: 500 })
  }
}
