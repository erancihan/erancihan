// Entry point: register the Alpine components and start Alpine. This is the only
// script the page loads; all behaviour lives in imported, typed modules.

import Alpine from "alpinejs";

import { arenaChart } from "./components/arena";
import { equityChart } from "./components/dashboard";
import { partialLoader } from "./components/partialLoader";

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

Alpine.data("equityChart", equityChart);
Alpine.data("arenaChart", arenaChart);
Alpine.data("partialLoader", partialLoader);

window.Alpine = Alpine;
Alpine.start();
