/*
  Warnings:

  - You are about to drop the column `nextActionId` on the `Form` table. All the data in the column will be lost.
  - Added the required column `formId` to the `NextAction` table without a default value. This is not possible if the table is not empty.
  - Made the column `nextActionTypeId` on table `NextAction` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Form" DROP CONSTRAINT "Form_nextActionId_fkey";

-- DropIndex
DROP INDEX "Form_nextActionId_idx";

-- DropIndex
DROP INDEX "NextAction_id_idx";

-- DropIndex
DROP INDEX "NextActionType_id_idx";

-- AlterTable
ALTER TABLE "Form" DROP COLUMN "nextActionId";

-- AlterTable
ALTER TABLE "NextAction" ADD COLUMN     "formId" TEXT NOT NULL,
ALTER COLUMN "nextActionTypeId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "NextAction_formId_idx" ON "NextAction"("formId");

-- AddForeignKey
ALTER TABLE "NextAction" ADD CONSTRAINT "NextAction_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
