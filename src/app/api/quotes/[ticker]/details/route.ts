import { NextRequest, NextResponse } from "next/server"
import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache"
import { getQuoteWithModules } from "@/lib/brapi"
import { getAuthUserId, unauthorized } from "@/lib/auth-utils"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  const { ticker } = await params
  const upper = ticker.toUpperCase()
  const cacheKey = `details:${upper}`

  // Se há fundamental local mas o cache pode ser de antes do fallback existir,
  // invalida para garantir que os dados do banco sejam aplicados
  const fundamental = await (prisma as any).stockFundamental
    .findUnique({ where: { ticker: upper } })
    .catch(() => null)

  const cached = cacheGet<any>(cacheKey)
  if (cached) {
    // Revalida: se o cached não tem earningsPerShare mas o banco tem lpa, limpa
    const missingEps = !cached.earningsPerShare && fundamental?.lpa
    const missingMktCap = !cached.marketCap && fundamental
    if (!missingEps && !missingMktCap) return NextResponse.json(cached)
    cacheDelete(cacheKey)
  }

  try {
    const result = await getQuoteWithModules(upper)

    // Preenche campos ausentes (comum em units como TAEE11, SANB11)
    // com dados do banco local sincronizado via Screener
    if (fundamental) {
      if (!result.earningsPerShare && fundamental.lpa) {
        result.earningsPerShare = fundamental.lpa
      }
      if (!result.defaultKeyStatistics) result.defaultKeyStatistics = {}
      if (!result.defaultKeyStatistics.bookValue && fundamental.vpa) {
        result.defaultKeyStatistics.bookValue = fundamental.vpa
      }
      if (!result.defaultKeyStatistics.returnOnEquity && fundamental.roe != null) {
        result.defaultKeyStatistics.returnOnEquity = fundamental.roe
      }
      if (!result.defaultKeyStatistics.profitMargins && fundamental.margemLiquida != null) {
        result.defaultKeyStatistics.profitMargins = fundamental.margemLiquida
      }
      if (!result.defaultKeyStatistics.payoutRatio && fundamental.payout != null) {
        result.defaultKeyStatistics.payoutRatio = fundamental.payout
      }
      // Reconstrói P/L a partir do LPA local se Yahoo não retornou
      if (!result.priceEarnings && result.earningsPerShare && result.earningsPerShare > 0) {
        result.priceEarnings = result.regularMarketPrice / result.earningsPerShare
      }
      // Histórico de dividendos: prefere o dado fresco do Yahoo, usa local como fallback
      if ((!result.historyDividend || result.historyDividend.length === 0) && fundamental.historyDivRaw) {
        try {
          result.historyDividend = JSON.parse(fundamental.historyDivRaw)
        } catch { /* mantém vazio */ }
      }
    }

    cacheSet(cacheKey, result, 10 * 60 * 1000) // 10 min
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
