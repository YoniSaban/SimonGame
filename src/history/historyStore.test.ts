import { addResult, clearHistory, createResult, HISTORY_KEY, loadHistory } from './historyStore';

function stored() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY)!);
}

describe('history store', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts empty', () => {
    expect(loadHistory()).toEqual({ ok: true, results: [] });
  });

  it('adds results newest first, with a versioned schema', () => {
    const first = createResult(3, 'loss', new Date('2026-10-20T10:00:00Z'));
    const second = createResult(10, 'win', new Date('2026-10-21T10:00:00Z'));
    expect(addResult(first)).toBe(true);
    expect(addResult(second)).toBe(true);
    expect(loadHistory()).toEqual({ ok: true, results: [second, first] });
    expect(stored().schemaVersion).toBe(1);
    expect(first.finishedAt).toBe('2026-10-20T10:00:00.000Z');
  });

  it('keeps only the newest 10, dropping the oldest', () => {
    const all = Array.from({ length: 11 }, (_, i) => createResult(i % 11, 'loss', new Date(2026, 0, i + 1)));
    for (const r of all) addResult(r);
    const result = loadHistory();
    expect(result.ok && result.results.map((r) => r.id)).toEqual(all.slice(1).reverse().map((r) => r.id));
  });

  it('gives every result its own id', () => {
    const now = new Date();
    expect(createResult(1, 'loss', now).id).not.toBe(createResult(1, 'loss', now).id);
  });

  it('reports corrupt or unknown data as unavailable', () => {
    localStorage.setItem(HISTORY_KEY, '{not json');
    expect(loadHistory()).toEqual({ ok: false });
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 2, results: [] }));
    expect(loadHistory()).toEqual({ ok: false });
    localStorage.setItem(HISTORY_KEY, 'null');
    expect(loadHistory()).toEqual({ ok: false });
  });

  it('drops invalid entries and keeps the valid ones', () => {
    const good = createResult(4, 'loss');
    const bad = [
      { ...good, id: 1 },
      { ...good, finishedAt: 'yesterday' },
      { ...good, completedRounds: 11 },
      { ...good, completedRounds: 2.5 },
      { ...good, outcome: 'draw' },
      null,
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 1, results: [good, ...bad] }));
    expect(loadHistory()).toEqual({ ok: true, results: [good] });
  });

  it('starts over when adding on top of corrupt data', () => {
    localStorage.setItem(HISTORY_KEY, '{not json');
    const r = createResult(0, 'loss');
    expect(addResult(r)).toBe(true);
    expect(loadHistory()).toEqual({ ok: true, results: [r] });
  });

  it('clears the history', () => {
    addResult(createResult(2, 'loss'));
    expect(clearHistory()).toBe(true);
    expect(loadHistory()).toEqual({ ok: true, results: [] });
  });

  it('never throws when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadHistory()).toEqual({ ok: false });
    expect(addResult(createResult(1, 'loss'))).toBe(false);
    expect(clearHistory()).toBe(false);
  });
});
