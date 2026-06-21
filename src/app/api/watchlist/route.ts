import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const items = await prisma.watchlist.findMany({ orderBy: { addedAt: "desc" } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const { ticker, note } = await req.json()
  if (!ticker) return NextResponse.json({ error: "ticker obrigatório" }, { status: 400 })

  const item = await prisma.watchlist.upsert({
    where: { ticker: ticker.toUpperCase().trim() },
    update: { note: note ?? null },
    create: { ticker: ticker.toUpperCase().trim(), note: note ?? null },
  })
  return NextResponse.json(item, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { ticker } = await req.json()
  await prisma.watchlist.delete({ where: { ticker: ticker.toUpperCase().trim() } })
  return NextResponse.json({ ok: true })
}
