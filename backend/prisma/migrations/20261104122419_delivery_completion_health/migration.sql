-- AlterTable
ALTER TABLE "GitHubProjectIntegration" ADD COLUMN     "lastWebhookFailureAt" TIMESTAMP(3),
ADD COLUMN     "lastWebhookFailureMessage" TEXT,
ADD COLUMN     "lastWebhookReceivedAt" TIMESTAMP(3),
ADD COLUMN     "lastWebhookSuccessAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SwitchRoomLink" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastOutboundAt" TIMESTAMP(3),
ADD COLUMN     "lastOutboundError" TEXT,
ADD COLUMN     "lastOutboundOk" BOOLEAN;

-- CreateTable
CREATE TABLE "SwitchRunnerHeartbeat" (
    "projectId" TEXT NOT NULL,
    "runnerLabel" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwitchRunnerHeartbeat_pkey" PRIMARY KEY ("projectId")
);

-- AddForeignKey
ALTER TABLE "SwitchRunnerHeartbeat" ADD CONSTRAINT "SwitchRunnerHeartbeat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
