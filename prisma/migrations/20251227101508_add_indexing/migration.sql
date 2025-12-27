-- CreateIndex
CREATE INDEX "Account_createdAt_idx" ON "Account"("createdAt");

-- CreateIndex
CREATE INDEX "FollowUp_responseId_idx" ON "FollowUp"("responseId");

-- CreateIndex
CREATE INDEX "FollowUp_addedByUserId_idx" ON "FollowUp"("addedByUserId");

-- CreateIndex
CREATE INDEX "FollowUp_status_idx" ON "FollowUp"("status");

-- CreateIndex
CREATE INDEX "FollowUp_type_idx" ON "FollowUp"("type");

-- CreateIndex
CREATE INDEX "FollowUp_nextFollowUpDate_idx" ON "FollowUp"("nextFollowUpDate");

-- CreateIndex
CREATE INDEX "FollowUp_createdAt_idx" ON "FollowUp"("createdAt");

-- CreateIndex
CREATE INDEX "FollowUp_status_nextFollowUpDate_idx" ON "FollowUp"("status", "nextFollowUpDate");

-- CreateIndex
CREATE INDEX "Form_userId_idx" ON "Form"("userId");

-- CreateIndex
CREATE INDEX "Form_accountId_idx" ON "Form"("accountId");

-- CreateIndex
CREATE INDEX "Form_createdAt_idx" ON "Form"("createdAt");

-- CreateIndex
CREATE INDEX "FormField_formId_idx" ON "FormField"("formId");

-- CreateIndex
CREATE INDEX "ManagedUser_adminId_idx" ON "ManagedUser"("adminId");

-- CreateIndex
CREATE INDEX "ManagedUser_createdAt_idx" ON "ManagedUser"("createdAt");

-- CreateIndex
CREATE INDEX "Response_formId_idx" ON "Response"("formId");

-- CreateIndex
CREATE INDEX "Response_submittedAt_idx" ON "Response"("submittedAt");

-- CreateIndex
CREATE INDEX "ResponseAnswer_responseId_idx" ON "ResponseAnswer"("responseId");

-- CreateIndex
CREATE INDEX "ResponseAnswer_fieldId_idx" ON "ResponseAnswer"("fieldId");

-- CreateIndex
CREATE INDEX "User_accountId_idx" ON "User"("accountId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdById_idx" ON "User"("createdById");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
