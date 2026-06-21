import { NextResponse } from "next/server"
import YahooFinance from "yahoo-finance2"
import { prisma } from "@/lib/prisma"
import { getAuthUserId, unauthorized } from "@/lib/auth-utils"

export const dynamic = "force-dynamic"

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  validation: { logErrors: false }
})

interface DividendItem {
  ticker: string
  name: string
  exDate: string
  amount: number
  quantity: number
  total: number
  status: "Pago" | "Provisionado"
}

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  try {
    // 1. Busca todas as transações do investidor
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    })

    if (transactions.length === 0) {
      return NextResponse.json({ dividends: [], summary: { totalPaid: 0, totalProvisioned: 0 } })
    }

    const tickers = [...new Set(transactions.map((t) => t.ticker))]

    // 2. Busca o histórico de dividendos salvos no banco local de fundamentos
    const fundamentals = await (prisma as any).stockFundamental.findMany({
      where: { ticker: { in: tickers } },
    })

    const fundMap = new Map<string, any>(fundamentals.map((f: any) => [f.ticker, f]))
    const dividends: DividendItem[] = []

    const now = new Date()

    for (const ticker of tickers) {
      const fund = fundMap.get(ticker)
      let divList: { date: string; amount: number }[] = []
      let assetName = ticker

      if (fund && fund.historyDivRaw) {
        assetName = fund.name || ticker
        try {
          divList = JSON.parse(fund.historyDivRaw)
        } catch {
          divList = []
        }
      } else {
        // Fallback: Busca proventos históricos diretamente no Yahoo Finance se não estiver no banco
        try {
          const queryStart = new Date()
          queryStart.setFullYear(queryStart.getFullYear() - 5) // Últimos 5 anos de proventos
          
          const result = await yf.chart(`${ticker}.SA`, {
            period1: queryStart,
            interval: "1mo",
          })
          
          if (result.events && result.events.dividends) {
            divList = Object.values(result.events.dividends).map((d: any) => ({
              date: typeof d.date === "object" ? d.date.toISOString() : new Date(d.date * 1000).toISOString(),
              amount: d.amount ?? 0,
            }))
          }
          
          // Tenta pegar o nome abreviado do ativo
          if (result.meta && (result.meta as any).shortName) {
            assetName = (result.meta as any).shortName
          }
        } catch (err: any) {
          console.error(`Erro no fallback de dividendos para ${ticker}:`, err.message)
        }
      }

      for (const d of divList) {
        const exDate = new Date(d.date)
        exDate.setUTCHours(0, 0, 0, 0)

        // Calcula a quantidade de ações que possuía na Data Ex (apenas movimentações anteriores à Data Ex)
        const quantityOnExDate = transactions
          .filter((t) => {
            const txDate = new Date(t.date)
            txDate.setUTCHours(0, 0, 0, 0)
            return t.ticker === ticker && txDate < exDate
          })
          .reduce((sum, t) => {
            return t.type === "BUY" ? sum + t.quantity : sum - t.quantity
          }, 0)

        if (quantityOnExDate > 0) {
          const total = quantityOnExDate * d.amount
          const status = exDate < now ? "Pago" : "Provisionado"

          dividends.push({
            ticker,
            name: assetName,
            exDate: d.date,
            amount: d.amount,
            quantity: quantityOnExDate,
            total: Math.round(total * 100) / 100,
            status,
          })
        }
      }
    }

    // Ordena por data decrescente (mais recente primeiro)
    dividends.sort((a, b) => new Date(b.exDate).getTime() - new Date(a.exDate).getTime())

    // Calcula agregados
    const totalPaid = dividends
      .filter((d) => d.status === "Pago")
      .reduce((sum, d) => sum + d.total, 0)

    const totalProvisioned = dividends
      .filter((d) => d.status === "Provisionado")
      .reduce((sum, d) => sum + d.total, 0)

    return NextResponse.json({
      dividends,
      summary: {
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalProvisioned: Math.round(totalProvisioned * 100) / 100,
      },
    })
  } catch (err: any) {
    console.error("Dividends API error:", err)
    return NextResponse.json({ error: "Failed to fetch portfolio dividends", details: err.message }, { status: 500 })
  }
}
