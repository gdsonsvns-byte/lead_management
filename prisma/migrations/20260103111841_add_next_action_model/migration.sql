-- CreateTable
CREATE TABLE "NextAction" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "formId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NextAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NextAction_id_idx" ON "NextAction"("id");

-- CreateIndex
CREATE INDEX "NextAction_label_idx" ON "NextAction"("label");

-- CreateIndex
CREATE INDEX "NextAction_formId_idx" ON "NextAction"("formId");

-- CreateIndex
CREATE INDEX "NextAction_status_idx" ON "NextAction"("status");

-- CreateIndex
CREATE INDEX "NextAction_createdAt_idx" ON "NextAction"("createdAt");

-- AddForeignKey
ALTER TABLE "NextAction" ADD CONSTRAINT "NextAction_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
