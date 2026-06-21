// Fetches an HTML fragment and swaps it in, optionally polling on an interval.
// Keeps the server-rendered markup until the first fetch resolves (no flash).

import { getPartial } from "../api/client";
import { el } from "../alpine";

export function partialLoader(url: string, intervalMs = 0) {
  return {
    html: "",
    async init() {
      this.html = el(this).innerHTML;
      await this.refresh();
      if (intervalMs > 0) {
        setInterval(() => {
          void this.refresh();
        }, intervalMs);
      }
    },
    async refresh() {
      try {
        this.html = await getPartial(url);
      } catch (error) {
        console.error(error);
      }
    },
  };
}
