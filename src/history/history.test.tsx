import { StrictMode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { unlockAudio } from '../audio/audioEngine';
import { FLASH_MS, GAP_MS, MAX_ROUNDS } from '../game/config';
import { HISTORY_KEY } from './historyStore';

// jsdom has no Web Audio or canvas: the audio engine and confetti are replaced by stubs.
vi.mock('../audio/audioEngine', () => ({
  unlockAudio: vi.fn(),
  playTone: vi.fn(() => () => {}),
  playEndSound: vi.fn(() => () => {}),
  stopAllSounds: vi.fn(),
}));
vi.mock('canvas-confetti', () => ({
  default: Object.assign(vi.fn(), { reset: vi.fn() }),
}));

// Math.random() is pinned to 0, so every color in the sequence is green.
const GREEN = 'ירוק';
const BLUE = 'כחול';

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function clickButton(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
}

function press(name: string) {
  act(() => {
    fireEvent.pointerDown(screen.getByRole('button', { name }), { button: 0 });
    fireEvent.pointerUp(window);
  });
}

function playbackMs(round: number) {
  return (round === 1 ? 1000 : 2000) + round * FLASH_MS + (round - 1) * GAP_MS;
}

function goTo(name: 'בית' | 'אודות') {
  act(() => {
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name }));
  });
}

// Starts a game and makes a wrong press after `completed` rounds; stops before the end message.
async function playAndLose(completed: number) {
  await clickButton('התחל משחק');
  for (let round = 1; round <= completed; round++) {
    await advance(playbackMs(round));
    for (let i = 0; i < round; i++) press(GREEN);
  }
  await advance(playbackMs(completed + 1));
  press(BLUE);
}

async function playAndWin() {
  await clickButton('התחל משחק');
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    await advance(playbackMs(round));
    for (let i = 0; i < round; i++) press(GREEN);
  }
}

// Shows the end message and closes it, back to "start game".
async function confirmEnd() {
  await advance(1000);
  await clickButton('אישור');
}

function cards() {
  return [...document.querySelectorAll('.history-card')].map((el) => ({
    rounds: el.querySelector('.history-card__rounds')!.textContent,
    outcome: el.querySelector('.history-card__outcome')!.textContent,
    date: el.querySelector('.history-card__date')!.textContent,
  }));
}

function storedCount() {
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw).results.length : 0;
}

