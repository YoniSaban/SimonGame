// Game timing, from the "sequence pace" table in DESIGN.md.
// Identical in every round: no speed-up.
export const MAX_ROUNDS = 10;

export const FLASH_MS = 600; // each color lit during playback
export const GAP_MS = 250; // pause between two colors
export const START_DELAY_MS = 1000; // before playback after "start game"
export const ROUND_DONE_MS = 1000; // completed round number stays on screen
export const NEXT_ROUND_MS = 1000; // after showing the next round number, before its first color
export const END_DELAY_MS = 1000; // from the final press until the win/loss message
export const PRESS_MIN_MS = 300; // minimum highlight for a player press

// Sound, from the Audio Engine plan (ARCHITECTURE.md 2.5). Pitches inspired by the original Simon.
export const TONE_HZ = { green: 415, red: 310, yellow: 252, blue: 209 } as const;
export const TONE_GAIN = 0.3;
export const ATTACK_S = 0.01; // fade-in, avoids clicks
export const RELEASE_S = 0.04; // fade-out, avoids clicks
export const AUDIO_UNLOCK_TIMEOUT_MS = 2000; // resume() that hangs longer counts as a failure
