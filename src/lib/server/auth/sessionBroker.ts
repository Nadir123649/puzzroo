/**
 * In-process registry of live SSE connections keyed by user id.
 *
 * Used to push an instant `logout` event to every connected tab of a user when
 * their session is revoked server-side (password change / logout-all).
 *
 * Scope caveat: a single Node.js process. Works for `npm run dev` and any
 * single-process deployment. On a multi-instance runtime (e.g. Vercel Edge),
 * swap `publishLogout` to fan out over Redis pub/sub (`subscribe`/`unsubscribe`
 * stay the same shape). The client 30s probe covers any tab that misses a push
 * because it was offline or connected to another instance.
 */

type SseController = {
  enqueue(chunk: string): boolean
  close(): void
}

const subscribers = new Map<string, Set<SseController>>()

export function subscribe(userId: string, controller: SseController) {
  let set = subscribers.get(userId)
  if (!set) {
    set = new Set()
    subscribers.set(userId, set)
  }
  set.add(controller)
}

export function unsubscribe(userId: string, controller: SseController) {
  const set = subscribers.get(userId)
  if (!set) return
  set.delete(controller)
  if (set.size === 0) subscribers.delete(userId)
}

export function publishLogout(userId: string): number {
  const set = subscribers.get(userId)
  if (!set) return 0
  let n = 0
  for (const controller of set) {
    try {
      if (controller.enqueue("data: logout\n\n")) n++
    } catch {
      // client gone / closed
    } finally {
      controller.close()
    }
  }
  subscribers.delete(userId)
  return n
}
