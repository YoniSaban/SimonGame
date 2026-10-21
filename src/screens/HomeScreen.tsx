import Board, { type BoardMode } from '../components/Board';
import EndDialog from '../components/EndDialog';
import type { ColorId } from '../game/colors';
import { MAX_ROUNDS } from '../game/config';
import type { GameState } from '../game/gameReducer';

type Props = {
  game: GameState;
  litColor: ColorId | null;
  shownRound: number;
  endingVisible: boolean;
  onStart: () => void;
  onPress: (color: ColorId) => void;
  onDismiss: () => void;
};

const STATUS_TEXT: Partial<Record<GameState['status'], string>> = {
  presenting: 'המשחק מציג את הרצף',
  awaitingInput: 'התור שלך',
};

const HINT_TEXT: Partial<Record<GameState['status'], string>> = {
  presenting: 'המתן...',
  awaitingInput: 'הקש על הצבעים לפי הסדר',
};

const BOARD_MODE: Record<GameState['status'], BoardMode> = {
  idle: 'show',
  presenting: 'presenting',
  awaitingInput: 'input',
  won: 'locked',
  lost: 'locked',
};

export default function HomeScreen({ game, litColor, shownRound, endingVisible, onStart, onPress, onDismiss }: Props) {
  const { status } = game;
  const ended = status === 'won' || status === 'lost';

  return (
    <section className="screen screen--home">
      <header className="screen__header">
        <h1 className="brand">סיימון</h1>
      </header>
      <p className="round-indicator">
        שלב <bdi>{shownRound}</bdi> מתוך <bdi>{MAX_ROUNDS}</bdi>
      </p>
      {/* Status line keeps a fixed height so the layout won't jump between states. */}
      <p className="status" aria-live="polite">
        {STATUS_TEXT[status] ?? ''}
      </p>
      <div className="board-wrap">
        <Board mode={BOARD_MODE[status]} litColor={litColor} onPress={onPress} />
        {ended && endingVisible && (
          <EndDialog outcome={status} completedRounds={game.completedRounds} onConfirm={onDismiss} />
        )}
      </div>
      <div className="actions">
        {status === 'idle' ? (
          <button type="button" className="btn btn--primary" onClick={onStart}>
            התחל משחק
          </button>
        ) : (
          <p className="hint">{HINT_TEXT[status] ?? ''}</p>
        )}
      </div>
    </section>
  );
}
