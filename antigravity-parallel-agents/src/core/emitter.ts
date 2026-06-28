/** Minimal typed event emitter (no deps) so every surface can subscribe to run events. */

export type Listener<T> = (event: T) => void;

export class Emitter<T extends { type: string }> {
  private listeners = new Set<Listener<T>>();

  on(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: T): void {
    for (const l of this.listeners) l(event);
  }
}
