import { useCallback, useEffect, useReducer, useState } from 'react';
import { randomColor, type ColorId } from './colors';
import { END_DELAY_MS, FLASH_MS, GAP_MS, NEXT_ROUND_MS, ROUND_DONE_MS, START_DELAY_MS } from './config';
import { gameReducer, initialState } from './gameReducer';
import { sleep } from './sleep';

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  // The color lit by playback right now, if any.
  const [litColor, setLitColor] = useState<ColorId | null>(null);
  // The reducer advances `round` at once. Until the playback whose id is stored here passes its
  // first wait, the completed round stays on screen. Derived in render, so there's no flicker.
  const [revealedPresentationId, setRevealedPresentationId] = useState(0);
  const [endingVisible, setEndingVisible] = useState(false);

  const { status, presentationId, round, sequence } = state;

  // Sequence controller: one run per entry into `presenting`. Cleanup aborts every pending timer,
  // and a stale completion is also rejected by the reducer through `presentationId`.
  useEffect(() => {
    if (status !== 'presenting') return;
    const controller = new AbortController();
    const { signal } = controller;

    const play = async () => {
      if (round === 1) {
        await sleep(START_DELAY_MS, signal);
      } else {
        await sleep(ROUND_DONE_MS, signal);
        setRevealedPresentationId(presentationId);
        await sleep(NEXT_ROUND_MS, signal);
      }
      for (let i = 0; i < sequence.length; i++) {
        setLitColor(sequence[i]);
        await sleep(FLASH_MS, signal);
        setLitColor(null);
        if (i < sequence.length - 1) await sleep(GAP_MS, signal);
      }
      dispatch({ type: 'presentationDone', presentationId });
    };

    play().catch((err: unknown) => {
      if (!signal.aborted) throw err;
    });

    return () => {
      controller.abort();
      setLitColor(null);
    };
  }, [status, presentationId, round, sequence]);

  // The win/loss message appears a fixed delay after the final press.
  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return;
    const timer = setTimeout(() => setEndingVisible(true), END_DELAY_MS);
    return () => {
      clearTimeout(timer);
      setEndingVisible(false);
    };
  }, [status]);

  const startGame = useCallback(() => dispatch({ type: 'start', color: randomColor() }), []);
  const pressColor = useCallback(
    (color: ColorId) => dispatch({ type: 'press', color, nextColor: randomColor() }),
    [],
  );
  const dismiss = useCallback(() => dispatch({ type: 'dismiss' }), []);
  const abortGame = useCallback(() => dispatch({ type: 'abort' }), []);

  return {
    state,
    litColor,
    shownRound:
      status === 'presenting' && round > 1 && revealedPresentationId !== presentationId ? round - 1 : round,
    endingVisible,
    startGame,
    pressColor,
    dismiss,
    abortGame,
  };
}
