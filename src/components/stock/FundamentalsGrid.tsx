import { QuoteWithModules } from "@/types"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface Props {
  data: QuoteWithModules
}

function Indicator({ label, value, tooltip }: { label: string; value: string | number | undefined | null; tooltip?: string }) {
  return (
    <div className="bg-muted/40 rounded-lg px-4 py-3">
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger className="text-xs text-muted-foreground mb-1 cursor-help underline decoration-dashed underline-offset-2 text-left">
            {label}
          </TooltipTrigger>
          <TooltipContent className="max-w-[300px] text-sm leading-relaxed font-normal">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : (
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
      )}
      <div className="text-sm font-semibold">{value != null ? value : "—"}</div>
    </div>
  )
}

export function FundamentalsGrid({ data }: Props) {
  const stats = data.defaultKeyStatistics
  const dy = data.dividendYield != null ? `${data.dividendYield.toFixed(2)}%` : null
  const pl = data.priceEarnings != null ? data.priceEarnings.toFixed(1) : null
  const pvp = stats?.priceToBook != null ? stats.priceToBook.toFixed(2) : null
  const lpa = data.earningsPerShare != null ? `R$ ${data.earningsPerShare.toFixed(2)}` : null
  const vpa = stats?.bookValue != null ? `R$ ${stats.bookValue.toFixed(2)}` : null
  const roe = stats?.returnOnEquity != null ? `${(stats.returnOnEquity * 100).toFixed(1)}%` : null
  const margem = stats?.profitMargins != null ? `${(stats.profitMargins * 100).toFixed(1)}%` : null
  const payout = stats?.payoutRatio != null ? `${(stats.payoutRatio * 100).toFixed(1)}%` : null
  const w52high = data.fiftyTwoWeekHigh != null ? `R$ ${data.fiftyTwoWeekHigh.toFixed(2)}` : null
  const w52low = data.fiftyTwoWeekLow != null ? `R$ ${data.fiftyTwoWeekLow.toFixed(2)}` : null
  const mktcap = data.marketCap != null
    ? data.marketCap >= 1e9
      ? `R$ ${(data.marketCap / 1e9).toFixed(1)}B`
      : `R$ ${(data.marketCap / 1e6).toFixed(0)}M`
    : null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <Indicator label="Dividend Yield" value={dy} tooltip="Soma de todos os dividendos pagos nos últimos 12 meses dividida pelo preço atual da ação. Oportunidade: Um DY alto pode indicar que a ação está barata ou distribui muito lucro, mas verifique se os pagamentos são consistentes." />
      <Indicator label="P/L" value={pl} tooltip="Preço sobre Lucro. Indica quanto o mercado está disposto a pagar pelos lucros. Oportunidade: P/L baixo sugere que a ação pode estar barata em relação ao lucro atual. P/L muito alto pode indicar expectativa de forte crescimento." />
      <Indicator label="P/VP" value={pvp} tooltip="Preço sobre Valor Patrimonial. Compara o preço da ação com o patrimônio da empresa. Oportunidade: P/VP abaixo de 1 sinaliza que a empresa vale menos que seu patrimônio em bolsa (pode ser uma pechincha, dependendo dos riscos)." />
      <Indicator label="LPA" value={lpa} tooltip="Lucro Por Ação. Parte do lucro líquido que corresponde a cada ação. Oportunidade: Se o LPA for crescente ao longo dos anos, significa que o negócio é rentável e está gerando cada vez mais valor para o sócio." />
      <Indicator label="VPA" value={vpa} tooltip="Valor Patrimonial da Ação. É o patrimônio líquido dividido pelo total de ações. Serve de base para encontrar o P/VP e ajuda a ver quanto cada ação tem de lastro em bens da companhia." />
      <Indicator label="ROE" value={roe} tooltip="Retorno sobre Patrimônio Líquido. Mede a eficiência da empresa em gerar lucro com o dinheiro do acionista. Oportunidade: ROE consistente e elevado (> 15%) revela forte vantagem competitiva." />
      <Indicator label="Margem Líquida" value={margem} tooltip="Porcentagem da receita que sobra como lucro líquido. Oportunidade: Margens altas indicam bom controle de custos e resiliência em crises." />
      <Indicator label="Payout" value={payout} tooltip="Porcentagem do lucro líquido distribuída sob a forma de proventos. Payout equilibrado (30%-75%) sugere pagamentos saudáveis e sustentáveis." />
      <Indicator label="Máx. 52 semanas" value={w52high} tooltip="Maior preço que a ação alcançou no último ano. Ajuda a ver a resistência do papel e a distância que está do topo." />
      <Indicator label="Mín. 52 semanas" value={w52low} tooltip="Menor preço alcançado no último ano. Pode servir como zona de suporte de preços e sinalizar se a cotação está na mínima anual." />
      <Indicator label="Market Cap" value={mktcap} tooltip="Valor de Mercado total da empresa na bolsa. Classifica o tamanho e risco: Small Caps (mais voláteis, maior potencial de crescimento) ou Large Caps (consolidadas e mais seguras)." />
    </div>
  )
}
