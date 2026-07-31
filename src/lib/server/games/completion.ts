import type { GameCompletion } from "./types";

type CompletionHandler = (event: GameCompletion) => Promise<void>;

class CompletionEventBus {
  private handlers: Set<CompletionHandler> = new Set();

  subscribe(handler: CompletionHandler): void {
    this.handlers.add(handler);
  }

  unsubscribe(handler: CompletionHandler): void {
    this.handlers.delete(handler);
  }

  emit(event: GameCompletion): void {
    const results = [...this.handlers].map((handler) =>
      handler(event).catch((err: unknown) => {
        console.error("[CompletionEventBus] Handler failed:", err);
      })
    );
    Promise.allSettled(results).catch(() => {});
  }

  clear(): void {
    this.handlers.clear();
  }

  get handlerCount(): number {
    return this.handlers.size;
  }
}

export const completionBus = new CompletionEventBus();
