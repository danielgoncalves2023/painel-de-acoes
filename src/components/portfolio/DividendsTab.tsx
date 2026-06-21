"use client"

import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/calculations"
import { formatDateUTC } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Landmark, CalendarRange, Search } from "lucide-react"

interface DividendItem {
  ticker: string
  name: string
  exDate: string
  amount: number
  quantity: number
  total: number
  status: "Pago" | "Provisionado"
}

interface DividendsSummary {
  totalPaid: number
  totalProvisioned: number
}

export function DividendsTab() {
  const [dividends, setDividends] = useState<DividendItem[]>([])
  const [summary, setSummary] = useState<DividendsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Busca e filtros
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  useEffect(() => {
    async function loadDividends() {
      setLoading(true)
      try {
        const res = await fetch("/api/portfolio/dividends")
        if (res.ok) {
          const json = await res.json()
          setDividends(json.dividends || [])
          setSummary(json.summary || null)
        }
      } catch (err) {
        console.error("Erro ao carregar dividendos:", err)
      } finally {
        setLoading(false)
      }
    }
    loadDividends()
  }, [])

  // Resetar página de paginação quando os filtros mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const filteredDividends = dividends.filter(d => {
    if (search && !d.ticker.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Paginação
  const totalPages = Math.max(Math.ceil(filteredDividends.length / itemsPerPage), 1)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedDividends = filteredDividends.slice(startIndex, startIndex + itemsPerPage)

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
        <div className="h-10 bg-muted rounded-lg w-full max-w-xs" />
        <div className="h-[300px] bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumo do Topo */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Landmark size={14} className="text-green-500" /> Total Recebido (Histórico)
            </span>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(summary.totalPaid)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarRange size={14} className="text-yellow-500" /> Provisionado (A Receber Futuro)
            </span>
            <div className="text-2xl font-bold text-yellow-500">{formatCurrency(summary.totalProvisioned)}</div>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Pesquisa */}
      <div className="flex items-center gap-3 w-full max-w-xs relative">
        <Search size={14} className="absolute left-3 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Filtrar por ação (ex: PETR4)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 pl-9 text-xs"
        />
      </div>

      {/* Tabela de Resultados */}
      {filteredDividends.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum provento encontrado para o filtro informado.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-xs text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-3 font-medium">Ação</th>
                  <th className="text-right px-4 py-3 font-medium">Data Ex</th>
                  <th className="text-right px-4 py-3 font-medium">Saldo na Data</th>
                  <th className="text-right px-4 py-3 font-medium">Valor/Ação</th>
                  <th className="text-right px-4 py-3 font-medium">Valor Total</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDividends.map((d, index) => {
                  const formattedExDate = formatDateUTC(d.exDate)

                  return (
                    <tr key={`${d.ticker}-${d.exDate}-${index}`} className="border-b border-border hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <span className="font-bold text-foreground">{d.ticker}</span>
                        <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">{d.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{formattedExDate}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{d.quantity} {d.quantity === 1 ? "ação" : "ações"}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(d.amount)}</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">{formatCurrency(d.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            d.status === "Pago"
                              ? "bg-green-500/10 border-green-500/30 text-green-500"
                              : "bg-yellow-500/10 border-yellow-500/30 text-yellow-500"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Controles de Paginação */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-border text-xs text-muted-foreground">
            <div>
              Exibindo {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredDividends.length)} de {filteredDividends.length} lançamentos
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
  )
}
