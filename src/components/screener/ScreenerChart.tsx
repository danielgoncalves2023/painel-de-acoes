"use client"

import { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReChartsTooltip,
  ResponsiveContainer,
  Legend
} from "recharts"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Calendar, Percent } from "lucide-react"

interface HistoricalPoint {
  date: string
  close: number
}

interface ChartDataPoint {
  dateLabel: string
  [key: string]: number | string
}

interface Props {
  selectedTickers: string[]
}

const COLORS = [
  "#6366f1", // Indigo
  "#ec4899", // Rosa
  "#10b981", // Esmeralda
  "#f59e0b", // Âmbar
  "#3b82f6", // Azul
  "#a855f7", // Roxo
]

export function ScreenerChart({ selectedTickers }: Props) {
  const [range, setRange] = useState<"5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y">("3mo")
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [firstIbovValue, setFirstIbovValue] = useState<number>(0)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        // Carrega o Ibovespa (BVSP) sempre
        const tickersToFetch = ["BVSP", ...selectedTickers]
        
        const fetchPromises = tickersToFetch.map(async (ticker) => {
          const res = await fetch(`/api/quotes/${ticker}/historical?range=${range}`)
          if (!res.ok) throw new Error(`Falha ao obter histórico de ${ticker}`)
          const data: HistoricalPoint[] = await res.json()
          return { ticker, data }
        })

        const results = await Promise.all(fetchPromises)

        // Alinha e normaliza os dados históricos
        const ibovResult = results.find((r) => r.ticker === "BVSP")
        if (!ibovResult || ibovResult.data.length === 0) {
          setChartData([])
          return
        }

        const ibovPoints = ibovResult.data
        const firstIbovClose = ibovPoints[0].close
        setFirstIbovValue(firstIbovClose)

        // Mapeia os dados tendo como base as datas do Ibovespa
        const alignedData: ChartDataPoint[] = ibovPoints.map((ibovPoint, index) => {
          const dateObj = new Date(ibovPoint.date)
          // Formatação simples da data baseada no range
          const dateLabel = range === "5d" 
            ? dateObj.toLocaleDateString("pt-BR", { weekday: "short" })
            : dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })

          // Normaliza o retorno acumulado do Ibovespa (%)
          // Se for o primeiro ponto (index === 0), o retorno é 0%
          const ibovReturn = firstIbovClose > 0 
            ? ((ibovPoint.close - firstIbovClose) / firstIbovClose) * 100 
            : 0

          const point: ChartDataPoint = {
            dateLabel,
            "IBOVESPA (IBOV)": parseFloat(ibovReturn.toFixed(2))
          }

          // Adiciona os retornos das ações selecionadas
          results.forEach((res) => {
            if (res.ticker === "BVSP") return

            // Encontra a cotação da ação na data correspondente (ou a mais próxima anterior se houver feriado)
            const targetDateStr = ibovPoint.date.split("T")[0]
            let stockPoint = res.data.find((p) => p.date.startsWith(targetDateStr))
            
            // Fallback se não encontrar correspondência exata de fuso horário/data
            if (!stockPoint && index > 0) {
              const ibovTime = new Date(ibovPoint.date).getTime()
              // Procura o ponto mais próximo no tempo
              let minDiff = Infinity
              res.data.forEach((p) => {
                const diff = Math.abs(new Date(p.date).getTime() - ibovTime)
                if (diff < minDiff) {
                  minDiff = diff
                  stockPoint = p
                }
              })
            }

            const firstStockClose = res.data.length > 0 ? res.data[0].close : 0

            if (stockPoint && firstStockClose > 0) {
              const stockReturn = ((stockPoint.close - firstStockClose) / firstStockClose) * 100
              point[res.ticker] = parseFloat(stockReturn.toFixed(2))
            } else {
              // Se não houver dados, mantém 0 ou o último valor
              point[res.ticker] = 0
            }
          })

          return point
        })

        setChartData(alignedData)
      } catch (err) {
        console.error("Erro no gráfico comparativo:", err)
        setError("Erro ao carregar dados históricos de comparação.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedTickers, range])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Ordena do maior retorno para o menor no tooltip para facilitar leitura
      const sortedPayload = [...payload].sort((a: any, b: any) => b.value - a.value)
      
      return (
        <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs space-y-1.5">
          <p className="font-semibold border-b border-border pb-1 mb-1 text-foreground">{label}</p>
          {sortedPayload.map((p: any) => {
            const isIbov = p.name.includes("IBOVESPA")
            const isPos = p.value >= 0
            return (
              <div key={p.name} className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-1.5" style={{ color: p.color }}>
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: p.color }} 
                  />
                  {p.name}:
                </span>
                <span className={`font-bold ${isPos ? "text-green-500" : "text-red-500"}`}>
                  {isPos ? "+" : ""}{p.value.toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  // Descobre se o Ibovespa subiu ou desceu no período selecionado
  const getIbovPerformance = () => {
    if (chartData.length < 2) return { isUp: true, val: 0 }
    const lastPoint = chartData[chartData.length - 1]
    const ibovVal = Number(lastPoint["IBOVESPA (IBOV)"] ?? 0)
    return {
      isUp: ibovVal >= 0,
      val: Math.abs(ibovVal)
    }
  }

  const perf = getIbovPerformance()

  // Calcula o domínio dinâmico para sincronizar os eixos Y da esquerda (%) e direita (pontos)
  const getDomain = () => {
    if (chartData.length === 0) return [-10, 10]
    const values: number[] = []
    chartData.forEach((d) => {
      Object.keys(d).forEach((key) => {
        if (key !== "dateLabel" && typeof d[key] === "number") {
          values.push(d[key] as number)
        }
      })
    })
    if (values.length === 0) return [-10, 10]
    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = (max - min) * 0.15 || 1
    return [parseFloat((min - padding).toFixed(1)), parseFloat((max + padding).toFixed(1))]
  }

  const domainY = getDomain()

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="font-bold text-base flex items-center gap-1.5 text-foreground">
            <Calendar size={18} className="text-primary" /> Histórico comparativo vs Ibovespa
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Retorno acumulado (%) a partir do primeiro dia do período selecionado.
            {chartData.length > 0 && (
              <span className="inline-flex items-center gap-0.5 ml-1 font-semibold">
                Ibovespa no período: 
                <span className={perf.isUp ? "text-green-500" : "text-red-500"}>
                  {perf.isUp ? "+" : "-"}{perf.val.toFixed(1)}%
                </span>
                {perf.isUp ? <TrendingUp size={12} className="text-green-500" /> : <TrendingDown size={12} className="text-red-500" />}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-1 border border-border rounded-lg p-0.5 bg-muted/30">
          {[
            { id: "5d", label: "1S" },
            { id: "1mo", label: "1M" },
            { id: "3mo", label: "3M" },
            { id: "6mo", label: "6M" },
            { id: "1y", label: "1A" },
            { id: "2y", label: "2A" }
          ].map((item) => (
            <Button
              key={item.id}
              onClick={() => setRange(item.id as any)}
              variant={range === item.id ? "secondary" : "ghost"}
              size="sm"
              className="text-xs px-2.5 h-7 rounded-md"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[250px] flex flex-col items-center justify-center space-y-2 animate-pulse bg-muted/10 rounded-xl">
          <Percent size={24} className="text-muted-foreground animate-spin" />
          <span className="text-xs text-muted-foreground">Normalizando cotações históricas...</span>
        </div>
      ) : error ? (
        <div className="h-[250px] flex items-center justify-center text-xs text-red-500 bg-red-500/5 rounded-xl border border-red-500/10">
          {error}
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[250px] flex items-center justify-center text-xs text-muted-foreground">
          Sem dados históricos disponíveis para o período.
        </div>
      ) : (
        <div className="w-full text-xs">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 10, right: 70, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={{ stroke: "#333" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                domain={domainY}
                tickFormatter={(tick) => `${tick > 0 ? "+" : ""}${tick}%`}
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={domainY}
                tickFormatter={(tick) => {
                  if (firstIbovValue === 0) return ""
                  const absolutePoints = firstIbovValue * (1 + tick / 100)
                  return `${(absolutePoints / 1000).toFixed(0)}k`
                }}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={68}
              />
              <ReChartsTooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
              <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" />
              
              {/* Linha transparente no eixo direito — força Recharts a renderizar o YAxis direito */}
              <Line
                yAxisId="right"
                dataKey="IBOVESPA (IBOV)"
                stroke="transparent"
                strokeWidth={0}
                dot={false}
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
              />
              {/* Linha do Ibovespa (Benchmark) */}
              <Line
                yAxisId="left"
                name="IBOVESPA (IBOV)"
                type="monotone"
                dataKey="IBOVESPA (IBOV)"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />

              {/* Linhas das Ações Selecionadas */}
              {selectedTickers.map((ticker, index) => (
                <Line
                  key={ticker}
                  yAxisId="left"
                  name={ticker}
                  type="monotone"
                  dataKey={ticker}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
