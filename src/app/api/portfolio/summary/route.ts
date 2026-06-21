import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calcPositions, calcWeightedDY } from "@/lib/calculations"
import { getQuotes } from "@/lib/brapi"
import { cacheGet, cacheSet } from "@/lib/cache"

export const dynamic = "force-dynamic"

async function getCDIRate(): Promise<number> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    const response = await fetch(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1178/dados/ultimos/1?formato=json",
      { signal: controller.signal }
    )
    clearTimeout(timeoutId)
    if (!response.ok) throw new Error("Erro na resposta do BCB")
    const data = await response.json()
    if (Array.isArray(data) && data.length > 0 && data[0].valor) {
      const val = parseFloat(data[0].valor)
      if (!isNaN(val) && val > 0) {
        return val
      }
    }
    return 10.75
  } catch (err) {
    console.error("Erro ao buscar CDI do BCB:", err)
    return 10.75
  }
}

export async function GET() {
  const cacheKey = "portfolio:summary"
  const cached = cacheGet<{ totalValue: number; weightedDY: number; cdiRate: number }>(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    const transactions = await prisma.transaction.findMany()
    if (transactions.length === 0) {
      return NextResponse.json({ totalValue: 0, weightedDY: 0, cdiRate: 10.75 })
    }

    const tickers = [...new Set(transactions.map(t => t.ticker))]
    const quotes = await getQuotes(tickers)
    const typedTransactions = transactions.map(t => ({
      ...t,
      type: t.type as "BUY" | "SELL",
      date: t.date instanceof Date ? t.date.toISOString() : String(t.date),
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt)
    }))
    const positions = calcPositions(typedTransactions, quotes)
    const activePositions = positions.filter(p => p.quantity > 0)

    const totalValue = activePositions.reduce((s, p) => s + p.currentValue, 0)
    const weightedDY = calcWeightedDY(activePositions)
    const cdiRate = await getCDIRate()

    const result = { totalValue, weightedDY, cdiRate }
    cacheSet(cacheKey, result, 5 * 60 * 1000)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
