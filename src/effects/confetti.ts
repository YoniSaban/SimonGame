import confetti from 'canvas-confetti';

const GAME_COLORS = ['#00D26A', '#FF3B30', '#FFD600', '#00A3FF'];
// Above the end-of-game overlay, so the confetti falls over the win message.
const Z_INDEX = 1000;
const BURST_EVERY_MS = 400;
const BURSTS = 5;

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Fires the win confetti once. The returned function stops it and clears the canvas.
export function fireConfetti(): () => void {
  if (prefersReducedMotion()) {
    // Reduced motion: a single small, short burst.
    void confetti({ particleCount: 40, spread: 60, startVelocity: 25, ticks: 80, origin: { y: 0.5 }, colors: GAME_COLORS, zIndex: Z_INDEX });
    return () => confetti.reset();
  }

  let fired = 0;
  const burst = () => {
    for (const x of [0.15, 0.85]) {
      void confetti({ particleCount: 45, spread: 70, startVelocity: 45, origin: { x, y: 0.6 }, colors: GAME_COLORS, zIndex: Z_INDEX });
    }
    fired += 1;
    if (fired >= BURSTS) clearInterval(interval);
  };
  const interval = setInterval(burst, BURST_EVERY_MS);
  burst();

  return () => {
    clearInterval(interval);
    confetti.reset();
  };
}
