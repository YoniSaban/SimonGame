import { useEffect, useRef } from 'react';

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

// Delete-history confirmation: a layer inside the About screen, not a screen of its own.
export default function ConfirmDialog({ onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus starts on the safe action; Escape also cancels.
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-text"
    >
      <div className="confirm-dialog__card">
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          למחוק את ההיסטוריה?
        </h2>
        <p id="confirm-dialog-text" className="confirm-dialog__text">
          כל תוצאות המשחקים יימחקו.
        </p>
        {/* RTL: the first button sits on the right, as in the mockup. */}
        <div className="confirm-dialog__buttons">
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            מחק
          </button>
          <button ref={cancelRef} type="button" className="btn btn--light" onClick={onCancel}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
