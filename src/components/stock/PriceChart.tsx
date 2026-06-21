"use client"

import { useState, useEffect } from "react"
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart
} from "recharts"
import { HistoricalPrice } from "@/types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatCurrency } from "@/lib/calculations"
import { Label } from "@/components/ui/label"
import { HelpCircle } from "lucide-react"
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const RANGES = [
  { label: "1S", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1A", value: "1y" },
  { label: "2A", value: "2y" },
] as const

interface Props {
  ticker: string
}

// Funções matemáticas de indicadores
function calculateSMA(prices: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = []
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(null)
    } else {
      let sum = 0
      for (let j = 0; j < period; j++) {
        sum += prices[i - j]
      }
      sma.push(sum / period)
    }
  }
  return sma
}

function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const rsi: (number | null)[] = []
  if (prices.length < period + 1) {
    return new Array(prices.length).fill(null)
  }

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff > 0) {
      gains += diff
    } else {
      losses -= diff
    }
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = 0; i < period; i++) {
    rsi.push(null)
  }

  const firstRS = avgLoss === 0 ? 0 : avgGain / avgLoss
  rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + firstRS)))

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    const currentGain = diff > 0 ? diff : 0
    const currentLoss = diff < 0 ? -diff : 0

    avgGain = (avgGain * (period - 1) + currentGain) / period
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period

    const rs = avgLoss === 0 ? 0 : avgGain / avgLoss
    rsi.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + rs)))
  }

  return rsi
}

