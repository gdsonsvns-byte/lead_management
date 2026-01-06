/*
  Warnings:

  - You are about to drop the column `formId` on the `NextAction` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `NextAction` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `NextAction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "NextAction" DROP CONSTRAINT "NextAction_formId_fkey";

-- DropIndex
DROP INDEX "NextAction_formId_idx";

-- DropIndex
DROP INDEX "NextAction_label_idx";

-- DropIndex
DROP INDEX "NextAction_status_idx";

-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "nextActionId" TEXT;

-- AlterTable
ALTER TABLE "NextAction" DROP COLUMN "formId",
DROP COLUMN "label",
DROP COLUMN "status",
ADD COLUMN     "nextActionTypeId" TEXT;

-- CreateTable
CREATE TABLE "NextActionType" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NextActionType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NextActionType_id_idx" ON "NextActionType"("id");

-- CreateIndex
CREATE INDEX "NextActionType_label_idx" ON "NextActionType"("label");

-- CreateIndex
CREATE INDEX "NextActionType_status_idx" ON "NextActionType"("status");

-- CreateIndex
CREATE INDEX "NextActionType_isDefault_idx" ON "NextActionType"("isDefault");

-- CreateIndex
CREATE INDEX "NextActionType_createdAt_idx" ON "NextActionType"("createdAt");

-- CreateIndex
CREATE INDEX "Form_nextActionId_idx" ON "Form"("nextActionId");

-- CreateIndex
CREATE INDEX "NextAction_nextActionTypeId_idx" ON "NextAction"("nextActionTypeId");

-- AddForeignKey
ALTER TABLE "Form" ADD CONSTRAINT "Form_nextActionId_fkey" FOREIGN KEY ("nextActionId") REFERENCES "NextAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NextAction" ADD CONSTRAINT "NextAction_nextActionTypeId_fkey" FOREIGN KEY ("nextActionTypeId") REFERENCES "NextActionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
