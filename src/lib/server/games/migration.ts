import type { PlayerIdentity } from "./types";

export interface SessionTransferPlan {
  sourceUserId: string;
  targetUserId: string;
  sessionCount: number;
  statFields: string[];
}

export interface IMigrationService {
  plan(sourceGuestId: string, targetUserId: string): Promise<SessionTransferPlan>;
  execute(plan: SessionTransferPlan): Promise<void>;
  rollback(plan: SessionTransferPlan): Promise<void>;
}

export function resolvePlayerIdentity(user: {
  id: string;
  role: string;
}): PlayerIdentity {
  return {
    playerId: user.id,
    isGuest: user.role === "guest",
  };
}
