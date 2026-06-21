import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId, unauthorized } from "@/lib/auth-utils"

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  })
  return NextResponse.json(transactions)
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  const body = await req.json()
  const { ticker, type, quantity, price, date, brokerage, note } = body

  if (!ticker || !type || !quantity || !price || !date) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
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
