import { analyzeDividends } from "@/lib/scoring"
import { QuoteWithModules } from "@/types"
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface Props {
  quote: QuoteWithModules
}

export function DividendAnalysis({ quote }: Props) {
  const analysis = analyzeDividends(
    quote.historyDividend,
    quote.defaultKeyStatistics?.returnOnEquity,
    quote.defaultKeyStatistics?.payoutRatio
  )

  if (analysis.tag === "Sem histórico") return null

  const cagrPositive = analysis.cagr3y != null && analysis.cagr3y > 0
  const cagrNegative = analysis.cagr3y != null && analysis.cagr3y < 0

  // Agrupa dividendos por ano para o mini gráfico
  const byYear: Record<number, number> = {}
  for (const d of quote.historyDividend ?? []) {
    const yr = new Date(d.date).getFullYear()
    byYear[yr] = (byYear[yr] || 0) + d.amount
  }
  const yearlyData = Object.entries(byYear)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, total]) => ({ year, total: Math.round(total * 100) / 100 }))

  // Calcula a média acumulada até cada ano para traçar a evolução da média
  let sumSoFar = 0
  const yearlyDataWithAvg = yearlyData.map((entry, index) => {
    sumSoFar += entry.total
    const avg = sumSoFar / (index + 1)
    return {
      ...entry,
      average: Math.round(avg * 100) / 100,
    }
  })

  // Detecta tendência: último ano vs penúltimo
  const lastTwo = yearlyData.slice(-2)
  const trend = lastTwo.length === 2
    ? lastTwo[1].total >= lastTwo[0].total ? "up" : "down"
    : "neutral"

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Análise de Dividendos</h2>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
          analysis.tag === "Aristócrata"
            ? "border-purple-400/40 bg-purple-400/10 text-purple-400"
            : analysis.tag === "Consistente"
            ? "border-green-500/40 bg-green-500/10 text-green-500"
            : "border-yellow-500/40 bg-yellow-500/10 text-yellow-500"
        }`}>
          {analysis.tag === "Aristócrata" ? "👑 " : analysis.tag === "Consistente" ? "✅ " : "⚠️ "}
          {analysis.tag}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
        <div className="bg-muted/40 rounded-lg px-4 py-3">
          <div className="text-xs text-muted-foreground mb-1">Pagamentos (12m)</div>
          <div className="font-semibold">{analysis.paymentsLast12m} pagamentos</div>
        </div>
        <div className="bg-muted/40 rounded-lg px-4 py-3">
          <div className="text-xs text-muted-foreground mb-1">Total histórico</div>
          <div className="font-semibold">{analysis.totalPayments} eventos</div>
        </div>
        <div className="bg-muted/40 rounded-lg px-4 py-3">
          <div className="text-xs text-muted-foreground mb-1">Média anual paga</div>
          <div className="font-semibold">R$ {analysis.avgAnnual.toFixed(2)} / ação</div>
        </div>
        <div className="bg-muted/40 rounded-lg px-4 py-3">
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger className="text-xs text-muted-foreground mb-1 flex items-center gap-1 cursor-help w-fit underline decoration-dashed underline-offset-2 text-left">
                Crescimento (CAGR 3a) <HelpCircle size={10} />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px] text-xs leading-relaxed font-normal">
                <p><strong>CAGR</strong> (Compound Annual Growth Rate) é a taxa de crescimento anual composta dos dividendos nos últimos 3 anos.</p>
                <p className="mt-1">Um CAGR positivo e consistente indica que a empresa aumenta os proventos ano a ano — sinal de saúde financeira e compromisso com o acionista. CAGR negativo ou irregular sugere distribuição instável, o que exige atenção antes de depender dessa ação como fonte de renda passiva.</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
          <div className={`font-semibold flex items-center gap-1 ${cagrPositive ? "text-green-500" : cagrNegative ? "text-red-500" : "text-muted-foreground"}`}>
            {cagrPositive ? <TrendingUp size={14} /> : cagrNegative ? <TrendingDown size={14} /> : <Minus size={14} />}
            {analysis.cagr3y != null ? `${analysis.cagr3y > 0 ? "+" : ""}${analysis.cagr3y.toFixed(1)}% a.a.` : "—"}
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg px-4 py-3">
          <div className="text-xs text-muted-foreground mb-1">Payout Real</div>
          <div className="font-semibold">
            {analysis.payoutEstimate != null ? `${analysis.payoutEstimate.toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>

      {/* Gráfico de barras por ano */}
      {yearlyData.length >= 2 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Total pago por ação / ano</span>
            <span className={`text-xs font-semibold flex items-center gap-1 ${
              trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"
            }`}>
              {trend === "up" ? <TrendingUp size={11} /> : trend === "down" ? <TrendingDown size={11} /> : <Minus size={11} />}
              {trend === "up" ? "Crescendo" : trend === "down" ? "Caindo" : "Estável"}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <ComposedChart data={yearlyDataWithAvg} margin={{ top: 12, right: 0, left: -30, bottom: 0 }} barSize={20}>
              <XAxis dataKey="year" tick={{ fontSize: 10 }} stroke="currentColor" className="opacity-50" />
              <YAxis tick={{ fontSize: 9 }} stroke="currentColor" className="opacity-40" tickFormatter={(v) => `R$${v.toFixed(2)}`} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const total = payload.find(p => p.dataKey === "total")?.value
                  const average = payload.find(p => p.dataKey === "average")?.value
                  return (
                    <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "hsl(var(--foreground))" }}>
                      <p style={{ fontWeight: 600, marginBottom: 2 }}>{label}</p>
                      <p>Total pago: R$ {Number(total).toFixed(2)} / ação</p>
                      {average != null && (
                        <p style={{ color: "#eab308" }}>Média acumulada: R$ {Number(average).toFixed(2)} / ação</p>
                      )}
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="average"
                stroke="#eab308"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--card))", strokeWidth: 1.5 }}
                activeDot={{ r: 5 }}
                name="Média Acumulada"
              />
              <Bar dataKey="total" radius={[3, 3, 0, 0]}>
                {yearlyDataWithAvg.map((entry, i) => {
                  const isLast = i === yearlyDataWithAvg.length - 1
                  const isPrev = i === yearlyDataWithAvg.length - 2
                  const isGrowing = isLast && yearlyDataWithAvg.length >= 2 && entry.total >= yearlyDataWithAvg[i - 1]?.total
                  return (
                    <Cell
                      key={entry.year}
                      fill={isLast ? (isGrowing ? "#10b981" : "#ef4444") : isPrev ? "var(--primary)" : "#9ca3af"}
                      opacity={isLast || isPrev ? 1 : 0.7}
                    />
                  )
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Interpretação */}
      <div className="text-xs text-muted-foreground">
        {analysis.tag === "Aristócrata" && (
          <span>✦ Empresa com histórico de mais de 5 anos pagando e crescendo dividendos — alta segurança de renda.</span>
        )}
        {analysis.tag === "Consistente" && (
          <span>✦ Pagamentos regulares nos últimos anos. Histórico positivo, mas monitore a continuidade.</span>
        )}
        {analysis.tag === "Irregular" && (
          <span>✦ Pagamentos inconsistentes. Priorize outros indicadores antes de contar com esses dividendos.</span>
        )}
      </div>
    </div>
  )
}
