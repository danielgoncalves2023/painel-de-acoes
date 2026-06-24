"use client"

import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/calculations"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Compass, HelpCircle, Flame, DollarSign, ShieldAlert, Eye, RefreshCw } from "lucide-react"
import Link from "next/link"
import { calcOpportunityScore } from "@/lib/scoring"
import { ScreenerChart } from "@/components/screener/ScreenerChart"

interface ScreenerStock {
  ticker: string
  name: string
  currentPrice: number
  dy: number
  pl: number
  pvp: number
  lpa: number
  vpa: number
  roe: number | null
  margemLiquida: number | null
  grahamValue: number
  grahamMargin: number
  bazinValue: number
  bazinMargin: number
}

interface SyncProgress {
  status: "idle" | "running" | "completed" | "error"
  current: number
  total: number
  lastTicker: string
}

export default function ScreenerPage() {
  const [stocks, setStocks] = useState<ScreenerStock[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedTickers, setSelectedTickers] = useState<string[]>([])

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // Filtros
  const [minDY, setMinDY] = useState<string>("")
  const [maxPL, setMaxPL] = useState<string>("")
  const [maxPVP, setMaxPVP] = useState<string>("")
  const [minGrahamMargin, setMinGrahamMargin] = useState<string>("")
  const [minBazinMargin, setMinBazinMargin] = useState<string>("")

  // Sincronização
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)

  useEffect(() => {
    async function init() {
      await Promise.all([loadStocks(), checkInitialSyncProgress()])
    }
    init()
  }, [])

  const loadStocks = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/screener")
      if (res.ok) {
        const data = await res.json()
        setStocks(data.results || [])
      }
    } catch (err) {
      console.error("Failed to load screener stocks:", err)
    } finally {
      setLoading(false)
    }
  }

  const checkInitialSyncProgress = async () => {
    try {
      const res = await fetch("/api/sync-fundamentals")
      if (res.ok) {
        const data = await res.json()
        if (data.status === "running") {
          setSyncProgress(data)
        }
      }
    } catch (err) {
      console.error("Erro ao checar progresso inicial:", err)
    }
  }

  // Polling para monitorar a sincronização
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (syncProgress && syncProgress.status === "running") {
      const checkProgress = async () => {
        try {
          const res = await fetch("/api/sync-fundamentals")
          if (res.ok) {
            const data = await res.json()
            setSyncProgress(data)
            if (data.status === "completed") {
              // Recarrega as ações quando o sync completa
              loadStocks()
            }
          }
        } catch (err) {
          console.error("Erro ao buscar progresso:", err)
        }
      }
      timer = setInterval(checkProgress, 1500)
    }
    return () => clearInterval(timer)
  }, [syncProgress])

  const handleStartSync = async () => {
    try {
      const res = await fetch("/api/sync-fundamentals", { method: "POST" })
      if (res.ok) {
        setSyncProgress({
          status: "running",
          current: 0,
          total: 160,
          lastTicker: "",
        })
      }
    } catch (err) {
      console.error("Erro ao iniciar sincronização:", err)
    }
  }

  // Resetar página de paginação quando os filtros mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [search, minDY, maxPL, maxPVP, minGrahamMargin, minBazinMargin])

  // Templates Rápidos
  const applyTemplate = (type: "GRAHAM" | "BAZIN" | "CHEAP") => {
    if (type === "GRAHAM") {
      setMinDY("")
      setMaxPL("15")
      setMaxPVP("1.5")
      setMinGrahamMargin("15")
      setMinBazinMargin("")
    } else if (type === "BAZIN") {
      setMinDY("8")
      setMaxPL("")
      setMaxPVP("")
      setMinGrahamMargin("")
      setMinBazinMargin("10")
    } else if (type === "CHEAP") {
      setMinDY("5")
      setMaxPL("8")
      setMaxPVP("1")
      setMinGrahamMargin("0")
      setMinBazinMargin("")
    }
  }

  const clearFilters = () => {
    setSearch("")
    setMinDY("")
    setMaxPL("")
    setMaxPVP("")
    setMinGrahamMargin("")
    setMinBazinMargin("")
    setSelectedTickers([])
  }

  // 1. Filtragem global dos dados
  const filteredStocks = stocks.filter(s => {
    if (search && !s.ticker.toLowerCase().includes(search.toLowerCase())) return false

    if (minDY) {
      const val = parseFloat(minDY)
      if (!isNaN(val) && s.dy < val) return false
    }
    if (maxPL) {
      const val = parseFloat(maxPL)
      if (!isNaN(val) && (s.pl <= 0 || s.pl > val)) return false
    }
    if (maxPVP) {
      const val = parseFloat(maxPVP)
      if (!isNaN(val) && (s.pvp <= 0 || s.pvp > val)) return false
    }
    if (minGrahamMargin) {
      const val = parseFloat(minGrahamMargin)
      if (!isNaN(val) && s.grahamMargin < val) return false
    }
    if (minBazinMargin) {
      const val = parseFloat(minBazinMargin)
      if (!isNaN(val) && s.bazinMargin < val) return false
    }

    return true
  })

  // 2. Ordenação global por Score composto
  const sortedStocks = filteredStocks
    .map(s => ({
      ...s,
      score: calcOpportunityScore({
        dy: s.dy,
        pl: s.pl,
        pvp: s.pvp,
        roe: s.roe,
        margemLiquida: s.margemLiquida,
        grahamMargin: s.grahamMargin,
      })
    }))
    .sort((a, b) => b.score.total - a.score.total)

  // 3. Paginação
  const totalPages = Math.max(Math.ceil(sortedStocks.length / itemsPerPage), 1)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedStocks = sortedStocks.slice(startIndex, startIndex + itemsPerPage)

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="text-primary" /> Radar B3
          </h1>
          <Button
            onClick={handleStartSync}
            disabled={syncProgress?.status === "running"}
            className="text-xs gap-1.5"
            variant="secondary"
          >
            <RefreshCw size={12} className={syncProgress?.status === "running" ? "animate-spin" : ""} />
            Sincronizar Fundamentos
          </Button>
        </div>

        {/* Banner de Sincronização em Progresso */}
        {syncProgress && syncProgress.status === "running" && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5 space-y-3">
            <div className="flex items-center justify-between text-sm flex-wrap gap-2">
              <span className="font-semibold text-yellow-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-ping" />
                Sincronizando fundamentos com a B3...
              </span>
              <span className="text-xs text-muted-foreground">
                {syncProgress.current} de {syncProgress.total} ações ({Math.round((syncProgress.current / syncProgress.total) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-yellow-500 h-2 transition-all duration-300"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>
            {syncProgress.lastTicker && (
              <p className="text-xs text-muted-foreground">
                Último ativo processado: <strong className="text-foreground">{syncProgress.lastTicker}</strong> (Intervalo de 200ms anti-bloqueio ativo)
              </p>
            )}
          </div>
        )}

        {/* Gráfico do Screener — acima dos filtros */}
        {!loading && stocks.length > 0 && (
          <ScreenerChart selectedTickers={selectedTickers} />
        )}

        {/* Painel de Filtros e Atalhos */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-semibold text-sm">Filtros Avançados</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => applyTemplate("GRAHAM")}
                size="sm"
                variant="outline"
                className="text-xs gap-1"
              >
                <Flame size={12} className="text-amber-500" /> Método Graham
              </Button>
              <Button
                onClick={() => applyTemplate("BAZIN")}
                size="sm"
                variant="outline"
                className="text-xs gap-1"
              >
                <DollarSign size={12} className="text-green-500" /> Dividendos Bazin (DY &gt; 8%)
              </Button>
              <Button
                onClick={() => applyTemplate("CHEAP")}
                size="sm"
                variant="outline"
                className="text-xs gap-1"
              >
                <ShieldAlert size={12} className="text-blue-500" /> Pechinchas B3 (P/L &lt; 8 & P/VP &lt; 1)
              </Button>
              <Button
                onClick={clearFilters}
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 pt-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Buscar Ação</label>
              <Input
                type="text"
                placeholder="Ex: PETR4"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                DY Mínimo (%)
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle size={10} className="text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">Dividend Yield: Relação entre dividendos pagos e cotação atual. Filtre ações geradoras de renda passiva.</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Input
                type="number"
                placeholder="Mínimo"
                value={minDY}
                onChange={e => setMinDY(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                P/L Máximo
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle size={10} className="text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">Preço/Lucro: Quantos anos de lucros o mercado aceita pagar pela empresa. Valores menores podem indicar desconto.</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Input
                type="number"
                placeholder="Máximo"
                value={maxPL}
                onChange={e => setMaxPL(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                P/VP Máximo
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle size={10} className="text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">Preço/Valor Patrimonial: Relação entre o preço da ação e o patrimônio líquido da empresa. Menos que 1 indica preço abaixo do valor contábil.</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Input
                type="number"
                placeholder="Máximo"
                value={maxPVP}
                onChange={e => setMaxPVP(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                Margem Graham (%)
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle size={10} className="text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">Margem de segurança entre o preço atual e o Valor Justo calculado pela fórmula de Benjamin Graham.</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Input
                type="number"
                placeholder="Margem Mínima"
                value={minGrahamMargin}
                onChange={e => setMinGrahamMargin(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                Margem Bazin (%)
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle size={10} className="text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">Margem de segurança entre o preço atual e o Preço Teto calculado a partir do dividendo atual e yield de 8%.</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Input
                type="number"
                placeholder="Margem Mínima"
                value={minBazinMargin}
                onChange={e => setMinBazinMargin(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>


        {/* Tabela do Screener */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Varrendo a B3 e cruzando valuations...</div>
        ) : stocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-4">
            <Compass size={48} className="mx-auto text-muted-foreground/50 animate-pulse" />
            <h3 className="text-lg font-semibold">Banco de dados de fundamentos vazio</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Para analisar as ações com as fórmulas de Graham e Bazin, você precisa sincronizar os fundamentos dos ativos no banco de dados local.
            </p>
            <Button
              onClick={handleStartSync}
              disabled={syncProgress?.status === "running"}
              className="gap-2"
            >
              Iniciar Sincronização
            </Button>
          </div>
        ) : sortedStocks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhuma ação atende aos critérios informados.</div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground border-b border-border">
                    <th className="text-center px-2 py-3 font-medium w-12">Compara</th>
                    <th className="text-left px-4 py-3 font-medium">Ação</th>
                    <ColHeader align="right" label="Score ▼" tip="Pontuação composta de 0 a 10 calculada com DY, P/L, P/VP, ROE, Margem Líquida e Margem Graham. Quanto maior, mais atrativa a ação como oportunidade de compra." />
                    <th className="text-right px-4 py-3 font-medium">Preço</th>
                    <ColHeader align="right" label="DY (%)" tip="Dividend Yield: relação entre dividendos pagos nos últimos 12 meses e o preço atual. Quanto maior, mais a ação distribui de lucro em relação ao seu preço." />
                    <ColHeader align="right" label="P/L" tip="Preço sobre Lucro: quantos anos de lucro atual o mercado paga pela ação. Valores menores geralmente indicam desconto em relação ao lucro gerado." />
                    <ColHeader align="right" label="P/VP" tip="Preço sobre Valor Patrimonial: compara o preço de mercado com o patrimônio líquido por ação. Abaixo de 1 indica que a empresa vale menos em bolsa do que seu patrimônio contábil." />
                    <ColHeader align="right" label="ROE" tip="Return on Equity: mede o lucro gerado pela empresa em relação ao patrimônio dos acionistas. ROE acima de 15% indica vantagem competitiva consistente." />
                    <ColHeader align="right" label="Margem Liq." tip="Margem Líquida: percentual da receita que sobra como lucro líquido. Margens altas indicam eficiência operacional e resiliência em períodos difíceis." />
                    <ColHeader align="right" label="Graham" tip="Margem de segurança pelo método de Benjamin Graham: diferença entre o preço justo calculado (√22,5 × LPA × VPA) e o preço atual. Acima de 25% é considerado seguro." />
                    <ColHeader align="right" label="Bazin" tip="Margem de segurança pelo método de Décio Bazin: diferença entre o preço teto (dividendo anualizado ÷ 8%) e o preço atual. Positivo significa que a ação paga pelo menos 8% de DY ao preço atual." />
                    <th className="text-center px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStocks.map(s => {
                    const isGrahamSafe = s.grahamMargin > 15
                    const isBazinSafe = s.bazinMargin > 15

                    return (
                      <tr key={s.ticker} className="border-b border-border hover:bg-muted/20">
                        <td className="px-2 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedTickers.includes(s.ticker)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (selectedTickers.length >= 5) {
                                  alert("Você pode selecionar no máximo 5 ações para comparação simultânea.")
                                  return
                                }
                                setSelectedTickers([...selectedTickers, s.ticker])
                              } else {
                                setSelectedTickers(selectedTickers.filter(t => t !== s.ticker))
                              }
                            }}
                            className="rounded border-border bg-background checked:bg-primary text-primary focus:ring-primary h-4 w-4 cursor-pointer accent-primary"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-foreground">{s.ticker}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{s.name}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.score.label !== "Sem dados" ? (
                            <span className={`font-bold text-sm ${s.score.color}`}>
                              {s.score.total.toFixed(1)}
                              <span className="text-[10px] font-normal ml-1 opacity-75">{s.score.label}</span>
                            </span>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(s.currentPrice)}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{s.dy > 0 ? `${s.dy.toFixed(2)}%` : "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{s.pl > 0 ? s.pl.toFixed(1) : "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{s.pvp > 0 ? s.pvp.toFixed(2) : "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">
                          {s.roe != null ? `${(s.roe * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">
                          {s.margemLiquida != null ? `${(s.margemLiquida * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {s.grahamValue > 0 ? (
                            <span className={isGrahamSafe ? "text-green-500" : s.grahamMargin > 0 ? "text-yellow-500" : "text-red-500"}>
                              {s.grahamMargin.toFixed(1)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {s.bazinValue > 0 ? (
                            <span className={isBazinSafe ? "text-green-500" : s.bazinMargin > 0 ? "text-yellow-500" : "text-red-500"}>
                              {s.bazinMargin.toFixed(1)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link href={`/stock/${s.ticker}`} className="inline-block p-1 text-muted-foreground hover:text-primary transition-colors">
                            <Eye size={16} />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Controles de Paginação */}
            <div className="flex items-center justify-between px-4 py-4 border-t border-border text-xs text-muted-foreground bg-card">
              <div>
                Exibindo {startIndex + 1} a {Math.min(startIndex + itemsPerPage, sortedStocks.length)} de {sortedStocks.length} ações
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5"
                >
                  Anterior
                </Button>
                <span className="font-medium text-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5"
                >
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

function ColHeader({ label, tip, align }: { label: string; tip: string; align: "left" | "right" | "center" }) {
  return (
    <th className={`text-${align} px-4 py-3 font-medium`}>
      <Tooltip>
        <TooltipTrigger className="flex items-center gap-1 cursor-help underline decoration-dashed underline-offset-2 w-full justify-end">
          {label}
          <HelpCircle size={10} className="shrink-0" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] text-xs leading-relaxed font-normal">
          {tip}
        </TooltipContent>
      </Tooltip>
    </th>
  )
}
