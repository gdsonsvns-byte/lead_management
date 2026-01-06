/*
  Warnings:

  - A unique constraint covering the columns `[label,formId]` on the table `NextActionType` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "NextActionType_label_idx";

-- DropIndex
DROP INDEX "NextActionType_status_idx";

-- AlterTable
ALTER TABLE "NextActionType" ALTER COLUMN "formId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "NextActionType_label_formId_key" ON "NextActionType"("label", "formId");
