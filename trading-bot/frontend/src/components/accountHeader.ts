// Live account snapshot (equity / cash / buying power / market status), refreshed
// on the shared live-store interval while live mode is enabled.

import { getAccount } from "../api/client";
import { live } from "../alpine";
import type { AccountView } from "../types";

export function accountHeader() {
  return {
    account: null as AccountView | null,
    async init() {
      await this.load();
      setInterval(() => {
        if (live(this).enabled) {
          void this.load();
        }
      }, live(this).intervalMs);
    },
    async load() {
      try {
        this.account = await getAccount();
        live(this).stamp();
      } catch (error) {
        console.error(error);
      }
    },
  };
}
