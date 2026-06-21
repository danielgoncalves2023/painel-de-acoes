-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "brokerage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetAllocation" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "targetPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TargetAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockFundamental" (
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lpa" DOUBLE PRECISION NOT NULL,
    "vpa" DOUBLE PRECISION NOT NULL,
    "roe" DOUBLE PRECISION,
    "margemLiquida" DOUBLE PRECISION,
    "payout" DOUBLE PRECISION,
    "historyDivRaw" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockFundamental_pkey" PRIMARY KEY ("ticker")
);

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_ticker_key" ON "Watchlist"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "TargetAllocation_ticker_key" ON "TargetAllocation"("ticker");
