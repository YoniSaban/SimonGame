import type { ColorId } from './colors';
import { MAX_ROUNDS } from './config';

export type Status = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost';

export type GameState = {
  status: Status;
  sequence: ColorId[];
  round: number; // 1–10
  inputIndex: number;
  completedRounds: number; // 0–10
  gameId: number; // bumped on every new game
  presentationId: number; // bumped on every playback start and on abort, so stale playback is ignored
};

// Random colors are created outside and carried in the action, keeping the reducer pure.
export type GameAction =
  | { type: 'start'; color: ColorId }
  | { type: 'presentationDone'; presentationId: number }
  | { type: 'press'; color: ColorId; nextColor: ColorId }
  | { type: 'dismiss' }
  // Temporary until Milestone 4 replaces it with a real pause.
  | { type: 'abort' };

export const initialState: GameState = {
  status: 'idle',
  sequence: [],
  round: 1,
  inputIndex: 0,
  completedRounds: 0,
  gameId: 0,
  presentationId: 0,
};

function toIdle(state: GameState): GameState {
  return { ...state, status: 'idle', sequence: [], round: 1, inputIndex: 0 };
}

// Actions sent from a state that doesn't allow them return the same state unchanged.
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle') return state;
      return {
        status: 'presenting',
        sequence: [action.color],
        round: 1,
        inputIndex: 0,
        completedRounds: 0,
        gameId: state.gameId + 1,
        presentationId: state.presentationId + 1,
      };

    case 'presentationDone':
      if (state.status !== 'presenting' || action.presentationId !== state.presentationId) return state;
      return { ...state, status: 'awaitingInput', inputIndex: 0 };

    case 'press': {
      if (state.status !== 'awaitingInput') return state;
      if (action.color !== state.sequence[state.inputIndex]) {
        return { ...state, status: 'lost' };
      }
      const inputIndex = state.inputIndex + 1;
      if (inputIndex < state.sequence.length) {
        return { ...state, inputIndex };
      }
      if (state.round >= MAX_ROUNDS) {
        return { ...state, status: 'won', inputIndex, completedRounds: MAX_ROUNDS };
      }
      // Round complete: advance immediately; the waits before the next playback belong to the controller.
      return {
        ...state,
        status: 'presenting',
        sequence: [...state.sequence, action.nextColor],
        round: state.round + 1,
        inputIndex: 0,
        completedRounds: state.round,
        presentationId: state.presentationId + 1,
      };
    }

    case 'dismiss':
      if (state.status !== 'won' && state.status !== 'lost') return state;
      return toIdle(state);

    case 'abort':
      if (state.status === 'idle') return state;
      return { ...toIdle(state), presentationId: state.presentationId + 1 };
  }
}
