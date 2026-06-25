import { NextResponse } from "next/server"
import YahooFinance from "yahoo-finance2"
import { getAuthUserId, unauthorized } from "@/lib/auth-utils"
import { cacheGet, cacheSet } from "@/lib/cache"

export const dynamic = "force-dynamic"

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  validation: { logErrors: false },
})

type Period = "week" | "month" | "year"

interface BenchmarkPoint {
  label: string
  ibov: number | null   // % acumulado desde início do período
  cdi: number | null
}

function buildPeriodDates(period: Period): { label: string; date: Date }[] {
  const now = new Date()
  const points: { label: string; date: Date }[] = []

  if (period === "week") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i * 7)
      points.push({ label: `Semana ${12 - i}`, date: d })
    }
  } else if (period === "year") {
    for (let i = 4; i >= 0; i--) {
      const year = now.getFullYear() - i
      points.push({ label: String(year), date: new Date(year, 11, 31) })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = new Date(d.getFullYear(), d.getMonth() + 1, 0)
        .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      points.push({ label, date: new Date(d.getFullYear(), d.getMonth() + 1, 0) })
    }
  }
  return points
}

async function fetchIbovHistory(period: Period): Promise<{ date: Date; close: number }[]> {
  const now = new Date()
  let period1 = new Date()
  if (period === "week") period1.setDate(now.getDate() - 12 * 7 - 14)
  else if (period === "year") period1.setFullYear(now.getFullYear() - 5)
  else period1.setMonth(now.getMonth() - 13)

  const interval = period === "week" ? "1wk" : (period === "year" ? "1mo" : "1mo")

  try {
    const result = await yf.chart("^BVSP", { period1, interval })
    return (result.quotes || [])
      .filter((q: any) => q.close != null)
      .map((q: any) => ({ date: new Date(q.date), close: q.close as number }))
  } catch {
    return []
  }
}

async function fetchCdiMonthly(startDate: Date): Promise<{ date: Date; rate: number }[]> {
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`

  const now = new Date()
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados?formato=json&dataInicial=${fmt(startDate)}&dataFinal=${fmt(now)}`

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data: { data: string; valor: string }[] = await res.json()
    return data.map((d) => {
      const [day, month, year] = d.data.split("/").map(Number)
      return { date: new Date(year, month - 1, day), rate: parseFloat(d.valor) }
    })
  } catch {
    return []
  }
}

function closestBefore(history: { date: Date; close: number }[], target: Date): number | null {
  const candidates = history.filter((h) => h.date <= target)
  if (candidates.length === 0) return null
  return candidates[candidates.length - 1].close
}

export async function GET(request: Request) {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get("period") || "month") as Period

  const cacheKey = `benchmark:${period}`
  const cached = cacheGet<BenchmarkPoint[]>(cacheKey)
  if (cached) return NextResponse.json({ points: cached })

  const periodPoints = buildPeriodDates(period)
  const startDate = periodPoints[0].date

  const [ibovHistory, cdiRates] = await Promise.all([
    fetchIbovHistory(period),
    fetchCdiMonthly(startDate),
  ])

  const ibovBase = closestBefore(ibovHistory, startDate)

  // Acumula CDI mes a mes
  const cdiAccumulated: { date: Date; pct: number }[] = []
  let acc = 1
  for (const r of cdiRates) {
    acc *= 1 + r.rate / 100
    cdiAccumulated.push({ date: r.date, pct: (acc - 1) * 100 })
  }

  const points: BenchmarkPoint[] = periodPoints.map(({ label, date }) => {
    // IBOVESPA
    let ibov: number | null = null
    if (ibovBase != null) {
      const close = closestBefore(ibovHistory, date)
      if (close != null) ibov = ((close - ibovBase) / ibovBase) * 100
    }

    // CDI acumulado até esta data
    let cdi: number | null = null
    const cdiCandidates = cdiAccumulated.filter((c) => c.date <= date)
    if (cdiCandidates.length > 0) {
      cdi = cdiCandidates[cdiCandidates.length - 1].pct
    }

    return { label, ibov: ibov != null ? Math.round(ibov * 100) / 100 : null, cdi: cdi != null ? Math.round(cdi * 100) / 100 : null }
  })

  cacheSet(cacheKey, points, 30 * 60 * 1000) // 30min
  return NextResponse.json({ points })
}
