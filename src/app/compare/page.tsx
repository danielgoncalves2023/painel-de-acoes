"use client"

import { useState } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { HistoricalPrice, QuoteWithModules } from "@/types"
import { formatCurrency } from "@/lib/calculations"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X, Plus } from "lucide-react"
import { format } from "date-fns"
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899"]

interface StockData {
  ticker: string
  quote: QuoteWithModules
  history: HistoricalPrice[]
}

function normalize(history: HistoricalPrice[]): { date: string; value: number }[] {
  if (history.length === 0) return []
  const base = history[0].close
  return history.map((h) => ({
    date: typeof h.date === "number" ? new Date(h.date * 1000).toISOString() : h.date,
    value: base > 0 ? (h.close / base) * 100 : 0,
  }))
}

export default function ComparePage() {
  const [tickers, setTickers] = useState<string[]>([])
  const [input, setInput] = useState("")
  const [stocks, setStocks] = useState<StockData[]>([])
  const [loading, setLoading] = useState(false)

  async function addTicker() {
    const t = input.trim().toUpperCase()
    if (!t || tickers.includes(t) || tickers.length >= 4) return
    setLoading(true)
    try {
      const [detailsRes, histRes] = await Promise.all([
        fetch(`/api/quotes/${t}/details`),
        fetch(`/api/quotes/${t}/historical?range=1y`),
      ])
      const quote: QuoteWithModules = await detailsRes.json()
      const history: HistoricalPrice[] = await histRes.json()
      setTickers((prev) => [...prev, t])
      setStocks((prev) => [...prev, { ticker: t, quote, history }])
      setInput("")
    } finally {
      setLoading(false)
    }
  }

  function removeTicker(t: string) {
    setTickers((prev) => prev.filter((x) => x !== t))
    setStocks((prev) => prev.filter((x) => x.ticker !== t))
  }

  // Mesclar datas para o gráfico normalizado
  const chartData = (() => {
    if (stocks.length === 0) return []
    const normalized = stocks.map((s) => normalize(s.history))
    const minLen = Math.min(...normalized.map((n) => n.length))
    return Array.from({ length: minLen }, (_, i) => {
      const entry: Record<string, string | number> = { date: normalized[0][i].date }
      stocks.forEach((s, si) => { entry[s.ticker] = normalized[si][i]?.value ?? 0 })
      return entry
    })
  })()

  function IndicatorRow({ label, tooltip, values }: { label: string; tooltip?: string; values: (string | null)[] }) {
    return (
      <tr className="border-b border-border hover:bg-muted/20">
        <td className="py-2 px-4 text-xs text-muted-foreground font-medium">
          {tooltip ? (
            <UITooltip>
              <TooltipTrigger className="cursor-help underline decoration-dashed underline-offset-2 text-left">
                {label}
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px] text-sm leading-relaxed font-normal">
                {tooltip}
              </TooltipContent>
            </UITooltip>
          ) : (
            label
          )}
        </td>
        {values.map((v, i) => (
          <td key={i} className="py-2 px-4 text-sm text-center font-medium">{v ?? "—"}</td>
        ))}
      </tr>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Comparar Ações</h1>

      {/* Input */}
      <div className="flex gap-2 flex-wrap items-center">
        {tickers.map((t, i) => (
          <span key={t} className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white" style={{ background: COLORS[i] }}>
            {t}
            <button onClick={() => removeTicker(t)}><X size={12} /></button>
          </span>
        ))}
        {tickers.length < 4 && (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && addTicker()}
              placeholder="VALE3"
              className="w-28"
            />
            <Button size="sm" onClick={addTicker} disabled={loading || !input.trim()}>
              <Plus size={16} />
            </Button>
          </div>
        )}
      </div>

      {stocks.length === 0 && (
        <div className="rounded-lg border border-border p-12 text-center text-muted-foreground text-sm">
          Adicione até 4 ações para comparar.
        </div>
      )}

      {/* Gráfico normalizado */}
      {stocks.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm mb-4">Performance Relativa (base 100) — 1 Ano</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  try { return format(new Date(v), "MM/yy") } catch { return String(v) }
                }}
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v.toFixed(0)}`}
                width={40}
              />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12, color: "#f4f4f5" }}
                itemStyle={{ fontWeight: 500 }}
                labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
                formatter={(value: any, name: any) => [`${Number(value).toFixed(1)}`, name]}
                labelFormatter={(v) => {
                  try { return format(new Date(v), "dd/MM/yyyy") } catch { return String(v) }
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
              {stocks.map((s, i) => (
                <Line key={s.ticker} type="monotone" dataKey={s.ticker} stroke={COLORS[i]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela side-by-side */}
      {stocks.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Indicador</th>
                {stocks.map((s, i) => (
                  <th key={s.ticker} className="text-center px-4 py-3 font-semibold" style={{ color: COLORS[i] }}>{s.ticker}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <IndicatorRow label="Preço Atual" values={stocks.map((s) => formatCurrency(s.quote.regularMarketPrice))} />
              <IndicatorRow label="Var. Dia" values={stocks.map((s) => `${s.quote.regularMarketChangePercent?.toFixed(2) ?? "—"}%`)} />
              <IndicatorRow label="Dividend Yield" tooltip="Mostra a relação entre os dividendos pagos nos últimos 12 meses e o preço atual. Um DY alto indica distribuição forte, mas a sustentabilidade deve ser checada." values={stocks.map((s) => s.quote.dividendYield != null ? `${s.quote.dividendYield.toFixed(2)}%` : null)} />
              <IndicatorRow label="P/L" tooltip="Preço/Lucro. P/L baixo sugere que a ação está descontada (ou desacreditada). P/L alto sinaliza expectativa de crescimento." values={stocks.map((s) => s.quote.priceEarnings?.toFixed(1) ?? null)} />
              <IndicatorRow label="P/VP" tooltip="Preço/Valor Patrimonial. P/VP < 1 significa que a empresa vale na bolsa menos do que seu patrimônio (indicando desconto)." values={stocks.map((s) => s.quote.defaultKeyStatistics?.priceToBook?.toFixed(2) ?? null)} />
              <IndicatorRow label="LPA" tooltip="Lucro Por Ação. Crescimento consistente do LPA revela boa rentabilidade repassada aos acionistas." values={stocks.map((s) => s.quote.earningsPerShare != null ? formatCurrency(s.quote.earningsPerShare) : null)} />
              <IndicatorRow label="ROE" tooltip="Retorno sobre Patrimônio Líquido. ROE alto e consistente revela eficiência no uso de capital e vantagem competitiva do negócio." values={stocks.map((s) => s.quote.defaultKeyStatistics?.returnOnEquity != null ? `${(s.quote.defaultKeyStatistics.returnOnEquity * 100).toFixed(1)}%` : null)} />
              <IndicatorRow label="Margem Líquida" tooltip="Porcentagem de receita convertida em lucro. Margens altas fornecem maior segurança em momentos de retração de mercado." values={stocks.map((s) => s.quote.defaultKeyStatistics?.profitMargins != null ? `${(s.quote.defaultKeyStatistics.profitMargins * 100).toFixed(1)}%` : null)} />
              <IndicatorRow label="Máx 52 semanas" tooltip="Resistência anual. Informa a distância que a ação está de sua cotação máxima recente." values={stocks.map((s) => s.quote.fiftyTwoWeekHigh != null ? formatCurrency(s.quote.fiftyTwoWeekHigh) : null)} />
              <IndicatorRow label="Mín 52 semanas" tooltip="Suporte anual. Ajuda a entender se a ação aproxima-se dos seus preços mais baixos recentemente alcançados." values={stocks.map((s) => s.quote.fiftyTwoWeekLow != null ? formatCurrency(s.quote.fiftyTwoWeekLow) : null)} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
