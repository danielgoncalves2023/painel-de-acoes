"use client"

import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/calculations"
import { Calendar, DollarSign, ArrowUpRight, TrendingUp, HelpCircle, Briefcase, Star, Bell } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ProventoEvent {
  ticker: string
  type: "PAGO" | "PREVISTO"
  source: "carteira" | "favoritas"
  amount: number
  date: string
  dataCom?: string
}

export default function ProventosPage() {
  const [events, setEvents] = useState<ProventoEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"ALL" | "PAGO" | "PREVISTO">("ALL")
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "carteira" | "favoritas">("ALL")
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch("/api/proventos")
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events || [])
        }
      } catch (err) {
        console.error("Falha ao carregar proventos:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Filtros
  const filteredEvents = events.filter(e => {
    if (filter !== "ALL" && e.type !== filter) return false
    if (sourceFilter !== "ALL" && e.source !== sourceFilter) return false
    if (search.trim() && !e.ticker.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  })

  // Estatísticas
  const totalPago = events
    .filter(e => e.type === "PAGO")
    .reduce((acc, e) => acc + e.amount, 0)

  const totalPrevisto = events
    .filter(e => e.type === "PREVISTO")
    .reduce((acc, e) => acc + e.amount, 0)

  const formatDisplayDate = (dateStr: string) => {
    const parts = dateStr.split("-")
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-primary" /> Calendário de Dividendos
          </h1>
        </div>

        {/* Grid de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10 text-green-500">
              <DollarSign size={24} />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Acumulado Recebido (12M)</span>
              <span className="text-xl font-bold text-green-500">{formatCurrency(totalPago)}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">*Soma unitária por ação da carteira</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
              <ArrowUpRight size={24} />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Previsão Anunciada (Próximos)</span>
              <span className="text-xl font-bold text-amber-500">{formatCurrency(totalPrevisto)}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">*Últimos proventos futuros declarados</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <TrendingUp size={24} />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Ativos Rastreados</span>
              <span className="text-xl font-bold text-foreground">
                {[...new Set(events.map(e => e.ticker))].length} ações
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Sua Carteira + Favoritas</span>
            </div>
          </div>
        </div>

        {/* Filtros e Tabela */}
        <div className="space-y-4">
          {/* Filtros de origem e busca */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 p-1 rounded-lg bg-muted/40 border border-border">
              {[
                { value: "ALL", label: "Todas" },
                { value: "carteira", label: "Carteira" },
                { value: "favoritas", label: "Favoritas" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSourceFilter(opt.value as any)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    sourceFilter === opt.value
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.value === "carteira" && <Briefcase size={10} className="inline mr-1" />}
                  {opt.value === "favoritas" && <Star size={10} className="inline mr-1" />}
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Buscar ação (ex: ITSA4)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary w-48"
            />
            {(sourceFilter !== "ALL" || search) && (
              <button
                onClick={() => { setSourceFilter("ALL"); setSearch("") }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="flex gap-2 border-b border-border pb-px">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                filter === "ALL" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter("PAGO")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                filter === "PAGO" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Pagos Recentes
            </button>
            <button
              onClick={() => setFilter("PREVISTO")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                filter === "PREVISTO" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Declarados / Futuros
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando proventos...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum evento de provento localizado para este filtro.</div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground border-b border-border">
                    <th className="text-left px-5 py-3 font-medium">Ação</th>
                    <th className="text-left px-5 py-3 font-medium">Tipo</th>
                    <th className="text-right px-5 py-3 font-medium">Valor Unitário</th>
                    <th className="text-right px-5 py-3 font-medium">
                      <div className="flex items-center justify-end gap-1">
                        Data "Com" (Corte)
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle size={11} className="text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs font-normal">
                            Último dia em que você precisa possuir a ação na carteira para ter direito a receber este provento.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                    <th className="text-right px-5 py-3 font-medium">
                      <div className="flex items-center justify-end gap-1">
                        Data Ex
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle size={11} className="text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs font-normal">
                            A partir deste dia (inclusive), quem comprar a ação não tem mais direito a receber este provento específico.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                    <th className="text-center px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((e, index) => (
                    <tr key={`${e.ticker}-${e.date}-${index}`} className="border-b border-border hover:bg-muted/20">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{e.ticker}</span>
                          {e.source === "carteira" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                              <Briefcase size={9} /> Carteira
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500">
                              <Star size={9} /> Favorita
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        Provento Dinheiro
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-foreground">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-muted-foreground">
                        {e.dataCom ? formatDisplayDate(e.dataCom) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-foreground">
                        {formatDisplayDate(e.date)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {(() => {
                          if (e.type === "PAGO") {
                            return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-500/10 text-green-500">PAGO</span>
                          }
                          const daysUntil = Math.ceil((new Date(e.date).getTime() - Date.now()) / 86_400_000)
                          if (daysUntil <= 3) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse">
                                <Bell size={10} /> URGENTE ({daysUntil === 0 ? "hoje" : `${daysUntil}d`})
                              </span>
                            )
                          }
                          if (daysUntil <= 7) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                                <Bell size={10} /> EM {daysUntil}d
                              </span>
                            )
                          }
                          return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-500">PREVISTO</span>
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
