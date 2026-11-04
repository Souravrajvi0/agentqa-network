import type { AgentRegistration, AgentType } from "@prisma/client";
import { ForbiddenError } from "./errors.js";

export type AgentCapabilityMap = {
  readQueue?: boolean;
  claimTests?: boolean;
  recordResults?: boolean;
  runAutomation?: boolean;
  coordinationScan?: boolean;
  readDesignDecisions?: boolean;
};

export function defaultCapabilities(agentType: AgentType): AgentCapabilityMap {
  switch (agentType) {
    case "DEVELOPMENT":
      return { readQueue: true, readDesignDecisions: true };
    case "QA_COORDINATION":
      return {
        readQueue: true,
        claimTests: false,
        recordResults: false,
        runAutomation: false,
        coordinationScan: true,
        readDesignDecisions: true,
      };
    case "QA":
    default:
      return {
        readQueue: true,
        claimTests: true,
        recordResults: true,
        runAutomation: true,
        readDesignDecisions: true,
        coordinationScan: false,
      };
  }
}

export function parseCapabilities(raw: unknown, agentType: AgentType): AgentCapabilityMap {
  const defaults = defaultCapabilities(agentType);
  if (!raw || typeof raw !== "object") return defaults;
  return { ...defaults, ...(raw as AgentCapabilityMap) };
}

export function assertAgentCapability(
  agent: AgentRegistration,
  capability: keyof AgentCapabilityMap,
) {
  const caps = parseCapabilities(agent.capabilities, agent.agentType);
  if (!caps[capability]) {
    throw new ForbiddenError(`Agent lacks capability: ${capability}`);
  }
}
