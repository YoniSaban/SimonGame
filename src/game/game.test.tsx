import { act, fireEvent, render, screen, within } from '@testing-library/react';
import confetti from 'canvas-confetti';
import App from '../App';
import { playEndSound, playTone, stopAllSounds, unlockAudio } from '../audio/audioEngine';
import { FLASH_MS, GAP_MS } from './config';

// jsdom has no Web Audio or canvas: the audio engine and confetti are replaced by spies.
vi.mock('../audio/audioEngine', () => ({
  unlockAudio: vi.fn(),
  playTone: vi.fn(),
  playEndSound: vi.fn(),
  stopAllSounds: vi.fn(),
}));
vi.mock('canvas-confetti', () => ({
  default: Object.assign(vi.fn(), { reset: vi.fn() }),
}));

const NAMES = { green: 'ירוק', red: 'אדום', yellow: 'צהוב', blue: 'כחול' } as const;
type Color = keyof typeof NAMES;
// Math.random() values that map to each color index.
const RANDOM: Record<Color, number> = { green: 0, red: 0.3, yellow: 0.6, blue: 0.9 };

// Each started tone, with the spy that stops it.
let tones: { color: string; stop: ReturnType<typeof vi.fn> }[] = [];
let endSounds: { outcome: string; stop: ReturnType<typeof vi.fn> }[] = [];

// Starting awaits the audio unlock, so the click is wrapped in an async act.
async function clickStart() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
  });
}

