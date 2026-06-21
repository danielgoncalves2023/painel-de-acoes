import { analyzeDividends } from "@/lib/scoring"
import { QuoteWithModules } from "@/types"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

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

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
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
          <div className="font-semibold">
            R$ {analysis.avgAnnual.toFixed(2)} / ação
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg px-4 py-3">
          <div className="text-xs text-muted-foreground mb-1">Crescimento (CAGR 3a)</div>
          <div className={`font-semibold flex items-center gap-1 ${
            cagrPositive ? "text-green-500" : cagrNegative ? "text-red-500" : "text-muted-foreground"
          }`}>
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

      {/* Interpretação */}
      <div className="mt-3 text-xs text-muted-foreground">
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
