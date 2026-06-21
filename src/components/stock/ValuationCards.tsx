import { ValuationResult } from "@/lib/valuation"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ShieldCheck, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  valuation: ValuationResult
}

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-muted-foreground">—</span>
  
  let colorClass = "text-muted-foreground"
  let bgClass = "bg-muted"

  if (margin >= 15) {
    colorClass = "text-emerald-500"
    bgClass = "bg-emerald-500/10"
  } else if (margin > 0) {
    colorClass = "text-green-400"
    bgClass = "bg-green-400/10"
  } else {
    colorClass = "text-red-500"
    bgClass = "bg-red-500/10"
  }

  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap", colorClass, bgClass)}>
      {margin > 0 ? "+" : ""}{margin.toFixed(1)}%
    </span>
  )
}

export function ValuationCards({ valuation }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Graham Card */}
      <div className="rounded-xl border border-border bg-card p-5 relative overflow-hidden">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold text-sm">Valor Justo (Graham)</h2>
            <Tooltip>
              <TooltipTrigger>
                <Info size={14} className="text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px] text-sm leading-relaxed font-normal">
                O Valor Intrínseco de Benjamin Graham busca o preço justo de uma empresa olhando para os seus lucros atuais (LPA) e valor patrimonial (VPA).
                <br /><br />
                <strong>Oportunidade:</strong> Comprar abaixo deste valor significa adquirir a empresa com Margem de Segurança patrimonial.
              </TooltipContent>
            </Tooltip>
          </div>
          <ShieldCheck size={16} className="text-muted-foreground/50" />
        </div>
        
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">
              {valuation.grahamFairPrice ? formatCurrency(valuation.grahamFairPrice) : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Fórmula: √(22.5 × LPA × VPA)
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">Margem de Segurança</div>
            <MarginBadge margin={valuation.grahamMargin} />
          </div>
        </div>
      </div>

      {/* Bazin Card */}
      <div className="rounded-xl border border-border bg-card p-5 relative overflow-hidden">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold text-sm">Preço Teto (Bazin - 8%)</h2>
            <Tooltip>
              <TooltipTrigger>
                <Info size={14} className="text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px] text-sm leading-relaxed font-normal">
                Fórmula de Décio Bazin focada em dividendos. Indica o valor máximo a pagar pela ação para garantir, em média, um retorno (yield) mínimo de 8% ao ano.
                <br /><br />
                <strong>Oportunidade:</strong> Se a Margem estiver verde, o preço atual te permite mirar um excelente e agressivo Retorno de Dividendos na média histórica.
              </TooltipContent>
            </Tooltip>
          </div>
          <ShieldCheck size={16} className="text-muted-foreground/50" />
        </div>
        
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">
              {valuation.bazinCeilingPrice ? formatCurrency(valuation.bazinCeilingPrice) : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Média Div: {valuation.avgDividend3y ? formatCurrency(valuation.avgDividend3y) : "—"} / ano
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground mb-1">Margem de Segurança</div>
            <MarginBadge margin={valuation.bazinMargin} />
          </div>
        </div>
      </div>
    </div>
  )
}
