// Small typed accessors for Alpine's magic properties, so components stay
// strictly typed without sprinkling `any` everywhere.

interface AlpineRefs {
  $refs: Record<string, HTMLElement>;
}

interface AlpineEl {
  $el: HTMLElement;
}

interface AlpineNextTick {
  $nextTick: () => Promise<void>;
}

export function refs(ctx: unknown): Record<string, HTMLElement> {
  return (ctx as AlpineRefs).$refs;
}

export function el(ctx: unknown): HTMLElement {
  return (ctx as AlpineEl).$el;
}

export function nextTick(ctx: unknown): Promise<void> {
  return (ctx as AlpineNextTick).$nextTick();
}

// Shared "live" state: a single toggle + heartbeat that every auto-refreshing
// component consults, so one pause button stops the whole dashboard.
export interface LiveStore {
  enabled: boolean;
  lastUpdated: string;
  intervalMs: number;
  stamp(): void;
  toggle(): void;
}

interface AlpineStores {
  $store: { live: LiveStore };
}

export function live(ctx: unknown): LiveStore {
  return (ctx as AlpineStores).$store.live;
}

export function makeLiveStore(intervalMs = 15000): LiveStore {
  return {
    enabled: true,
    lastUpdated: "",
    intervalMs,
    stamp() {
      this.lastUpdated = new Date().toLocaleTimeString();
    },
    toggle() {
      this.enabled = !this.enabled;
    },
  };
}
