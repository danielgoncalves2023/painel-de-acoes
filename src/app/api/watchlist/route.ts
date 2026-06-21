import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId, unauthorized } from "@/lib/auth-utils"

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  const items = await prisma.watchlist.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  const { ticker, note } = await req.json()
  if (!ticker) return NextResponse.json({ error: "ticker obrigatório" }, { status: 400 })

  const item = await prisma.watchlist.upsert({
    where: { userId_ticker: { userId, ticker: ticker.toUpperCase().trim() } },
    update: { note: note ?? null },
    create: { userId, ticker: ticker.toUpperCase().trim(), note: note ?? null },
  })
  return NextResponse.json(item, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  const { ticker } = await req.json()
  await prisma.watchlist.delete({
    where: { userId_ticker: { userId, ticker: ticker.toUpperCase().trim() } },
  })
  return NextResponse.json({ ok: true })
}
