/** Minimal typed event emitter (no deps) so every surface can subscribe to run events. */

export type Listener<T> = (event: T) => void;

export class Emitter<T extends { type: string }> {
  private listeners = new Set<Listener<T>>();

  on(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: T): void {
    // Snapshot so add/remove during dispatch is well-defined, and isolate each listener so
    // one throwing subscriber (e.g. buggy UI code) can't break the emitter's caller — which
    // for the orchestrator would turn a healthy lane into a spurious failure or abort the run.
    for (const l of [...this.listeners]) {
      try {
        l(event);
      } catch {
        /* isolate listener errors */
      }
    }
  }
}
