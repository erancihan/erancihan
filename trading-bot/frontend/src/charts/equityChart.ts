import type { EChartsOption } from "echarts";

import type { ArenaRunDetail, EquitySeries } from "../types";
import { baseLineOption, LINE_COLORS } from "./theme";

function shortTs(ts: string): string {
  return ts.slice(0, 19).replace("T", " ");
}

/** ECharts option for a single equity curve (the dashboard). */
export function equityOption(series: EquitySeries): EChartsOption {
  const option = baseLineOption();
  option.xAxis = { ...option.xAxis, data: series.points.map((p) => shortTs(p.ts)) };
  option.series = [
    {
      name: "equity",
      type: "line",
      smooth: true,
      showSymbol: false,
      areaStyle: { opacity: 0.08 },
      lineStyle: { color: LINE_COLORS[0], width: 2 },
      itemStyle: { color: LINE_COLORS[0] },
      data: series.points.map((p) => p.equity),
    },
  ];
  return option;
}

/** ECharts option for many contestants' equity curves (the arena). */
export function arenaOption(detail: ArenaRunDetail): EChartsOption {
  const option = baseLineOption();
  const longest = detail.curves.reduce<string[]>(
    (acc, c) => (c.index.length > acc.length ? c.index : acc),
    [],
  );
  option.xAxis = { ...option.xAxis, data: longest.map(shortTs) };
  option.legend = { textStyle: { color: "#cbd5e1" }, top: 0 };
  option.grid = { ...option.grid, top: 36 };
  option.series = detail.curves.map((curve, i) => ({
    name: curve.name,
    type: "line",
    smooth: true,
    showSymbol: false,
    lineStyle: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
    itemStyle: { color: LINE_COLORS[i % LINE_COLORS.length] },
    data: curve.equity,
  }));
  return option;
}