describe('game history', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 14, 30));
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.mocked(unlockAudio).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('records a round-1 loss once, with time, 0 completed rounds and "הפסד"', async () => {
    render(<App />);
    await playAndLose(0);
    expect(storedCount()).toBe(1);
    await confirmEnd();
    expect(storedCount()).toBe(1);

    goTo('אודות');
    expect(cards()).toEqual([{ rounds: 'שלבים שהושלמו: 0', outcome: 'הפסד', date: '21.10.2026, 14:30' }]);
    expect(screen.queryByText('עדיין אין משחקים שמורים')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'מחק היסטוריה' })).toBeInTheDocument();
  });

  it('records a win with 10 completed rounds and "ניצחון"', async () => {
    render(<App />);
    await playAndWin();
    await confirmEnd();
    goTo('אודות');
    // A full game takes over a minute of (fake) time, so the date is checked by shape only.
    expect(cards()).toEqual([
      { rounds: 'שלבים שהושלמו: 10', outcome: 'ניצחון', date: expect.stringMatching(/^21\.10\.2026, 14:3\d$/) },
    ]);
  });

  it('lists games newest first', async () => {
    render(<App />);
    await playAndLose(2);
    await confirmEnd();
    await playAndLose(1);
    await confirmEnd();
    goTo('אודות');
    expect(cards().map((c) => c.rounds)).toEqual(['שלבים שהושלמו: 1', 'שלבים שהושלמו: 2']);
  });

  it('records nothing for a paused, hidden or abandoned game', async () => {
    render(<App />);
    await clickButton('התחל משחק');
    await advance(playbackMs(1));
    press(GREEN);
    goTo('אודות'); // pause during playback
    expect(storedCount()).toBe(0);
    goTo('בית');
    await clickButton('המשך משחק');
    await advance(playbackMs(2));
    press(GREEN); // partial input, then hide the app
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    expect(storedCount()).toBe(0);
    goTo('אודות');
    expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument();
  });

  it('a refresh mid-game records nothing and keeps earlier history', async () => {
    const { unmount } = render(<App />);
    await playAndLose(0);
    await confirmEnd();
    await clickButton('התחל משחק');
    await advance(playbackMs(1));
    unmount(); // refresh while a game is running

    render(<App />);
    goTo('אודות');
    expect(cards()).toHaveLength(1);
  });

  it('leaving during the end delay or the end message records once', async () => {
    render(<App />);
    await playAndLose(0);
    goTo('אודות'); // during the 1s before the message
    expect(cards()).toHaveLength(1);
    goTo('בית');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();

    await playAndLose(0);
    await advance(1000);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    goTo('אודות'); // while the message shows
    expect(cards()).toHaveLength(2);
    goTo('בית');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(storedCount()).toBe(2);
  });

  it('records once per game under React Strict Mode', async () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await playAndLose(0);
    await confirmEnd();
    await playAndLose(1);
    await confirmEnd();
    expect(storedCount()).toBe(2);
  });

  it('keeps at most 10 games after 11, and they survive a refresh', async () => {
    const { unmount } = render(<App />);
    await playAndLose(1); // the oldest, the only one with 1 completed round
    await confirmEnd();
    for (let i = 0; i < 10; i++) {
      await playAndLose(0);
      await confirmEnd();
    }
    unmount();

    render(<App />);
    goTo('אודות');
    expect(cards()).toHaveLength(10);
    expect(cards().every((c) => c.rounds === 'שלבים שהושלמו: 0')).toBe(true);
  });

  it('"ביטול" keeps the history; "מחק" empties it', async () => {
    render(<App />);
    await playAndLose(0);
    await confirmEnd();
    goTo('אודות');

    await clickButton('מחק היסטוריה');
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByRole('heading', { name: 'למחוק את ההיסטוריה?' })).toBeInTheDocument();
    expect(within(dialog).getByText('כל תוצאות המשחקים יימחקו.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'ביטול' })).toHaveFocus();
    await clickButton('ביטול');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(cards()).toHaveLength(1);
    expect(storedCount()).toBe(1);

    await clickButton('מחק היסטוריה');
    await clickButton('מחק');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(cards()).toHaveLength(0);
    expect(storedCount()).toBe(0);
    expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
  });

  it('a failed save does not stop the game and shows a message', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    render(<App />);
    await playAndLose(0);
    await advance(1000);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await clickButton('אישור');
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();

    goTo('אודות');
    expect(screen.getByText('לא הצלחנו לשמור את תוצאת המשחק האחרון.')).toBeInTheDocument();
  });

  it('a failed delete keeps the list and says so', async () => {
    render(<App />);
    await playAndLose(0);
    await confirmEnd();
    goTo('אודות');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    await clickButton('מחק היסטוריה');
    await clickButton('מחק');
    expect(screen.getByText('המחיקה נכשלה. ההיסטוריה לא נמחקה.')).toBeInTheDocument();
    expect(cards()).toHaveLength(1);
  });

  it('unreadable history shows a message and the game still works', async () => {
    localStorage.setItem(HISTORY_KEY, '{not json');
    render(<App />);
    await playAndLose(0);
    await confirmEnd();
    goTo('אודות');
    expect(cards()).toHaveLength(1); // the new result replaced the unreadable data
    expect(screen.queryByText('לא ניתן לטעון את היסטוריית המשחקים.')).not.toBeInTheDocument();
  });

  it('shows the unreadable-history message on the About screen', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<App />);
    goTo('אודות');
    expect(screen.getByText('לא ניתן לטעון את היסטוריית המשחקים.')).toBeInTheDocument();
    expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument();
  });
});
