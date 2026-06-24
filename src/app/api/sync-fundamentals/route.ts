import { NextResponse } from "next/server"
import YahooFinance from "yahoo-finance2"
import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet } from "@/lib/cache"
import { TICKERS } from "@/lib/tickers"
import { getAuthUserId, unauthorized } from "@/lib/auth-utils"

export const dynamic = "force-dynamic"

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  validation: { logErrors: false }
})

interface SyncProgress {
  status: "idle" | "running" | "completed" | "error"
  current: number
  total: number
  lastTicker: string
  errorMsg?: string
}

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  const progress = cacheGet<SyncProgress>("sync:progress") || {
    status: "idle",
    current: 0,
    total: TICKERS.length,
    lastTicker: "",
  }
  return NextResponse.json(progress)
}

export async function POST() {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()


  const progress = cacheGet<SyncProgress>("sync:progress")
  if (progress && progress.status === "running") {
    return NextResponse.json({ error: "Sincronização já está em andamento" }, { status: 400 })
  }

  // Dispara o processamento em segundo plano sem travar a requisição HTTP
  runSyncInBackground().catch((err) => {
    console.error("Erro crítico na sincronização de fundo:", err)
  })

  return NextResponse.json({ message: "Sincronização iniciada" })
}

async function runSyncInBackground() {
  const total = TICKERS.length
  cacheSet<SyncProgress>("sync:progress", {
    status: "running",
    current: 0,
    total,
    lastTicker: "",
  }, 30 * 60 * 1000)

  for (let i = 0; i < total; i++) {
    const ticker = TICKERS[i]

    try {
      const threeYearsAgo = new Date()
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

      const [summary, chart] = await Promise.allSettled([
        yf.quoteSummary(`${ticker}.SA`, {
          modules: ["financialData", "defaultKeyStatistics", "price", "summaryDetail"],
        }),
        yf.chart(`${ticker}.SA`, { period1: threeYearsAgo, interval: "1mo" }),
      ])

      if (summary.status === "fulfilled" && summary.value) {
        const data = summary.value as any
        const fd = data.financialData || {}
        const stats = data.defaultKeyStatistics || {}
        const priceObj = data.price || {}
        const sd = data.summaryDetail || {}

        const lpa = stats.trailingEps || stats.epsTrailingTwelveMonths || 0
        const vpa = stats.bookValue || 0
        const roe = fd.returnOnEquity || null
        const margemLiquida = fd.profitMargins || null
        const payout = sd.payoutRatio !== undefined ? sd.payoutRatio : null
        const name = priceObj.shortName || priceObj.longName || ticker

        // Dividendos
        const divEvents = chart.status === "fulfilled" ? chart.value?.events?.dividends : null
        const historyDividend = divEvents
          ? Object.values(divEvents).map((d: any) => ({
              date: typeof d.date === "object" ? d.date.toISOString() : new Date(d.date).toISOString(),
              amount: d.amount ?? 0,
            }))
          : []

        await (prisma as any).stockFundamental.upsert({
          where: { ticker },
          create: {
            ticker,
            name,
            lpa,
            vpa,
            roe,
            margemLiquida,
            payout,
            historyDivRaw: JSON.stringify(historyDividend),
          },
          update: {
            name,
            lpa,
            vpa,
            roe,
            margemLiquida,
            payout,
            historyDivRaw: JSON.stringify(historyDividend),
          },
        })
      }
    } catch (err: any) {
      console.error(`Erro ao obter fundamentos de ${ticker}:`, err.message)
    }

    // Atualiza progresso
    cacheSet<SyncProgress>("sync:progress", {
      status: "running",
      current: i + 1,
      total,
      lastTicker: ticker,
    }, 30 * 60 * 1000)

    // Intervalo anti-bloqueio de 200ms entre as requisições
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  cacheSet<SyncProgress>("sync:progress", {
    status: "completed",
    current: total,
    total,
    lastTicker: TICKERS[total - 1],
  }, 30 * 60 * 1000)
}
