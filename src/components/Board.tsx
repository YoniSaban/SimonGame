import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { COLORS, type ColorId, type GameColor } from '../game/colors';
import { PRESS_MIN_MS } from '../game/config';

// show: full colors, no input. presenting: playback, others dimmed. input: player's turn.
// paused: all dimmed, no input. locked: full colors, no input.
export type BoardMode = 'show' | 'presenting' | 'input' | 'paused' | 'locked';

type Props = {
  mode: BoardMode;
  litColor: ColorId | null;
  onPress: (color: ColorId) => void;
  playTone: (color: ColorId) => () => void;
};

export default function Board({ mode, litColor, onPress, playTone }: Props) {
  return (
    <div className={`board${mode === 'presenting' || mode === 'paused' ? ` board--${mode}` : ''}`}>
      {COLORS.map((color) => (
        <Pad
          key={color.id}
          color={color}
          lit={litColor === color.id}
          enabled={mode === 'input'}
          cancelPress={mode === 'paused' || mode === 'show'}
          onPress={onPress}
          playTone={playTone}
        />
      ))}
      <div className="board__center" aria-hidden="true" />
    </div>
  );
}

type PadProps = {
  color: GameColor;
  lit: boolean;
  enabled: boolean;
  // The game paused or reset: a press still in progress must end at once.
  cancelPress: boolean;
  onPress: (color: ColorId) => void;
  playTone: (color: ColorId) => () => void;
};

// A press is judged on pointerdown (click only fires on release). The highlight lasts
// at least PRESS_MIN_MS, or as long as the finger stays down, whichever is longer.
// The pad's tone sounds exactly as long as its highlight.
function Pad({ color, lit, enabled, cancelPress, onPress, playTone }: PadProps) {
  const [pressed, setPressed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const minElapsed = useRef(true);
  const held = useRef(false);
  const removeReleaseListeners = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      removeReleaseListeners.current?.();
    },
    [],
  );

  useEffect(() => {
    if (!pressed) return;
    return playTone(color.id);
  }, [pressed, playTone, color.id]);

  // A press that ends a round keeps its highlight; a pause ends it now, so no highlight or tone stays.
  useEffect(() => {
    if (!cancelPress) return;
    clearTimeout(timer.current);
    removeReleaseListeners.current?.();
    minElapsed.current = true;
    held.current = false;
    setPressed(false);
  }, [cancelPress]);

  function maybeRelease() {
    if (minElapsed.current && !held.current) setPressed(false);
  }

  function press(hold: boolean) {
    if (!enabled) return;
    onPress(color.id);
    setPressed(true);
    minElapsed.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      minElapsed.current = true;
      maybeRelease();
    }, PRESS_MIN_MS);

    removeReleaseListeners.current?.();
    held.current = hold;
    if (hold) {
      // Listen on window so lifting the finger outside the pad still ends the press.
      const release = () => {
        held.current = false;
        removeReleaseListeners.current?.();
        maybeRelease();
      };
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
      removeReleaseListeners.current = () => {
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
        removeReleaseListeners.current = null;
      };
    }
  }

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    press(true);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!e.repeat) press(false);
  }

  const classes = ['board__pad', `board__pad--${color.id}`];
  if (lit) classes.push('is-lit');
  if (pressed) classes.push('is-pressed');

  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-label={color.label}
      aria-disabled={enabled ? undefined : 'true'}
      data-color={color.id}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    />
  );
}
