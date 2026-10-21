import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { FLASH_MS, GAP_MS } from './config';

const NAMES = { green: 'ירוק', red: 'אדום', yellow: 'צהוב', blue: 'כחול' } as const;
type Color = keyof typeof NAMES;
// Math.random() values that map to each color index.
const RANDOM: Record<Color, number> = { green: 0, red: 0.3, yellow: 0.6, blue: 0.9 };

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function pad(color: Color) {
  return screen.getByRole('button', { name: NAMES[color] });
}

function press(color: Color) {
  act(() => {
    fireEvent.pointerDown(pad(color), { button: 0 });
    fireEvent.pointerUp(window);
  });
}

function playbackMs(length: number, firstRound: boolean) {
  return (firstRound ? 1000 : 2000) + length * FLASH_MS + (length - 1) * GAP_MS;
}

function roundText() {
  return screen.getByText((_, el) => el?.classList.contains('round-indicator') ?? false).textContent;
}

function status() {
  return document.querySelector('.status')?.textContent;
}

describe('game flow', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(RANDOM.green);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('plays the sequence at the fixed pace, then hands over to the player', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));

    expect(status()).toBe('המשחק מציג את הרצף');
    expect(screen.getByText('המתן...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();
    expect(pad('green')).not.toHaveClass('is-lit');

    await advance(999);
    expect(pad('green')).not.toHaveClass('is-lit');
    await advance(1);
    expect(pad('green')).toHaveClass('is-lit');
    expect(pad('red')).not.toHaveClass('is-lit');
    expect(document.querySelector('.board')).toHaveClass('board--presenting');

    await advance(FLASH_MS - 1);
    expect(pad('green')).toHaveClass('is-lit');
    await advance(1);
    expect(pad('green')).not.toHaveClass('is-lit');
    expect(status()).toBe('התור שלך');
    expect(screen.getByText('הקש על הצבעים לפי הסדר')).toBeInTheDocument();
  });

  it('keeps the same pace in later rounds and shows the completed round first', async () => {
    randomSpy.mockReturnValueOnce(RANDOM.green).mockReturnValueOnce(RANDOM.red);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
    await advance(playbackMs(1, true));

    press('green'); // round 1 done; round 2 adds red
    expect(status()).toBe('המשחק מציג את הרצף');
    expect(roundText()).toBe('שלב 1 מתוך 10');
    await advance(1000);
    expect(roundText()).toBe('שלב 2 מתוך 10');
    await advance(999);
    expect(pad('green')).not.toHaveClass('is-lit');
    await advance(1);
    expect(pad('green')).toHaveClass('is-lit');
    await advance(FLASH_MS);
    expect(pad('green')).not.toHaveClass('is-lit');
    await advance(GAP_MS - 1);
    expect(pad('red')).not.toHaveClass('is-lit');
    await advance(1);
    expect(pad('red')).toHaveClass('is-lit');
    await advance(FLASH_MS);
    expect(status()).toBe('התור שלך');
  });

  it('ignores presses during playback', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
    press('red'); // wrong color, but playback is running
    await advance(500);
    press('red');
    await advance(playbackMs(1, true));
    expect(status()).toBe('התור שלך');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('loses in round 1 with 0 completed rounds, and the message waits 1 second', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
    await advance(playbackMs(1, true));

    press('blue');
    expect(pad('blue')).toHaveClass('is-pressed');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    press('green'); // no second chance
    await advance(999);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await advance(1);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'נפסלת!' })).toBeInTheDocument();
    expect(within(dialog).getByText('לא הושלמו שלבים')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'אישור' })).toBeInTheDocument();
    expect(roundText()).toBe('שלב 1 מתוך 10');
  });

  it('loses in a later round showing the number of completed rounds', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
    await advance(playbackMs(1, true));
    press('green');
    await advance(playbackMs(2, false));
    press('green');
    press('green');
    await advance(playbackMs(3, false));
    expect(roundText()).toBe('שלב 3 מתוך 10');

    press('green');
    press('yellow');
    await advance(1000);
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'השלמת 2 שלבים')).toBeInTheDocument();
    expect(roundText()).toBe('שלב 3 מתוך 10');
  });

  it('wins after round 10, never reaches round 11, and "אישור" allows a fresh game', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
    for (let round = 1; round <= 10; round++) {
      await advance(playbackMs(round, round === 1));
      expect(roundText()).toBe(`שלב ${round} מתוך 10`);
      expect(status()).toBe('התור שלך');
      for (let i = 0; i < round; i++) press('green');
    }

    await advance(1000);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'כל הכבוד! ניצחת!' })).toBeInTheDocument();
    expect(within(dialog).getByText((_, el) => el?.tagName === 'P' && el.textContent === 'השלמת את כל 10 השלבים')).toBeInTheDocument();
    expect(roundText()).toBe('שלב 10 מתוך 10');

    // No round 11: nothing more plays.
    await advance(20000);
    expect(roundText()).toBe('שלב 10 מתוך 10');
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(within(dialog).getByRole('button', { name: 'אישור' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(roundText()).toBe('שלב 1 מתוך 10');

    // A new game draws a new random sequence.
    randomSpy.mockReturnValue(RANDOM.blue);
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
    await advance(1000);
    expect(pad('blue')).toHaveClass('is-lit');
    expect(pad('green')).not.toHaveClass('is-lit');
  });

  it('leaving for About mid-game cancels it with no highlight or timer left', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation');

    // During playback, while a color is lit.
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
    await advance(1100);
    expect(pad('green')).toHaveClass('is-lit');
    fireEvent.click(within(nav).getByRole('button', { name: 'אודות' }));
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(within(nav).getByRole('button', { name: 'בית' }));
    expect(roundText()).toBe('שלב 1 מתוך 10');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(document.querySelectorAll('.is-lit')).toHaveLength(0);

    // During the player's turn.
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
    await advance(playbackMs(1, true));
    press('green');
    fireEvent.click(within(nav).getByRole('button', { name: 'אודות' }));
    await advance(10000);
    fireEvent.click(within(nav).getByRole('button', { name: 'בית' }));
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(status()).toBe('');
    expect(document.querySelectorAll('.is-lit, .is-pressed')).toHaveLength(0);
  });

  it('keeps no game state in persistent storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
    await advance(playbackMs(1, true));
    press('green');
    await advance(playbackMs(2, false));
    expect(setItem).not.toHaveBeenCalled();
  });
});
