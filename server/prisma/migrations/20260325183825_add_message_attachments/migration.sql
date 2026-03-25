-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachmentBytes" INTEGER,
ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "attachmentPublicId" TEXT,
ADD COLUMN     "attachmentType" TEXT,
ADD COLUMN     "attachmentUrl" TEXT,
ALTER COLUMN "content" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Message_senderUserId_idx" ON "Message"("senderUserId");
