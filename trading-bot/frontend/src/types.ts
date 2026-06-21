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
