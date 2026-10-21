import type { ColorId } from './colors';
import { gameReducer, initialState, type GameAction, type GameState } from './gameReducer';

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

function started(color: ColorId = 'green'): GameState {
  const s = gameReducer(initialState, { type: 'start', color });
  return gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId });
}

// Replays the whole current sequence correctly; the next round gets `nextColor`,
// then the next playback is marked done so the player is up again.
function completeRound(state: GameState, nextColor: ColorId): GameState {
  let s = state;
  for (const color of state.sequence) s = gameReducer(s, { type: 'press', color, nextColor });
  if (s.status === 'presenting') s = gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId });
  return s;
}

describe('gameReducer', () => {
  it('starts round 1 with a single color', () => {
    const s = gameReducer(initialState, { type: 'start', color: 'blue' });
    expect(s).toMatchObject({ status: 'presenting', sequence: ['blue'], round: 1, inputIndex: 0, completedRounds: 0, gameId: 1 });
  });

  it('ignores actions from states that do not allow them', () => {
    expect(gameReducer(initialState, { type: 'press', color: 'red', nextColor: 'red' })).toBe(initialState);
    expect(gameReducer(initialState, { type: 'dismiss' })).toBe(initialState);
    expect(gameReducer(initialState, { type: 'pause' })).toBe(initialState);
    expect(gameReducer(initialState, { type: 'resume' })).toBe(initialState);

    const presenting = gameReducer(initialState, { type: 'start', color: 'green' });
    expect(gameReducer(presenting, { type: 'press', color: 'green', nextColor: 'red' })).toBe(presenting);
    expect(gameReducer(presenting, { type: 'start', color: 'red' })).toBe(presenting);

    const lost = run(started('green'), { type: 'press', color: 'red', nextColor: 'red' });
    expect(gameReducer(lost, { type: 'press', color: 'green', nextColor: 'red' })).toBe(lost);
  });

  it('ignores a stale playback completion', () => {
    const s = gameReducer(initialState, { type: 'start', color: 'green' });
    expect(gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId - 1 })).toBe(s);
    expect(gameReducer(s, { type: 'presentationDone', presentationId: s.presentationId }).status).toBe('awaitingInput');
  });

  it('grows by exactly one color per round, keeping the previous sequence as a prefix', () => {
    const extra: ColorId[] = ['red', 'red', 'yellow', 'blue', 'green', 'green', 'blue', 'yellow', 'red'];
    let s = started('green');
    expect(s.sequence).toHaveLength(1);
    for (let round = 2; round <= 10; round++) {
      const prev = s.sequence;
      s = completeRound(s, extra[round - 2]);
      expect(s.round).toBe(round);
      expect(s.sequence).toHaveLength(round);
      expect(s.sequence.slice(0, prev.length)).toEqual(prev);
      expect(s.completedRounds).toBe(round - 1);
    }
    // Repeated colors are allowed.
    expect(s.sequence).toEqual(['green', ...extra]);
  });

  it('advances input on correct presses and loses on the first wrong one', () => {
    let s = completeRound(completeRound(started('green'), 'red'), 'blue'); // round 3: green, red, blue
    s = gameReducer(s, { type: 'press', color: 'green', nextColor: 'red' });
    expect(s).toMatchObject({ status: 'awaitingInput', inputIndex: 1 });
    s = gameReducer(s, { type: 'press', color: 'yellow', nextColor: 'red' });
    expect(s).toMatchObject({ status: 'lost', round: 3, completedRounds: 2 });
  });

  it('a mistake in round 1 completes 0 rounds', () => {
    const s = run(started('green'), { type: 'press', color: 'blue', nextColor: 'red' });
    expect(s).toMatchObject({ status: 'lost', round: 1, completedRounds: 0 });
  });

  it('a mistake in round 5 completes 4 rounds', () => {
    let s = started('green');
    for (let i = 0; i < 4; i++) s = completeRound(s, 'red');
    expect(s.round).toBe(5);
    s = gameReducer(s, { type: 'press', color: 'blue', nextColor: 'red' });
    expect(s).toMatchObject({ status: 'lost', completedRounds: 4 });
  });

  it('wins after round 10 and never reaches round 11', () => {
    let s = started('green');
    for (let i = 0; i < 9; i++) s = completeRound(s, 'yellow');
    expect(s.round).toBe(10);
    s = completeRound(s, 'blue');
    expect(s).toMatchObject({ status: 'won', round: 10, completedRounds: 10 });
    expect(s.sequence).toHaveLength(10);
    expect(gameReducer(s, { type: 'press', color: 'green', nextColor: 'blue' })).toBe(s);
  });

  it('dismiss returns to idle at round 1', () => {
    const lost = run(started('green'), { type: 'press', color: 'red', nextColor: 'red' });
    const s = gameReducer(lost, { type: 'dismiss' });
    expect(s).toMatchObject({ status: 'idle', round: 1, sequence: [], gameId: lost.gameId });
  });

  it('pause keeps the sequence and round, drops partial input and invalidates pending playback', () => {
    const presenting = gameReducer(initialState, { type: 'start', color: 'green' });
    const paused = gameReducer(presenting, { type: 'pause' });
    expect(paused).toMatchObject({ status: 'paused', sequence: ['green'], round: 1, gameId: presenting.gameId });
    expect(paused.presentationId).toBeGreaterThan(presenting.presentationId);
    expect(gameReducer(paused, { type: 'presentationDone', presentationId: presenting.presentationId })).toBe(paused);
    expect(gameReducer(paused, { type: 'presentationDone', presentationId: paused.presentationId })).toBe(paused);

    // Mid-input in round 3: partial input is dropped, nothing else changes.
    let s = completeRound(completeRound(started('green'), 'red'), 'blue');
    s = gameReducer(s, { type: 'press', color: 'green', nextColor: 'red' });
    expect(s.inputIndex).toBe(1);
    const p = gameReducer(s, { type: 'pause' });
    expect(p).toMatchObject({ status: 'paused', round: 3, inputIndex: 0, completedRounds: 2, sequence: ['green', 'red', 'blue'] });
    expect(gameReducer(p, { type: 'press', color: 'red', nextColor: 'red' })).toBe(p);
    expect(gameReducer(p, { type: 'pause' })).toBe(p);
    expect(gameReducer(p, { type: 'start', color: 'red' })).toBe(p);
  });

  it('resume replays the same round from the start, only once', () => {
    let s = completeRound(started('green'), 'red');
    s = gameReducer(s, { type: 'press', color: 'green', nextColor: 'red' });
    const paused = gameReducer(s, { type: 'pause' });
    const resumed = gameReducer(paused, { type: 'resume' });
    expect(resumed).toMatchObject({ status: 'presenting', round: 2, inputIndex: 0, sequence: ['green', 'red'], resumed: true });
    expect(resumed.presentationId).toBeGreaterThan(paused.presentationId);
    expect(gameReducer(resumed, { type: 'resume' })).toBe(resumed);

    // The next round's playback is a normal one again.
    let next = gameReducer(resumed, { type: 'presentationDone', presentationId: resumed.presentationId });
    next = completeRound(next, 'yellow');
    expect(next).toMatchObject({ round: 3, resumed: false });
  });

  it('pause during the wait between rounds keeps the new round with its added color', () => {
    const s = run(started('green'), { type: 'press', color: 'green', nextColor: 'blue' });
    expect(s).toMatchObject({ status: 'presenting', round: 2 });
    const p = gameReducer(s, { type: 'pause' });
    expect(p).toMatchObject({ status: 'paused', round: 2, completedRounds: 1, sequence: ['green', 'blue'] });
  });

  it('pause from an end state dismisses it to idle', () => {
    const lost = run(started('green'), { type: 'press', color: 'red', nextColor: 'red' });
    expect(gameReducer(lost, { type: 'pause' })).toMatchObject({ status: 'idle', round: 1, sequence: [], gameId: lost.gameId });
  });
});
