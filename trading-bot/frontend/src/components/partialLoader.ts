// Fetches an HTML fragment and swaps it in, optionally polling on an interval.
// Keeps the server-rendered markup until the first fetch resolves (no flash).

import { getPartial } from "../api/client";
import { el, live } from "../alpine";

export function partialLoader(url: string, intervalMs = 0) {
  return {
    html: "",
    async init() {
      this.html = el(this).innerHTML;
      await this.refresh();
      const period = intervalMs || live(this).intervalMs;
      setInterval(() => {
        if (live(this).enabled) {
          void this.refresh();
        }
      }, period);
    },
    async refresh() {
      try {
        this.html = await getPartial(url);
        live(this).stamp();
      } catch (error) {
        console.error(error);
      }
    },
  };
}
