-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('HUMAN', 'AGENT');

-- CreateEnum
CREATE TYPE "CiRunStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CiConclusion" AS ENUM ('SUCCESS', 'FAILURE', 'CANCELLED', 'SKIPPED', 'NEUTRAL', 'TIMED_OUT', 'ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "RetestScopeStatus" AS ENUM ('DRAFT', 'PROPOSED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QAHandoffStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChangeRequestStatus" ADD VALUE 'IN_REVIEW';
ALTER TYPE "ChangeRequestStatus" ADD VALUE 'CI_PENDING';
ALTER TYPE "ChangeRequestStatus" ADD VALUE 'QA_PENDING';
ALTER TYPE "ChangeRequestStatus" ADD VALUE 'QA_IN_PROGRESS';
ALTER TYPE "ChangeRequestStatus" ADD VALUE 'VERIFIED';

-- AlterTable
ALTER TABLE "Build" ADD COLUMN     "artifactUrl" TEXT,
ADD COLUMN     "branch" TEXT,
ADD COLUMN     "commitSha" TEXT,
ADD COLUMN     "repository" TEXT,
ADD COLUMN     "sourceProvider" TEXT DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "DesignClarification" ADD COLUMN     "assignedReviewerUserId" TEXT,
ADD COLUMN     "developerChangeId" TEXT,
ADD COLUMN     "testCaseId" TEXT;

-- AlterTable
ALTER TABLE "DeveloperChangeRequest" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "authorAgentId" TEXT,
ADD COLUMN     "branch" TEXT,
ADD COLUMN     "changeType" TEXT NOT NULL DEFAULT 'FEATURE',
ADD COLUMN     "commitSha" TEXT,
ADD COLUMN     "createdByType" "ActorType" NOT NULL DEFAULT 'HUMAN',
ADD COLUMN     "pullRequestUrl" TEXT,
ADD COLUMN     "repository" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TestExecution" ADD COLUMN     "qaHandoffId" TEXT,
ADD COLUMN     "retestScopeId" TEXT;

-- CreateTable
CREATE TABLE "GitHubProjectIntegration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubProjectIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CiRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "developerChangeId" TEXT,
    "buildId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'GITHUB_ACTIONS',
    "repository" TEXT NOT NULL,
    "externalRunId" TEXT NOT NULL,
    "deliveryId" TEXT,
    "workflowName" TEXT NOT NULL,
    "workflowUrl" TEXT,
    "branch" TEXT,
    "commitSha" TEXT,
    "status" "CiRunStatus" NOT NULL,
    "conclusion" "CiConclusion",
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CiRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetestScope" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "developerChangeId" TEXT NOT NULL,
    "buildId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "RetestScopeStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "testCaseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "testCaseRevisions" JSONB,
    "proposedByUserId" TEXT NOT NULL,
    "proposedByType" "ActorType" NOT NULL DEFAULT 'HUMAN',
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "RetestScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QAHandoff" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "developerChangeId" TEXT NOT NULL,
    "buildId" TEXT,
    "ciRunId" TEXT,
    "retestScopeId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdByAgentId" TEXT,
    "createdByType" "ActorType" NOT NULL DEFAULT 'HUMAN',
    "assignedToUserId" TEXT,
    "assignedToAgentId" TEXT,
    "status" "QAHandoffStatus" NOT NULL DEFAULT 'PENDING',
    "summary" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QAHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CiGateOverride" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "developerChangeId" TEXT,
    "ciRunId" TEXT NOT NULL,
    "buildId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CiGateOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTimelineEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "changeId" TEXT,
    "actorUserId" TEXT,
    "actorAgentId" TEXT,
    "actorType" "ActorType" NOT NULL DEFAULT 'HUMAN',
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubProjectIntegration_projectId_key" ON "GitHubProjectIntegration"("projectId");

-- CreateIndex
CREATE INDEX "CiRun_projectId_developerChangeId_idx" ON "CiRun"("projectId", "developerChangeId");

-- CreateIndex
CREATE INDEX "CiRun_projectId_commitSha_idx" ON "CiRun"("projectId", "commitSha");

-- CreateIndex
CREATE UNIQUE INDEX "CiRun_projectId_provider_externalRunId_key" ON "CiRun"("projectId", "provider", "externalRunId");

-- CreateIndex
CREATE INDEX "RetestScope_developerChangeId_version_idx" ON "RetestScope"("developerChangeId", "version");

-- CreateIndex
CREATE INDEX "QAHandoff_projectId_status_idx" ON "QAHandoff"("projectId", "status");

-- CreateIndex
CREATE INDEX "DeliveryTimelineEvent_projectId_changeId_createdAt_idx" ON "DeliveryTimelineEvent"("projectId", "changeId", "createdAt");

-- AddForeignKey
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_retestScopeId_fkey" FOREIGN KEY ("retestScopeId") REFERENCES "RetestScope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestExecution" ADD CONSTRAINT "TestExecution_qaHandoffId_fkey" FOREIGN KEY ("qaHandoffId") REFERENCES "QAHandoff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignClarification" ADD CONSTRAINT "DesignClarification_developerChangeId_fkey" FOREIGN KEY ("developerChangeId") REFERENCES "DeveloperChangeRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignClarification" ADD CONSTRAINT "DesignClarification_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeveloperChangeRequest" ADD CONSTRAINT "DeveloperChangeRequest_authorAgentId_fkey" FOREIGN KEY ("authorAgentId") REFERENCES "AgentRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubProjectIntegration" ADD CONSTRAINT "GitHubProjectIntegration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CiRun" ADD CONSTRAINT "CiRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CiRun" ADD CONSTRAINT "CiRun_developerChangeId_fkey" FOREIGN KEY ("developerChangeId") REFERENCES "DeveloperChangeRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CiRun" ADD CONSTRAINT "CiRun_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetestScope" ADD CONSTRAINT "RetestScope_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetestScope" ADD CONSTRAINT "RetestScope_developerChangeId_fkey" FOREIGN KEY ("developerChangeId") REFERENCES "DeveloperChangeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetestScope" ADD CONSTRAINT "RetestScope_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QAHandoff" ADD CONSTRAINT "QAHandoff_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QAHandoff" ADD CONSTRAINT "QAHandoff_developerChangeId_fkey" FOREIGN KEY ("developerChangeId") REFERENCES "DeveloperChangeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QAHandoff" ADD CONSTRAINT "QAHandoff_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QAHandoff" ADD CONSTRAINT "QAHandoff_ciRunId_fkey" FOREIGN KEY ("ciRunId") REFERENCES "CiRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QAHandoff" ADD CONSTRAINT "QAHandoff_retestScopeId_fkey" FOREIGN KEY ("retestScopeId") REFERENCES "RetestScope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CiGateOverride" ADD CONSTRAINT "CiGateOverride_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTimelineEvent" ADD CONSTRAINT "DeliveryTimelineEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
