import type { ColorId } from '../game/colors';
import { ATTACK_S, AUDIO_UNLOCK_TIMEOUT_MS, RELEASE_S, TONE_GAIN, TONE_HZ } from '../game/config';

// Audio Engine: every sound is synthesized with Web Audio (no audio files, so it works offline).
// Each sound returns an idempotent `stop` that fades it out quickly.

type Stop = () => void;
type Note = { hz: number; duration: number }; // duration in seconds

const WIN_MOTIF: Note[] = [
  { hz: 523.25, duration: 0.15 },
  { hz: 659.25, duration: 0.15 },
  { hz: 783.99, duration: 0.15 },
  { hz: 1046.5, duration: 0.45 },
];
const LOSS_MOTIF: Note[] = [
  { hz: 196, duration: 0.35 },
  { hz: 147, duration: 0.5 },
];

let ctx: AudioContext | null = null;
const active = new Set<Stop>();

function contextClass(): typeof AudioContext | undefined {
  return window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Must be called synchronously inside a user gesture ("start game" / "resume game").
// Resolves to true only if the context ends up running; never throws.
export function unlockAudio(): Promise<boolean> {
  try {
    const Ctor = contextClass();
    if (!Ctor) return Promise.resolve(false);
    ctx ??= new Ctor();
    const c = ctx;
    // Playing a silent buffer inside the gesture is what unlocks audio on iOS.
    const source = c.createBufferSource();
    source.buffer = c.createBuffer(1, 1, 22050);
    source.connect(c.destination);
    source.start(0);
    if (c.state === 'running') return Promise.resolve(true);
    return withTimeout(c.resume(), AUDIO_UNLOCK_TIMEOUT_MS).then(
      () => c.state === 'running',
      () => false,
    );
  } catch {
    return Promise.resolve(false);
  }
}

// Starts one oscillator voice at `when`. Without `duration` it sounds until stopped.
function voice(c: AudioContext, hz: number, type: OscillatorType, peak: number, when: number, duration?: number): Stop {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = hz;
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(peak, when + ATTACK_S);
  if (duration !== undefined) {
    gain.gain.setValueAtTime(peak, when + duration - RELEASE_S);
    gain.gain.linearRampToValueAtTime(0, when + duration);
  }
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(when);
  if (duration !== undefined) osc.stop(when + duration);

  let stopped = false;
  const stop: Stop = () => {
    if (stopped) return;
    stopped = true;
    active.delete(stop);
    const t = Math.max(c.currentTime, when);
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + RELEASE_S);
    osc.stop(t + RELEASE_S);
  };
  osc.onended = () => {
    stopped = true;
    active.delete(stop);
    osc.disconnect();
    gain.disconnect();
  };
  active.add(stop);
  return stop;
}

function runningContext(): AudioContext | null {
  return ctx && ctx.state === 'running' ? ctx : null;
}

// The color's tone lasts until the returned stop is called, so it matches the highlight.
export function playTone(color: ColorId): Stop {
  const c = runningContext();
  if (!c) return () => {};
  return voice(c, TONE_HZ[color], 'triangle', TONE_GAIN, c.currentTime);
}

export function playEndSound(outcome: 'won' | 'lost'): Stop {
  const c = runningContext();
  if (!c) return () => {};
  const won = outcome === 'won';
  const stops: Stop[] = [];
  let when = c.currentTime;
  for (const note of won ? WIN_MOTIF : LOSS_MOTIF) {
    // The loss motif uses a softened sawtooth: lower peak to keep it from sounding harsh.
    stops.push(voice(c, note.hz, won ? 'triangle' : 'sawtooth', won ? TONE_GAIN : TONE_GAIN * 0.6, when, note.duration));
    when += note.duration;
  }
  return () => stops.forEach((stop) => stop());
}

export function stopAllSounds(): void {
  [...active].forEach((stop) => stop());
}
