// Small typed accessors for Alpine's magic properties, so components stay
// strictly typed without sprinkling `any` everywhere.

interface AlpineRefs {
  $refs: Record<string, HTMLElement>;
}

interface AlpineEl {
  $el: HTMLElement;
}

export function refs(ctx: unknown): Record<string, HTMLElement> {
  return (ctx as AlpineRefs).$refs;
}

export function el(ctx: unknown): HTMLElement {
  return (ctx as AlpineEl).$el;
}
