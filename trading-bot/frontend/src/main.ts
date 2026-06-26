// Entry point: register the Alpine components and start Alpine. This is the only
// script the page loads; all behaviour lives in imported, typed modules.

import Alpine from "alpinejs";

import { makeLiveStore } from "./alpine";
import { accountHeader } from "./components/accountHeader";
import { arenaChart } from "./components/arena";
import { candleChart } from "./components/candleChart";
import { equityChart } from "./components/dashboard";
import { jobRunner } from "./components/jobRunner";
import { partialLoader } from "./components/partialLoader";

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

Alpine.store("live", makeLiveStore());

Alpine.data("accountHeader", accountHeader);
Alpine.data("equityChart", equityChart);
Alpine.data("arenaChart", arenaChart);
Alpine.data("candleChart", candleChart);
Alpine.data("jobRunner", jobRunner);
Alpine.data("partialLoader", partialLoader);

window.Alpine = Alpine;
Alpine.start();
