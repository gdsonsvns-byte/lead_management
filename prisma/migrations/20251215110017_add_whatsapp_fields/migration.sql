-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "whatsappApiKey" TEXT;

-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "adminWhatsappCampaignName" TEXT,
ADD COLUMN     "userWhatsappCampaignName" TEXT;
