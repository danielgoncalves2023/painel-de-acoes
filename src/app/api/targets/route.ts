import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUserId, unauthorized } from "@/lib/auth-utils"

export const dynamic = "force-dynamic"

export async function GET() {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  try {
    const targets = await prisma.targetAllocation.findMany({ where: { userId } })
    return NextResponse.json(targets)
  } catch (err: any) {
    console.error("GET /api/targets ERROR:", err.message)
    return NextResponse.json({ error: "Failed to fetch targets", details: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await getAuthUserId()
  if (!userId) return unauthorized()

  try {
    const body = await req.json()
    const targets: { ticker: string; targetPct: number }[] = body.targets

    if (!Array.isArray(targets)) {
      return NextResponse.json({ error: "Formato inválido. 'targets' deve ser um array." }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.targetAllocation.deleteMany({ where: { userId } })
      for (const t of targets) {
        if (t.targetPct > 0) {
          await tx.targetAllocation.create({
            data: { userId, ticker: t.ticker, targetPct: t.targetPct },
          })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Failed to save targets" }, { status: 500 })
  }
}
