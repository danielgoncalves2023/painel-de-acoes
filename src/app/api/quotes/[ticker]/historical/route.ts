import { NextRequest, NextResponse } from "next/server"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getHistorical } from "@/lib/brapi"
import { getAuthUserId, unauthorized } from "@/lib/auth-utils"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  const { ticker } = await params
  const rawTicker = ticker.toUpperCase()
  const cleanTicker = (rawTicker === "BVSP" || rawTicker === "IBOV") ? "^BVSP" : rawTicker

  const range = (req.nextUrl.searchParams.get("range") ?? "1y") as "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y"
  const cacheKey = `historical:${cleanTicker}:${range}`

  const cached = cacheGet(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    const result = await getHistorical(cleanTicker, range)
    cacheSet(cacheKey, result, 15 * 60 * 1000)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
