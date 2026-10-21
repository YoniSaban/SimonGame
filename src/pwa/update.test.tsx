import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { unlockAudio } from '../audio/audioEngine';
import { FLASH_MS } from '../game/config';
import { setUpdateHandler } from './updateStore';

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
const BLUE = 'כחול';
const UPDATE_TEXT = 'יש גרסה חדשה';

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

function goTo(name: 'בית' | 'אודות') {
  act(() => {
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name }));
  });
}

function offerUpdate(activate: () => void) {
  act(() => setUpdateHandler(activate));
}

function updateBar() {
  return screen.queryByText(UPDATE_TEXT);
}

describe('update available message', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.mocked(unlockAudio).mockResolvedValue(true);
  });

  afterEach(() => {
    act(() => setUpdateHandler(null));
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is hidden when no new version is waiting', () => {
    render(<App />);
    expect(updateBar()).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'עדכן' })).not.toBeInTheDocument();
  });

  it('shows before a game starts, and "עדכן" activates the new version once', () => {
    const activate = vi.fn();
    render(<App />);
    offerUpdate(activate);
    expect(updateBar()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'עדכן' }));
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('hides during play, pause and the end message, and returns after "אישור"', async () => {
    const activate = vi.fn();
    render(<App />);
    offerUpdate(activate);

    await clickButton('התחל משחק');
    expect(updateBar()).not.toBeInTheDocument(); // presenting
    await advance(1000 + FLASH_MS);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    expect(updateBar()).not.toBeInTheDocument(); // awaitingInput

    goTo('אודות');
    goTo('בית');
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();
    expect(updateBar()).not.toBeInTheDocument(); // paused

    await clickButton('המשך משחק');
    await advance(1000 + FLASH_MS);
    act(() => {
      fireEvent.pointerDown(screen.getByRole('button', { name: BLUE }), { button: 0 });
      fireEvent.pointerUp(window);
    });
    await advance(1000);
    expect(screen.getByText('נפסלת!')).toBeInTheDocument();
    expect(updateBar()).not.toBeInTheDocument(); // lost

    await clickButton('אישור');
    expect(updateBar()).toBeInTheDocument();
    expect(activate).not.toHaveBeenCalled();
  });

  it('a version arriving mid-game shows nothing and never interrupts the game', async () => {
    const activate = vi.fn();
    render(<App />);
    await clickButton('התחל משחק');
    await advance(1000 + FLASH_MS);

    offerUpdate(activate);
    expect(updateBar()).not.toBeInTheDocument();
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    expect(activate).not.toHaveBeenCalled();
  });
});
