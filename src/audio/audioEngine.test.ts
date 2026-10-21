import { AUDIO_UNLOCK_TIMEOUT_MS, TONE_HZ } from '../game/config';

// A minimal stand-in for Web Audio, which jsdom doesn't provide.
class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
}

class FakeOscillator {
  type = '';
  frequency = new FakeParam();
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeContext {
  static resumeBehavior: 'ok' | 'reject' | 'hang' = 'ok';
  static last: FakeContext;
  state = 'suspended';
  currentTime = 0;
  destination = {};
  oscillators: FakeOscillator[] = [];
  constructor() {
    FakeContext.last = this;
  }
  resume = vi.fn(() => {
    if (FakeContext.resumeBehavior === 'reject') return Promise.reject(new Error('blocked'));
    if (FakeContext.resumeBehavior === 'hang') return new Promise<void>(() => {});
    this.state = 'running';
    return Promise.resolve();
  });
  createOscillator() {
    const osc = new FakeOscillator();
    this.oscillators.push(osc);
    return osc;
  }
  createGain() {
    return { gain: new FakeParam(), connect: vi.fn(), disconnect: vi.fn() };
  }
  createBuffer() {
    return {};
  }
  createBufferSource() {
    return { buffer: null, connect: vi.fn(), start: vi.fn() };
  }
}

// The engine keeps its context in module state, so each test loads a fresh copy.
async function loadEngine() {
  vi.resetModules();
  return import('./audioEngine');
}

describe('audio engine', () => {
  beforeEach(() => {
    FakeContext.resumeBehavior = 'ok';
    vi.stubGlobal('AudioContext', FakeContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('unlocks when the context ends up running', async () => {
    const engine = await loadEngine();
    await expect(engine.unlockAudio()).resolves.toBe(true);
    expect(FakeContext.last.resume).toHaveBeenCalled();
  });

  it('reports failure when resume() is rejected', async () => {
    FakeContext.resumeBehavior = 'reject';
    const engine = await loadEngine();
    await expect(engine.unlockAudio()).resolves.toBe(false);
  });

  it('reports failure when resume() never finishes', async () => {
    vi.useFakeTimers();
    FakeContext.resumeBehavior = 'hang';
    const engine = await loadEngine();
    const result = engine.unlockAudio();
    await vi.advanceTimersByTimeAsync(AUDIO_UNLOCK_TIMEOUT_MS);
    await expect(result).resolves.toBe(false);
  });

  it('reports failure when Web Audio is missing', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const engine = await loadEngine();
    await expect(engine.unlockAudio()).resolves.toBe(false);
  });

  it('makes no sound before audio is unlocked', async () => {
    const engine = await loadEngine();
    expect(() => engine.playTone('green')()).not.toThrow();
    expect(() => engine.playEndSound('won')()).not.toThrow();
  });

  it('gives each of the four colors a different pitch', async () => {
    const engine = await loadEngine();
    await engine.unlockAudio();
    (['green', 'red', 'yellow', 'blue'] as const).forEach((color) => engine.playTone(color));
    const pitches = FakeContext.last.oscillators.map((osc) => osc.frequency.value);
    expect(pitches).toEqual([TONE_HZ.green, TONE_HZ.red, TONE_HZ.yellow, TONE_HZ.blue]);
    expect(new Set(pitches).size).toBe(4);
  });

  it('a tone sounds until stopped, then fades out; stopping twice is safe', async () => {
    const engine = await loadEngine();
    await engine.unlockAudio();
    const stop = engine.playTone('red');
    const osc = FakeContext.last.oscillators[0];
    expect(osc.start).toHaveBeenCalled();
    expect(osc.stop).not.toHaveBeenCalled();
    stop();
    stop();
    expect(osc.stop).toHaveBeenCalledTimes(1);
  });

  it('win and loss have different motifs', async () => {
    const engine = await loadEngine();
    await engine.unlockAudio();
    engine.playEndSound('won');
    const win = FakeContext.last.oscillators.map((osc) => osc.frequency.value);
    FakeContext.last.oscillators = [];
    engine.playEndSound('lost');
    const loss = FakeContext.last.oscillators.map((osc) => osc.frequency.value);
    expect(win.length).toBeGreaterThan(1);
    expect(loss.length).toBeGreaterThan(1);
    expect(win).not.toEqual(loss);
  });

  it('stopAllSounds stops every playing sound', async () => {
    const engine = await loadEngine();
    await engine.unlockAudio();
    engine.playTone('green');
    engine.playTone('blue');
    engine.playEndSound('lost');
    const oscillators = [...FakeContext.last.oscillators];
    oscillators.forEach((osc) => osc.stop.mockClear());
    engine.stopAllSounds();
    oscillators.forEach((osc) => expect(osc.stop).toHaveBeenCalled());
  });
});
