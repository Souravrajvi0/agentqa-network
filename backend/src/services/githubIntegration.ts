import { prisma } from "../lib/prisma.js";

export type GitHubIntegrationHealth =
  | "NOT_CONFIGURED"
  | "INCOMPLETE"
  | "ACTIVE"
  | "DELIVERY_FAILING"
  | "DISABLED";

export function repositoryUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}`;
}

export function computeGitHubHealth(integration: {
  owner: string;
  repo: string;
  webhookSecret: string;
  enabled: boolean;
  lastWebhookFailureAt: Date | null;
  lastWebhookSuccessAt: Date | null;
}): GitHubIntegrationHealth {
  if (!integration.enabled) return "DISABLED";
  if (!integration.owner?.trim() || !integration.repo?.trim()) return "INCOMPLETE";
  if (!integration.webhookSecret?.length) return "INCOMPLETE";
  if (integration.lastWebhookFailureAt) {
    if (
      !integration.lastWebhookSuccessAt ||
      integration.lastWebhookFailureAt > integration.lastWebhookSuccessAt
    ) {
      return "DELIVERY_FAILING";
    }
  }
  return "ACTIVE";
}

export async function markGitHubWebhookReceived(projectId: string, ok: boolean, failureMessage?: string) {
  const now = new Date();
  await prisma.gitHubProjectIntegration.update({
    where: { projectId },
    data: {
      lastWebhookReceivedAt: now,
      ...(ok
        ? { lastWebhookSuccessAt: now, lastWebhookFailureMessage: null }
        : {
            lastWebhookFailureAt: now,
            lastWebhookFailureMessage: failureMessage?.slice(0, 500) ?? "Webhook processing failed",
          }),
    },
  });
}

export async function getGitHubIntegrationPublicView(params: {
  projectId: string;
  host: string;
  protocol: string;
}) {
  const integration = await prisma.gitHubProjectIntegration.findUnique({
    where: { projectId: params.projectId },
  });
  const webhookUrl = `${params.protocol}://${params.host}/api/integrations/github/webhook`;
  if (!integration) {
    return {
      integration: null,
      health: "NOT_CONFIGURED" as GitHubIntegrationHealth,
      webhookUrl,
      webhookEvents: ["workflow_run"],
      signatureAlgorithm: "HMAC SHA-256 (X-Hub-Signature-256)",
      secretConfigured: false,
    };
  }

  const health = computeGitHubHealth(integration);
  const lastDelivery = await prisma.inboundWebhookDelivery.findFirst({
    where: { projectId: params.projectId, provider: "GITHUB" },
    orderBy: { processedAt: "desc" },
  });

  return {
    integration: {
      owner: integration.owner,
      repo: integration.repo,
      repositoryUrl: repositoryUrl(integration.owner, integration.repo),
      defaultBranch: integration.defaultBranch,
      enabled: integration.enabled,
      webhookUrl,
      lastWebhookReceivedAt: integration.lastWebhookReceivedAt,
      lastWebhookSuccessAt: integration.lastWebhookSuccessAt,
      lastWebhookFailureAt: integration.lastWebhookFailureAt,
      lastWebhookFailureMessage: integration.lastWebhookFailureMessage,
      lastInboundDeliveryAt: lastDelivery?.processedAt ?? null,
    },
    health,
    webhookUrl,
    webhookEvents: ["workflow_run"],
    signatureAlgorithm: "HMAC SHA-256 (X-Hub-Signature-256)",
    secretConfigured: Boolean(integration.webhookSecret?.length),
  };
}
