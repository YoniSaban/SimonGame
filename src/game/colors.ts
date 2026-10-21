export type ColorId = 'green' | 'red' | 'yellow' | 'blue';

export type GameColor = {
  id: ColorId;
  label: string; // Hebrew accessible name
};

// Board order is spatial: top-left, top-right, bottom-left, bottom-right.
// It must not flip under RTL.
export const COLORS: readonly GameColor[] = [
  { id: 'green', label: 'ירוק' },
  { id: 'red', label: 'אדום' },
  { id: 'yellow', label: 'צהוב' },
  { id: 'blue', label: 'כחול' },
];

// Game randomness only; no need for a cryptographic RNG. Repeats are allowed.
export function randomColor(): ColorId {
  return COLORS[Math.floor(Math.random() * COLORS.length)].id;
}
