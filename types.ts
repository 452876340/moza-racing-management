
export interface Driver {
  id: string;
  rank: number;
  name: string;
  team: string;
  car: string;
  bestLap: string;
  points: number;
  status: 'normal' | 'error';
  // Extended fields for dynamic headers
  safetyScore?: number;
  podiums?: number;
  finishedRaces?: number;
  totalRaces?: number;
  displayRaces?: string;
  // Dynamic Data
  rawData?: Record<string, any>;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: Driver) => any;
}

// Database Types
export interface DBSeries {
  id: string; // e.g., 'monthly'
  name: string;
  description: string | null;
  created_at: string;
}

export interface DBRound {
  id: string; // UUID
  series_id: string;
  name: string;
  sequence: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface DBRanking {
  id: number;
  round_id: string;
  driver_id: string; // Name
  rank: number;
  tier: string | null;
  points: number;
  safety_score: number;
  podiums: number;
  finished_races: number;
  total_races: number;
  display_races: string | null;
  trend: 'UP' | 'DOWN' | 'STABLE' | null;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  rounds: Round[];
}

export interface Round {
  id: string;
  name: string;
  isActive: boolean;
}

export type ViewState = 'login' | 'dashboard';
