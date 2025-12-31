-- CreateTable
CREATE TABLE "ApiAccessToken" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiAccessToken_tokenHash_key" ON "ApiAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiAccessToken_accountId_idx" ON "ApiAccessToken"("accountId");

-- CreateIndex
CREATE INDEX "ApiAccessToken_createdById_idx" ON "ApiAccessToken"("createdById");

-- CreateIndex
CREATE INDEX "ApiAccessToken_expiresAt_idx" ON "ApiAccessToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "ApiAccessToken" ADD CONSTRAINT "ApiAccessToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiAccessToken" ADD CONSTRAINT "ApiAccessToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
