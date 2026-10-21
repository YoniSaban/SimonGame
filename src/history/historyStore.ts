import { MAX_ROUNDS } from '../game/config';

// History repository: the only module that touches localStorage. It never throws;
// every failure is reported through its return value.
export const HISTORY_KEY = 'simon.history.v1';
export const MAX_HISTORY = 10;

export type GameResult = {
  id: string;
  finishedAt: string; // ISO 8601
  completedRounds: number; // 0–10
  outcome: 'win' | 'loss';
};

type HistoryData = {
  schemaVersion: 1;
  results: GameResult[]; // newest first, at most 10
};

export type LoadResult = { ok: true; results: GameResult[] } | { ok: false };

function isValidResult(value: unknown): value is GameResult {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.finishedAt === 'string' &&
    !Number.isNaN(Date.parse(r.finishedAt)) &&
    Number.isInteger(r.completedRounds) &&
    (r.completedRounds as number) >= 0 &&
    (r.completedRounds as number) <= MAX_ROUNDS &&
    (r.outcome === 'win' || r.outcome === 'loss')
  );
}

export function loadHistory(): LoadResult {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw === null) return { ok: true, results: [] };
    const data = JSON.parse(raw) as Partial<HistoryData> | null;
    if (data?.schemaVersion !== 1 || !Array.isArray(data.results)) return { ok: false };
    // Invalid entries are dropped quietly; the rest still show.
    return { ok: true, results: data.results.filter(isValidResult).slice(0, MAX_HISTORY) };
  } catch {
    return { ok: false };
  }
}

function save(results: GameResult[]): boolean {
  try {
    const data: HistoryData = { schemaVersion: 1, results };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// Adds the result first and keeps only the newest ten.
export function addResult(result: GameResult): boolean {
  const current = loadHistory();
  const results = current.ok ? current.results : [];
  return save([result, ...results].slice(0, MAX_HISTORY));
}

export function clearHistory(): boolean {
  return save([]);
}

// Not crypto.randomUUID: it's missing outside secure contexts (e.g. phone testing over plain http).
export function createResult(completedRounds: number, outcome: GameResult['outcome'], now = new Date()): GameResult {
  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`,
    finishedAt: now.toISOString(),
    completedRounds,
    outcome,
  };
}
