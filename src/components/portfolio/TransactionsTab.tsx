"use client"

import { useEffect, useState, useCallback } from "react"
import { Transaction } from "@/types"
import { AddTransactionDialog } from "@/components/portfolio/AddTransactionDialog"
import { formatCurrency } from "@/lib/calculations"
import { Trash2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"
import { cn, formatDateUTC } from "@/lib/utils"

export function TransactionsTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/transactions")
    const data = res.ok ? await res.json() : []
    setTransactions(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm("Excluir este lançamento?")) return
    await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    toast.success("Lançamento excluído")
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Histórico de Lançamentos</h2>
        <AddTransactionDialog onSuccess={load} />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12 text-sm">Carregando...</div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border border-border p-12 text-center text-muted-foreground text-sm">
          Nenhum lançamento registrado ainda.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs border-b border-border">
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Ativo</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-right px-4 py-3 font-medium">Qtd</th>
                <th className="text-right px-4 py-3 font-medium">Preço Unit.</th>
                <th className="text-right px-4 py-3 font-medium">Corretagem</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium">Nota</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((t) => {
                const total = t.quantity * t.price + t.brokerage
                const isBuy = t.type === "BUY"
                return (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateUTC(t.date)}
                    </td>
                    <td className="px-4 py-3 font-semibold">{t.ticker}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        isBuy ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500"
                      )}>
                        {isBuy ? "Compra" : "Venda"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.quantity.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(t.price)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{formatCurrency(t.brokerage)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(total)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-40 truncate">{t.note ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
