/**
 * Score de Oportunidade de Compra — 0 a 10
 *
 * Pontuação ponderada de múltiplos critérios fundamentalistas.
 * Quanto maior, mais atrativa a ação como oportunidade de compra.
 */

export interface ScoringInput {
  dy?: number | null           // Dividend Yield em % (ex: 6.5)
  pl?: number | null           // Preço/Lucro
  pvp?: number | null          // Preço/Valor Patrimonial
  roe?: number | null          // ROE em decimal (ex: 0.24 = 24%)
  margemLiquida?: number | null // Margem líquida em decimal (ex: 0.21 = 21%)
  grahamMargin?: number | null // Margem de segurança Graham em %
  bazinMargin?: number | null  // Margem de segurança Bazin em %
  debtToEquity?: number | null // Dívida/PL (menor = melhor)
}

export interface ScoreBreakdown {
  total: number          // 0-10
  label: string          // "Excelente" | "Bom" | "Neutro" | "Fraco" | "Sem dados"
  color: string          // classe tailwind
  criteria: {
    name: string
    pts: number
    maxPts: number
    detail: string
  }[]
}

export function calcOpportunityScore(input: ScoringInput): ScoreBreakdown {
  const criteria: ScoreBreakdown["criteria"] = []
  let total = 0

  // 1. Dividend Yield (0-2 pts)
  const dy = input.dy
  let dyPts = 0
  if (dy != null && dy > 0) {
    if (dy >= 10) dyPts = 2
    else if (dy >= 6) dyPts = 1.5
    else if (dy >= 4) dyPts = 1
    else if (dy >= 2) dyPts = 0.5
    criteria.push({ name: "Dividend Yield", pts: dyPts, maxPts: 2, detail: `${dy.toFixed(1)}%` })
  } else {
    criteria.push({ name: "Dividend Yield", pts: 0, maxPts: 2, detail: "—" })
  }
  total += dyPts

  // 2. P/L (0-2 pts) — menor é melhor para value investing
  const pl = input.pl
  let plPts = 0
  if (pl != null && pl > 0) {
    if (pl <= 6) plPts = 2
    else if (pl <= 10) plPts = 1.5
    else if (pl <= 15) plPts = 1
    else if (pl <= 20) plPts = 0.5
    criteria.push({ name: "P/L", pts: plPts, maxPts: 2, detail: pl.toFixed(1) })
  } else {
    criteria.push({ name: "P/L", pts: 0, maxPts: 2, detail: pl != null && pl < 0 ? "Prejuízo" : "—" })
  }
  total += plPts

  // 3. P/VP (0-1 pt) — abaixo de 1 é pechincha
  const pvp = input.pvp
  let pvpPts = 0
  if (pvp != null && pvp > 0) {
    if (pvp <= 1) pvpPts = 1
    else if (pvp <= 1.5) pvpPts = 0.5
    criteria.push({ name: "P/VP", pts: pvpPts, maxPts: 1, detail: pvp.toFixed(2) })
  } else {
    criteria.push({ name: "P/VP", pts: 0, maxPts: 1, detail: "—" })
  }
  total += pvpPts

  // 4. ROE (0-2 pts) — mede qualidade do negócio
  const roe = input.roe != null ? input.roe * 100 : null
  let roePts = 0
  if (roe != null) {
    if (roe >= 25) roePts = 2
    else if (roe >= 18) roePts = 1.5
    else if (roe >= 12) roePts = 1
    else if (roe >= 8) roePts = 0.5
    criteria.push({ name: "ROE", pts: roePts, maxPts: 2, detail: `${roe.toFixed(1)}%` })
  } else {
    criteria.push({ name: "ROE", pts: 0, maxPts: 2, detail: "—" })
  }
  total += roePts

  // 5. Margem Líquida (0-1 pt)
  const ml = input.margemLiquida != null ? input.margemLiquida * 100 : null
  let mlPts = 0
  if (ml != null) {
    if (ml >= 20) mlPts = 1
    else if (ml >= 10) mlPts = 0.5
    criteria.push({ name: "Margem Líquida", pts: mlPts, maxPts: 1, detail: `${ml.toFixed(1)}%` })
  } else {
    criteria.push({ name: "Margem Líquida", pts: 0, maxPts: 1, detail: "—" })
  }
  total += mlPts

  // 6. Margem de Graham (0-2 pts)
  const gm = input.grahamMargin
  let gmPts = 0
  if (gm != null) {
    if (gm >= 40) gmPts = 2
    else if (gm >= 25) gmPts = 1.5
    else if (gm >= 15) gmPts = 1
    else if (gm >= 5) gmPts = 0.5
    criteria.push({ name: "Margem Graham", pts: gmPts, maxPts: 2, detail: gm > 0 ? `+${gm.toFixed(0)}%` : `${gm.toFixed(0)}%` })
  } else {
    criteria.push({ name: "Margem Graham", pts: 0, maxPts: 2, detail: "—" })
  }
  total += gmPts

  // Clamp
  total = Math.min(10, Math.max(0, total))

  // Contagem de critérios sem dados
  const semDados = criteria.filter(c => c.detail === "—").length
  if (semDados >= 5) {
    return { total: 0, label: "Sem dados", color: "text-muted-foreground", criteria }
  }

  let label: string
  let color: string
  if (total >= 8) { label = "Excelente"; color = "text-green-400" }
  else if (total >= 6) { label = "Bom"; color = "text-green-600" }
  else if (total >= 4) { label = "Neutro"; color = "text-yellow-500" }
  else { label = "Fraco"; color = "text-red-500" }

  return { total, label, color, criteria }
}

