-- DropIndex
DROP INDEX "FormField_formId_idx";

-- CreateIndex
CREATE INDEX "FormField_formId_order_idx" ON "FormField"("formId", "order");