export function PriceChart({ ticker }: Props) {
  const [range, setRange] = useState<string>("1y")
  const [data, setData] = useState<HistoricalPrice[]>([])
  const [loading, setLoading] = useState(true)

  // Estados dos Checkboxes
  const [showSMA20, setShowSMA20] = useState(false)
  const [showSMA50, setShowSMA50] = useState(false)
  const [showRSI, setShowRSI] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/quotes/${ticker}/historical?range=${range}`)
      .then((r) => r.json())
      .then((d) => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setData([]); setLoading(false) })
  }, [ticker, range])

  const isPositive = data.length >= 2 && data[data.length - 1].close >= data[0].close
  const color = isPositive ? "#22c55e" : "#ef4444"

  const prices = data.map(d => d.close)
  const sma20Values = calculateSMA(prices, 20)
  const sma50Values = calculateSMA(prices, 50)
  const rsiValues = calculateRSI(prices, 14)

  const chartData = data.map((d, i) => ({
    date: typeof d.date === "number" ? new Date(d.date * 1000).toISOString() : d.date,
    close: d.close,
    sma20: sma20Values[i],
    sma50: sma50Values[i],
    rsi: rsiValues[i]
  }))

  // Diagnósticos Técnicos
  const lastPrice = prices[prices.length - 1] || 0
  const lastSMA20 = sma20Values[sma20Values.length - 1]
  const lastSMA50 = sma50Values[sma50Values.length - 1]
  const lastRSI = rsiValues[rsiValues.length - 1]

  let trendSignal = "Indefinida ⚖️"
  let trendClass = "text-muted-foreground"
  if (lastSMA20 && lastSMA50) {
    if (lastPrice > lastSMA20 && lastPrice > lastSMA50) {
      trendSignal = "Alta de Curto/Médio Prazo 📈"
      trendClass = "text-green-500"
    } else if (lastPrice < lastSMA20 && lastPrice < lastSMA50) {
      trendSignal = "Baixa de Curto/Médio Prazo 📉"
      trendClass = "text-red-500"
    }
  }

  let rsiSignal = "Neutro 🔵"
  let rsiClass = "text-blue-500"
  if (lastRSI !== null && lastRSI !== undefined) {
    if (lastRSI < 30) {
      rsiSignal = `Sobrevendido (${lastRSI.toFixed(1)}) - Oportunidade! 🟢`
      rsiClass = "text-green-500"
    } else if (lastRSI > 70) {
      rsiSignal = `Sobrecomprado (${lastRSI.toFixed(1)}) - Alerta! 🔴`
      rsiClass = "text-red-500"
    } else {
      rsiSignal = `Neutro (${lastRSI.toFixed(1)}) 🔵`
    }
  }

  return (
    <div className="space-y-4">
      {/* Painel Técnico */}
      <div className="flex flex-wrap gap-4 items-center justify-between p-3 rounded-xl border border-border bg-card text-xs">
        <div className="flex gap-4">
          <div>
            <span className="text-muted-foreground">Tendência: </span>
            <span className={`font-semibold ${trendClass}`}>{trendSignal}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Força (RSI): </span>
            <span className={`font-semibold ${rsiClass}`}>{rsiSignal}</span>
          </div>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${range === r.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
                }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          Carregando histórico...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Gráfico Principal (Preços e Médias) */}
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(v) => format(new Date(v), "dd/MM", { locale: ptBR })}
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCurrency(v)}
                width={60}
              />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 12, color: "#f4f4f5" }}
                itemStyle={{ fontWeight: 500, color: "#f4f4f5" }}
                labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
                formatter={(value: any, name: any) => {
                  if (name === "close") return [formatCurrency(Number(value)), "Preço"]
                  if (name === "sma20") return [formatCurrency(Number(value)), "Média 20"]
                  if (name === "sma50") return [formatCurrency(Number(value)), "Média 50"]
                  return [value, name]
                }}
                labelFormatter={(v) => format(new Date(v), "dd/MM/yyyy", { locale: ptBR })}
              />
              <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#colorClose)" dot={false} />

              {showSMA20 && (
                <Line type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="sma20" />
              )}
              {showSMA50 && (
                <Line type="monotone" dataKey="sma50" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="sma50" />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Gráfico do RSI */}
          {showRSI && (
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold px-2">RSI (14)</span>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#a1a1aa" }} width={30} ticks={[30, 70]} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 10, color: "#f4f4f5" }}
                    labelFormatter={(v) => format(new Date(v), "dd/MM/yyyy", { locale: ptBR })}
                    formatter={(v) => [Number(v).toFixed(2), "RSI"]}
                  />
                  <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '70', fill: '#ef4444', fontSize: 9, position: 'insideRight' }} />
                  <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '30', fill: '#22c55e', fontSize: 9, position: 'insideRight' }} />
                  <Line type="monotone" dataKey="rsi" stroke="#a855f7" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Seletores de Indicadores */}
          <div className="flex flex-wrap gap-6 pt-2 border-t border-border/40 text-xs">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sma20"
                checked={showSMA20}
                onChange={(e) => setShowSMA20(e.target.checked)}
                className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4 accent-amber-500 cursor-pointer"
              />
              <Label htmlFor="sma20" className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                Média Móvel de 20 Períodos (Curto Prazo)
                <UITooltip>
                  <TooltipTrigger>
                    <HelpCircle size={12} className="text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">MMA20: Média do preço dos últimos 20 dias. Cruzamentos do preço acima da média sugerem força de compra imediata.</p>
                  </TooltipContent>
                </UITooltip>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sma50"
                checked={showSMA50}
                onChange={(e) => setShowSMA50(e.target.checked)}
                className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4 accent-blue-500 cursor-pointer"
              />
              <Label htmlFor="sma50" className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                Média Móvel de 50 Períodos (Médio Prazo)
                <UITooltip>
                  <TooltipTrigger>
                    <HelpCircle size={12} className="text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">MMA50: Média do preço dos últimos 50 dias. Auxilia a rastrear tendências de médio prazo e suportes importantes.</p>
                  </TooltipContent>
                </UITooltip>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rsi"
                checked={showRSI}
                onChange={(e) => setShowRSI(e.target.checked)}
                className="rounded border-border bg-background text-primary focus:ring-primary h-4 w-4 accent-purple-500 cursor-pointer"
              />
              <Label htmlFor="rsi" className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                Índice de Força Relativa (RSI)
                <UITooltip>
                  <TooltipTrigger>
                    <HelpCircle size={12} className="text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">RSI (ou IFR): Mede o momento da variação do preço. Valores abaixo de 30 indicam que a ação está barata/sobrevendida. Acima de 70 indicam sobrecompra (alto risco).</p>
                  </TooltipContent>
                </UITooltip>
              </Label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
