-- CreateTable
CREATE TABLE "InboundWebhookDelivery" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "projectId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundWebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboundWebhookDelivery_provider_deliveryId_key" ON "InboundWebhookDelivery"("provider", "deliveryId");

-- CreateIndex
CREATE INDEX "InboundWebhookDelivery_projectId_idx" ON "InboundWebhookDelivery"("projectId");

-- AddForeignKey
ALTER TABLE "InboundWebhookDelivery" ADD CONSTRAINT "InboundWebhookDelivery_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
