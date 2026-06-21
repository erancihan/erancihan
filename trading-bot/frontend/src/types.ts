// Shapes mirror the Pydantic models in tradebot/web/schemas.py.

export interface EquityPoint {
  ts: string;
  equity: number;
  cash: number;
  mode: string;
}

export interface EquitySeries {
  mode: string | null;
  points: EquityPoint[];
}

export interface ArenaCurve {
  name: string;
  index: string[];
  equity: number[];
}

export interface ArenaRunDetail {
  id: number;
  scenario: string;
  metric: string;
  curves: ArenaCurve[];
}

export interface EquityCurve {
  index: string[];
  equity: number[];
}

export interface JobRequest {
  kind: string;
  strategy: string;
  periods: number;
  seed: number;
  initial_cash: number;
  params: Record<string, number>;
}

export interface JobView {
  id: string;
  kind: string;
  state: string;
  summary?: Record<string, number | string> | null;
  equity?: EquityCurve | null;
  error?: string | null;
}
