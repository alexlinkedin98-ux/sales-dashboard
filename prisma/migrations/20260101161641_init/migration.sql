-- CreateTable
CREATE TABLE "SalesRep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WeeklyEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesRepId" TEXT NOT NULL,
    "weekStartDate" DATETIME NOT NULL,
    "weekLabel" TEXT NOT NULL,
    "introCallsScheduled" INTEGER NOT NULL DEFAULT 0,
    "introCallsTaken" INTEGER NOT NULL DEFAULT 0,
    "accountsAudited" INTEGER NOT NULL DEFAULT 0,
    "proposalsPitched" INTEGER NOT NULL DEFAULT 0,
    "dealsClosed" INTEGER NOT NULL DEFAULT 0,
    "mrr" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeeklyEntry_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesRep_name_key" ON "SalesRep"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyEntry_salesRepId_weekStartDate_key" ON "WeeklyEntry"("salesRepId", "weekStartDate");
