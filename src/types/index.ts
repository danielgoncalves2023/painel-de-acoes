export interface Transaction {
  id: string
  ticker: string
  type: "BUY" | "SELL"
  quantity: number
  price: number
  date: string
  brokerage: number
  note?: string | null
  createdAt: string
}

export interface WatchlistItem {
  id: string
  ticker: string
  note?: string | null
  addedAt: string
}

export interface Quote {
  symbol: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
  regularMarketPreviousClose: number
  regularMarketDayHigh: number
  regularMarketDayLow: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  marketCap?: number
  shortName?: string
  longName?: string
  currency: string
  dividendYield?: number
  priceEarnings?: number
  earningsPerShare?: number
  logourl?: string
}

export interface QuoteWithModules extends Quote {
  summaryProfile?: {
    longBusinessSummary?: string
    sector?: string
    industry?: string
  }
  defaultKeyStatistics?: {
    priceToBook?: number
    bookValue?: number
    returnOnEquity?: number
    profitMargins?: number
    netIncomeToCommon?: number
    debtToEquity?: number
    dividendYield?: number
    beta?: number
    enterpriseValue?: number
    trailingEps?: number
    payoutRatio?: number
  }
  historyDividend?: {
    date: string
    amount: number
  }[]
  exDividendDate?: string | null
}

export interface PortfolioPosition {
  ticker: string
  quantity: number
  averagePrice: number
  totalCost: number
  currentPrice: number
  currentValue: number
  gainLoss: number
  gainLossPercent: number
  allocationPercent: number
  dividendYield?: number
  priceEarnings?: number
  shortName?: string
  regularMarketChangePercent?: number
}

export interface HistoricalPrice {
  date: string
  close: number
  open: number
  high: number
  low: number
  volume: number
}
