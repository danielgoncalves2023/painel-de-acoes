import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const targets = await (prisma as any).targetAllocation.findMany()
    return NextResponse.json(targets)
  } catch (err: any) {
    console.error("GET /api/targets ERROR:", err.message)
    return NextResponse.json({ error: "Failed to fetch targets", details: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const targets: { ticker: string; targetPct: number }[] = body.targets

    if (!Array.isArray(targets)) {
      return NextResponse.json({ error: "Formato inválido. 'targets' deve ser um array." }, { status: 400 })
    }

    // Usa transação para limpar tudo e inserir novos, garantindo que não ficam metas fantasma
    // (ou upsert se quiser manter, mas limpar tudo e repopular baseado na UI é mais fácil se a UI envia o array completo de metas)
    await prisma.$transaction(async (tx: any) => {
      await tx.targetAllocation.deleteMany()
      for (const t of targets) {
        if (t.targetPct > 0) {
          await tx.targetAllocation.create({
            data: {
              ticker: t.ticker,
              targetPct: t.targetPct
            }
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
