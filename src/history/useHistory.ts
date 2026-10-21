import { useCallback, useState } from 'react';
import { addResult, clearHistory, loadHistory, type GameResult } from './historyStore';

export type History = ReturnType<typeof useHistory>;

export function useHistory() {
  const [loaded, setLoaded] = useState(loadHistory);
  const [saveFailed, setSaveFailed] = useState(false);
  const [clearFailed, setClearFailed] = useState(false);

  // The list always shows what was actually stored, so it is re-read after every write.
  const record = useCallback((result: GameResult) => {
    const ok = addResult(result);
    setSaveFailed(!ok);
    if (ok) setLoaded(loadHistory());
  }, []);

  const clear = useCallback(() => {
    const ok = clearHistory();
    setClearFailed(!ok);
    if (ok) setLoaded({ ok: true, results: [] });
  }, []);

  return {
    results: loaded.ok ? loaded.results : [],
    loadFailed: !loaded.ok,
    saveFailed,
    clearFailed,
    record,
    clear,
  };
}
