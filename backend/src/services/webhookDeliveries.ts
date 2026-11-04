import { prisma } from "../lib/prisma.js";

export async function registerWebhookDelivery(params: {
  provider: string;
  deliveryId: string;
  projectId?: string;
}): Promise<{ duplicate: boolean }> {
  try {
    await prisma.inboundWebhookDelivery.create({
      data: {
        provider: params.provider,
        deliveryId: params.deliveryId,
        projectId: params.projectId,
      },
    });
    return { duplicate: false };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") return { duplicate: true };
    throw err;
  }
}
