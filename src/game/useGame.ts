import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { playEndSound, playTone, stopAllSounds, unlockAudio } from '../audio/audioEngine';
import { fireConfetti } from '../effects/confetti';
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
  // Audio failed to start: the game must not run silently, so it stays idle with a message.
  const [audioError, setAudioError] = useState(false);
  const starting = useRef(false);

  const { status, presentationId, round, sequence } = state;

  // Sequence controller: one run per entry into `presenting`. Cleanup aborts every pending timer
  // and the playing tone, and a stale completion is also rejected by the reducer through `presentationId`.
  useEffect(() => {
    if (status !== 'presenting') return;
    const controller = new AbortController();
    const { signal } = controller;
    let stopTone: (() => void) | null = null;

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
        stopTone = playTone(sequence[i]);
        await sleep(FLASH_MS, signal);
        stopTone();
        stopTone = null;
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
      stopTone?.();
      setLitColor(null);
    };
  }, [status, presentationId, round, sequence]);

  // The win/loss message, end sound and (on a win) confetti appear together, a fixed delay
  // after the final press. Leaving the end state cancels all three.
  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return;
    let stopEnd: (() => void) | null = null;
    let stopConfetti: (() => void) | null = null;
    const timer = setTimeout(() => {
      setEndingVisible(true);
      stopEnd = playEndSound(status);
      if (status === 'won') stopConfetti = fireConfetti();
    }, END_DELAY_MS);
    return () => {
      clearTimeout(timer);
      stopEnd?.();
      stopConfetti?.();
      setEndingVisible(false);
    };
  }, [status]);

  const startGame = useCallback(async () => {
    if (starting.current) return;
    starting.current = true;
    try {
      // Called first thing in the click handler, so the browser sees it as part of the gesture.
      const ok = await unlockAudio();
      setAudioError(!ok);
      if (ok) dispatch({ type: 'start', color: randomColor() });
    } finally {
      starting.current = false;
    }
  }, []);
  const pressColor = useCallback(
    (color: ColorId) => dispatch({ type: 'press', color, nextColor: randomColor() }),
    [],
  );
  const dismiss = useCallback(() => dispatch({ type: 'dismiss' }), []);
  const abortGame = useCallback(() => {
    dispatch({ type: 'abort' });
    stopAllSounds();
  }, []);

  return {
    state,
    litColor,
    shownRound:
      status === 'presenting' && round > 1 && revealedPresentationId !== presentationId ? round - 1 : round,
    endingVisible,
    audioError,
    startGame,
    pressColor,
    playTone,
    dismiss,
    abortGame,
  };
}
