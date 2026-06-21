import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
  })
  return NextResponse.json(transactions)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { ticker, type, quantity, price, date, brokerage, note } = body

  if (!ticker || !type || !quantity || !price || !date) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
  }

  const transaction = await prisma.transaction.create({
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
  return NextResponse.json(transaction, { status: 201 })
}
