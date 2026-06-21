import { NextRequest, NextResponse } from "next/server"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getQuote, getQuotes } from "@/lib/brapi"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const tickers = ticker.split(",").map((t) => t.toUpperCase())
  const cacheKey = `quote:${tickers.join(",")}`

  const cached = cacheGet(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    const results = tickers.length === 1
      ? [await getQuote(tickers[0])]
      : await getQuotes(tickers)
    cacheSet(cacheKey, results)
    return NextResponse.json(results)
  } catch (err) {
    console.error("[quotes] erro brapi:", String(err))
    return NextResponse.json([])
  }
}
