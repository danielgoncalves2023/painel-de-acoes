import { NextRequest, NextResponse } from "next/server"
import { cacheGet, cacheSet } from "@/lib/cache"
import { getQuoteWithModules } from "@/lib/brapi"
import { getAuthUserId, unauthorized } from "@/lib/auth-utils"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  const { ticker } = await params
  const cacheKey = `details:${ticker.toUpperCase()}`

  const cached = cacheGet(cacheKey)
  if (cached) return NextResponse.json(cached)

  try {
    const result = await getQuoteWithModules(ticker.toUpperCase())
    cacheSet(cacheKey, result, 10 * 60 * 1000) // 10min para detalhes
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
