import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { ticker, type, quantity, price, date, brokerage, note } = body

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      ticker: ticker.toUpperCase().trim(),
      type,
      quantity: Number(quantity),
      price: Number(price),
      date: new Date(date),
      brokerage: Number(brokerage ?? 0),
      note: note ?? null,
    },
  })
  return NextResponse.json(transaction)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.transaction.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