async function clickResume() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'המשך משחק' }));
  });
}

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

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
    vi.clearAllMocks();
    tones = [];
    endSounds = [];
    vi.mocked(unlockAudio).mockResolvedValue(true);
    vi.mocked(playTone).mockImplementation((color) => {
      const stop = vi.fn();
      tones.push({ color, stop });
      return stop;
    });
    vi.mocked(playEndSound).mockImplementation((outcome) => {
      const stop = vi.fn();
      endSounds.push({ outcome, stop });
      return stop;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('plays the sequence at the fixed pace, then hands over to the player', async () => {
    render(<App />);
    await clickStart();

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
    await clickStart();
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
    await clickStart();
    press('red'); // wrong color, but playback is running
    await advance(500);
    press('red');
    await advance(playbackMs(1, true));
    expect(status()).toBe('התור שלך');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('loses in round 1 with 0 completed rounds, and the message waits 1 second', async () => {
    render(<App />);
    await clickStart();
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
    await clickStart();
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
    await clickStart();
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
    await clickStart();
    await advance(1000);
    expect(pad('blue')).toHaveClass('is-lit');
    expect(pad('green')).not.toHaveClass('is-lit');
  });

  it('leaving for About mid-playback pauses it, and coming back does not resume it', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation');
    await clickStart();
    await advance(1100);
    expect(pad('green')).toHaveClass('is-lit');
    fireEvent.click(within(nav).getByRole('button', { name: 'אודות' }));
    expect(vi.getTimerCount()).toBe(0);
    await advance(10000);
    fireEvent.click(within(nav).getByRole('button', { name: 'בית' }));

    expect(status()).toBe('המשחק מושהה');
    expect(roundText()).toBe('שלב 1 מתוך 10');
    expect(screen.getByRole('button', { name: 'המשך משחק' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();
    expect(document.querySelector('.board')).toHaveClass('board--paused');
    expect(document.querySelectorAll('.is-lit')).toHaveLength(0);
    await advance(10000);
    expect(status()).toBe('המשחק מושהה');
    expect(document.querySelectorAll('.is-lit')).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Presses while paused do nothing.
    press('red');
    await advance(2000);
    expect(status()).toBe('המשחק מושהה');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"המשך משחק" replays the whole sequence of the same round, and input restarts from its beginning', async () => {
    // One draw per start and per press: green, red (round 2), unused, blue (round 3).
    randomSpy
      .mockReturnValueOnce(RANDOM.green)
      .mockReturnValueOnce(RANDOM.red)
      .mockReturnValueOnce(RANDOM.green)
      .mockReturnValueOnce(RANDOM.blue);
    render(<App />);
    const nav = screen.getByRole('navigation');
    await clickStart();
    await advance(playbackMs(1, true));
    press('green'); // round 2: green, red
    await advance(playbackMs(2, false));
    press('green'); press('red'); // round 3: green, red, blue
    await advance(playbackMs(3, false));
    press('green'); // partial input
    press('red');

    fireEvent.click(within(nav).getByRole('button', { name: 'אודות' }));
    fireEvent.click(within(nav).getByRole('button', { name: 'בית' }));
    expect(roundText()).toBe('שלב 3 מתוך 10');
    await clickResume();
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();
    expect(status()).toBe('המשחק מציג את הרצף');
    expect(roundText()).toBe('שלב 3 מתוך 10');

    // Same 1000ms wait as after "start game", then the full sequence.
    const lit: string[] = [];
    await advance(999);
    expect(document.querySelectorAll('.is-lit')).toHaveLength(0);
    for (const color of ['green', 'red', 'blue'] as const) {
      await advance(color === 'green' ? 1 : GAP_MS);
      expect(pad(color)).toHaveClass('is-lit');
      lit.push(color);
      await advance(FLASH_MS);
    }
    expect(lit).toEqual(['green', 'red', 'blue']);
    expect(status()).toBe('התור שלך');
    expect(roundText()).toBe('שלב 3 מתוך 10');

    // Input starts over: the full sequence completes the round.
    press('green'); press('red'); press('blue');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await advance(1000);
    expect(roundText()).toBe('שלב 4 מתוך 10');
  });

  it('pausing in the wait between rounds resumes with the new round and its added color', async () => {
    randomSpy.mockReturnValueOnce(RANDOM.green).mockReturnValueOnce(RANDOM.yellow);
    render(<App />);
    const nav = screen.getByRole('navigation');
    await clickStart();
    await advance(playbackMs(1, true));
    press('green'); // round 1 done, round 2 adds yellow
    await advance(500);
    expect(roundText()).toBe('שלב 1 מתוך 10');
    fireEvent.click(within(nav).getByRole('button', { name: 'אודות' }));
    fireEvent.click(within(nav).getByRole('button', { name: 'בית' }));
    expect(roundText()).toBe('שלב 2 מתוך 10');
    expect(status()).toBe('המשחק מושהה');

    await clickResume();
    await advance(1000);
    expect(pad('green')).toHaveClass('is-lit');
    await advance(FLASH_MS + GAP_MS);
    expect(pad('yellow')).toHaveClass('is-lit');
    await advance(FLASH_MS);
    expect(status()).toBe('התור שלך');
  });

  it('hiding the app pauses it the same way, and showing it again does not resume', async () => {
    render(<App />);
    await clickStart();
    await advance(playbackMs(1, true));
    press('green');
    await advance(1500);

    setVisibility('hidden');
    expect(stopAllSounds).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    setVisibility('visible');
    await advance(10000);
    expect(status()).toBe('המשחק מושהה');
    expect(roundText()).toBe('שלב 2 מתוך 10');
    expect(document.querySelectorAll('.is-lit')).toHaveLength(0);

    await clickResume();
    await advance(playbackMs(2, true));
    expect(status()).toBe('התור שלך');
  });

  it('pagehide also pauses', async () => {
    render(<App />);
    await clickStart();
    await advance(1100);
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(status()).toBe('המשחק מושהה');
    expect(document.querySelectorAll('.is-lit')).toHaveLength(0);
  });

  it('"המשך משחק" appears only while paused', async () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();
    await clickStart();
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();
    await advance(playbackMs(1, true));
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();
    press('red');
    await advance(1000);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();
  });

  it('a paused game is not a loss, and leaving during the end message returns to the start state', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation');
    await clickStart();
    await advance(playbackMs(1, true));
    press('blue');
    await advance(1000);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(within(nav).getByRole('button', { name: 'אודות' }));
    fireEvent.click(within(nav).getByRole('button', { name: 'בית' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(roundText()).toBe('שלב 1 מתוך 10');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();

    // A pause, on the other hand, never shows a loss.
    await clickStart();
    await advance(1100);
    setVisibility('hidden');
    setVisibility('visible');
    await advance(5000);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(status()).toBe('המשחק מושהה');
  });

  it('a fresh render (page refresh) starts idle even if a game was paused', async () => {
    const { unmount } = render(<App />);
    await clickStart();
    setVisibility('hidden');
    setVisibility('visible');
    unmount();
    render(<App />);
    expect(roundText()).toBe('שלב 1 מתוך 10');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });

  it('keeps no game state in persistent storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<App />);
    await clickStart();
    await advance(playbackMs(1, true));
    press('green');
    await advance(playbackMs(2, false));
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('sound and confetti', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(RANDOM.green);
    vi.clearAllMocks();
    tones = [];
    endSounds = [];
    vi.mocked(unlockAudio).mockResolvedValue(true);
    vi.mocked(playTone).mockImplementation((color) => {
      const stop = vi.fn();
      tones.push({ color, stop });
      return stop;
    });
    vi.mocked(playEndSound).mockImplementation((outcome) => {
      const stop = vi.fn();
      endSounds.push({ outcome, stop });
      return stop;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('plays each color tone during playback, for as long as it is lit', async () => {
    vi.mocked(Math.random).mockReturnValueOnce(RANDOM.green).mockReturnValueOnce(RANDOM.red);
    render(<App />);
    await clickStart();
    expect(unlockAudio).toHaveBeenCalledTimes(1);
    await advance(999);
    expect(tones).toHaveLength(0);
    await advance(1);
    expect(tones.map((t) => t.color)).toEqual(['green']);
    await advance(FLASH_MS - 1);
    expect(tones[0].stop).not.toHaveBeenCalled();
    await advance(1);
    expect(tones[0].stop).toHaveBeenCalledTimes(1);

    press('green'); // round 2 plays green, then red
    tones = [];
    await advance(playbackMs(2, false));
    expect(tones.map((t) => t.color)).toEqual(['green', 'red']);
    expect(tones.every((t) => t.stop.mock.calls.length > 0)).toBe(true);
  });

  it('plays the pressed pad tone at once, and keeps it while the finger is down', async () => {
    render(<App />);
    await clickStart();
    await advance(playbackMs(1, true));
    tones = [];

    act(() => {
      fireEvent.pointerDown(pad('green'), { button: 0 });
    });
    expect(tones.map((t) => t.color)).toEqual(['green']);
    await advance(1000); // still held
    expect(tones[0].stop).not.toHaveBeenCalled();
    act(() => {
      fireEvent.pointerUp(window);
    });
    expect(tones[0].stop).toHaveBeenCalledTimes(1);
  });

  it('a quick tap keeps the tone for 300ms', async () => {
    render(<App />);
    await clickStart();
    await advance(playbackMs(1, true));
    tones = [];
    press('blue'); // wrong, but still sounds its own tone at once
    expect(tones.map((t) => t.color)).toEqual(['blue']);
    await advance(299);
    expect(tones[0].stop).not.toHaveBeenCalled();
    await advance(1);
    expect(tones[0].stop).toHaveBeenCalledTimes(1);
  });

  it('presses during playback make no sound', async () => {
    render(<App />);
    await clickStart();
    press('red');
    await advance(playbackMs(1, true));
    expect(tones.map((t) => t.color)).toEqual(['green']);
  });

  it('a wrong press plays the loss sound together with the message 1 second later, with no confetti', async () => {
    render(<App />);
    await clickStart();
    await advance(playbackMs(1, true));
    press('yellow');
    expect(tones.at(-1)?.color).toBe('yellow');
    await advance(999);
    expect(playEndSound).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await advance(1);
    expect(endSounds.map((e) => e.outcome)).toEqual(['lost']);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await advance(5000);
    expect(confetti).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
    expect(endSounds[0].stop).toHaveBeenCalled();
  });

  it('a win plays the win sound and confetti once, together with the message', async () => {
    render(<App />);
    await clickStart();
    for (let round = 1; round <= 10; round++) {
      await advance(playbackMs(round, round === 1));
      for (let i = 0; i < round; i++) press('green');
    }
    await advance(999);
    expect(playEndSound).not.toHaveBeenCalled();
    expect(confetti).not.toHaveBeenCalled();
    await advance(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(endSounds.map((e) => e.outcome)).toEqual(['won']);
    expect(confetti).toHaveBeenCalled();
    await advance(5000);
    expect(playEndSound).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
    expect(endSounds[0].stop).toHaveBeenCalled();
    expect(confetti.reset).toHaveBeenCalled();
  });

  it('when audio fails to start, shows a Hebrew message, stays idle, and a retry works', async () => {
    vi.mocked(unlockAudio).mockResolvedValueOnce(false);
    render(<App />);
    await clickStart();
    expect(screen.getByRole('alert')).toHaveTextContent('לא הצלחנו להפעיל את הצליל. לחץ שוב על "התחל משחק".');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    expect(roundText()).toBe('שלב 1 מתוך 10');
    await advance(5000);
    expect(tones).toHaveLength(0);
    expect(document.querySelectorAll('.is-lit')).toHaveLength(0);

    await clickStart();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(status()).toBe('המשחק מציג את הרצף');
    await advance(1000);
    expect(tones.map((t) => t.color)).toEqual(['green']);
  });

  it('a double tap on "התחל משחק" while audio is starting unlocks only once', async () => {
    let finish: (ok: boolean) => void = () => {};
    vi.mocked(unlockAudio).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    render(<App />);
    const button = screen.getByRole('button', { name: 'התחל משחק' });
    fireEvent.click(button);
    fireEvent.click(button);
    await act(async () => finish(true));
    expect(unlockAudio).toHaveBeenCalledTimes(1);
    await advance(playbackMs(1, true));
    expect(tones).toHaveLength(1);
  });

  it('when audio fails on "המשך משחק", stays paused with a message, and a retry works', async () => {
    render(<App />);
    await clickStart();
    await advance(1100);
    setVisibility('hidden');
    setVisibility('visible');
    vi.mocked(unlockAudio).mockResolvedValueOnce(false);
    await clickResume();
    expect(screen.getByRole('alert')).toHaveTextContent('לא הצלחנו להפעיל את הצליל. לחץ שוב על "המשך משחק".');
    expect(status()).toBe('המשחק מושהה');
    tones = [];
    await advance(5000);
    expect(tones).toHaveLength(0);

    await clickResume();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await advance(1000);
    expect(tones.map((t) => t.color)).toEqual(['green']);
  });

  it('a double tap on "המשך משחק" plays the sequence only once', async () => {
    render(<App />);
    await clickStart();
    await advance(1100);
    setVisibility('hidden');
    setVisibility('visible');
    tones = [];
    let finish: (ok: boolean) => void = () => {};
    vi.mocked(unlockAudio).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const button = screen.getByRole('button', { name: 'המשך משחק' });
    fireEvent.click(button);
    fireEvent.click(button);
    await act(async () => finish(true));
    await advance(playbackMs(1, true));
    expect(tones).toHaveLength(1);
    expect(status()).toBe('התור שלך');
  });

  it('leaving for About stops the sound that is playing', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation');
    await clickStart();
    await advance(1100); // mid-color
    expect(tones).toHaveLength(1);
    fireEvent.click(within(nav).getByRole('button', { name: 'אודות' }));
    expect(tones[0].stop).toHaveBeenCalled();
    expect(stopAllSounds).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    // While the player holds a pad.
    fireEvent.click(within(nav).getByRole('button', { name: 'בית' }));
    await clickResume();
    await advance(playbackMs(1, true));
    act(() => {
      fireEvent.pointerDown(pad('green'), { button: 0 });
    });
    const held = tones.at(-1)!;
    fireEvent.click(within(nav).getByRole('button', { name: 'אודות' }));
    expect(held.stop).toHaveBeenCalled();
  });

  it('hiding the app while a pad is held ends its highlight and tone', async () => {
    render(<App />);
    await clickStart();
    await advance(playbackMs(1, true));
    act(() => {
      fireEvent.pointerDown(pad('green'), { button: 0 });
    });
    const held = tones.at(-1)!;
    setVisibility('hidden');
    expect(held.stop).toHaveBeenCalled();
    expect(pad('green')).not.toHaveClass('is-pressed');
  });

  it('leaving for About before the end message cancels its sound and confetti', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation');
    await clickStart();
    await advance(playbackMs(1, true));
    press('red');
    await advance(500);
    fireEvent.click(within(nav).getByRole('button', { name: 'אודות' }));
    await advance(3000);
    expect(playEndSound).not.toHaveBeenCalled();
    expect(confetti).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('hiding the app while the win message shows stops its sound and confetti', async () => {
    render(<App />);
    await clickStart();
    for (let round = 1; round <= 10; round++) {
      await advance(playbackMs(round, round === 1));
      for (let i = 0; i < round; i++) press('green');
    }
    await advance(1000);
    expect(confetti).toHaveBeenCalled();
    setVisibility('hidden');
    expect(endSounds[0].stop).toHaveBeenCalled();
    expect(confetti.reset).toHaveBeenCalled();
    setVisibility('visible');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(roundText()).toBe('שלב 1 מתוך 10');
    await advance(5000);
    expect(confetti).toHaveBeenCalledTimes(2); // only the first burst (two sides)
    expect(vi.getTimerCount()).toBe(0);
  });
});
