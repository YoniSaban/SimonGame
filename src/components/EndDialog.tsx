import { useEffect, useRef } from 'react';
import { MAX_ROUNDS } from '../game/config';

type Props = {
  outcome: 'won' | 'lost';
  completedRounds: number;
  onConfirm: () => void;
};

export default function EndDialog({ outcome, completedRounds, onConfirm }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  const won = outcome === 'won';

  return (
    <div className="end-dialog" role="dialog" aria-modal="true" aria-labelledby="end-dialog-title">
      <div className="end-dialog__card">
        <h2 id="end-dialog-title" className={`end-dialog__title end-dialog__title--${won ? 'win' : 'loss'}`}>
          {won ? 'כל הכבוד! ניצחת!' : 'נפסלת!'}
        </h2>
        <p className="end-dialog__text">
          {won ? (
            <>
              השלמת את כל <bdi>{MAX_ROUNDS}</bdi> השלבים
            </>
          ) : completedRounds === 0 ? (
            'לא הושלמו שלבים'
          ) : (
            <>
              השלמת <bdi>{completedRounds}</bdi> שלבים
            </>
          )}
        </p>
        <button ref={buttonRef} type="button" className="btn btn--primary" onClick={onConfirm}>
          אישור
        </button>
      </div>
    </div>
  );
}
