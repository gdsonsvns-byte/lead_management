/*
  Warnings:

  - You are about to drop the `NextAction` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `formId` to the `NextActionType` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "NextAction" DROP CONSTRAINT "NextAction_formId_fkey";

-- DropForeignKey
ALTER TABLE "NextAction" DROP CONSTRAINT "NextAction_nextActionTypeId_fkey";

-- AlterTable
ALTER TABLE "NextActionType" ADD COLUMN     "formId" TEXT NOT NULL;

-- DropTable
DROP TABLE "NextAction";

-- CreateIndex
CREATE INDEX "NextActionType_formId_idx" ON "NextActionType"("formId");

-- AddForeignKey
ALTER TABLE "NextActionType" ADD CONSTRAINT "NextActionType_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
