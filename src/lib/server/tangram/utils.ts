import PlaySession from '../models/PlaySession';

export async function getOwnedSession(sessionId: string, userId: string, allowedStatuses?: string[]) {
  const filter: Record<string, unknown> = {
    _id: sessionId,
    userId,
    gameId: 'tangram',
  };
  if (allowedStatuses) {
    filter.status = { $in: allowedStatuses };
  }

  const session = await PlaySession.findOne(filter);
  if (!session) {
    throw new Error('Session not found');
  }
  return session;
}

export function validateStateTransition(currentStatus: string, targetAction: string): boolean {
  const transitions: Record<string, string[]> = {
    active: ['pause', 'save', 'abandon', 'complete', 'restart'],
    paused: ['resume', 'save', 'abandon', 'restart'],
    completed: ['replay', 'restart'],
    abandoned: ['replay', 'restart'],
  };

  const allowed = transitions[currentStatus];
  return allowed ? allowed.includes(targetAction) : false;
}