/** Analisa consistência e crescimento de dividendos */
export interface DividendAnalysis {
  totalPayments: number
  paymentsLast12m: number
  avgAnnual: number
  cagr3y: number | null      // crescimento anual composto 3 anos
  tag: "Aristócrata" | "Consistente" | "Irregular" | "Sem histórico"
  tagColor: string
  payoutEstimate: number | null // Payout real em base percentual (ex: 45) ou nulo
}

export function analyzeDividends(
  historyDividend: { date: string; amount: number }[] | undefined,
  roe?: number | null,
  payoutRatio?: number | null
): DividendAnalysis {
  if (!historyDividend || historyDividend.length === 0) {
    return { totalPayments: 0, paymentsLast12m: 0, avgAnnual: 0, cagr3y: null, tag: "Sem histórico", tagColor: "text-muted-foreground", payoutEstimate: null }
  }

  const now = new Date()
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate())

  // Pagamentos últimos 12 meses
  const last12m = historyDividend.filter(d => new Date(d.date) >= oneYearAgo)
  const paymentsLast12m = last12m.length
  const sumLast12m = last12m.reduce((s, d) => s + d.amount, 0)

  // Agrupar por ano para CAGR
  const byYear: Record<number, number> = {}
  for (const d of historyDividend) {
    const yr = new Date(d.date).getFullYear()
    byYear[yr] = (byYear[yr] || 0) + d.amount
  }

  const years = Object.keys(byYear).map(Number).sort()
  const totalPayments = historyDividend.length

  // CAGR 3 anos
  let cagr3y: number | null = null
  const last3Years = years.filter(y => y >= now.getFullYear() - 3)
  if (last3Years.length >= 2) {
    const oldest = byYear[last3Years[0]]
    const newest = byYear[last3Years[last3Years.length - 1]]
    const n = last3Years[last3Years.length - 1] - last3Years[0]
    if (oldest > 0 && n > 0) {
      cagr3y = (Math.pow(newest / oldest, 1 / n) - 1) * 100
    }
  }

  // Tag de consistência
  const yearsWithPayment = years.filter(y => y >= now.getFullYear() - 5).length
  let tag: DividendAnalysis["tag"]
  let tagColor: string
  if (yearsWithPayment >= 5 && cagr3y != null && cagr3y > 0) {
    tag = "Aristócrata"; tagColor = "text-purple-400"
  } else if (yearsWithPayment >= 3 && paymentsLast12m >= 2) {
    tag = "Consistente"; tagColor = "text-green-500"
  } else {
    tag = "Irregular"; tagColor = "text-yellow-500"
  }

  // Payout Real (convertido de decimal)
  const payoutEstimate = payoutRatio != null ? payoutRatio * 100 : null

  const avgAnnual = years.length > 0
    ? Object.values(byYear).reduce((s, v) => s + v, 0) / years.length
    : 0

  return { totalPayments, paymentsLast12m, avgAnnual, cagr3y, tag, tagColor, payoutEstimate }
}
