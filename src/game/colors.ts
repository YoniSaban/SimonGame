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
