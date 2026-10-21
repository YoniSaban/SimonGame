import { useCallback, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import type { History } from '../history/useHistory';

const INSTRUCTIONS = [
  'זכור את רצף הצבעים שמוצג.',
  'לחץ על הצבעים באותו סדר.',
  'נסה להגיע עד שלב 10!',
  'הפעל צליל בטלפון (בלי מצב שקט) כדי לשמוע את הצבעים.',
];

// Local device time in Hebrew format, e.g. 21.10.2026, 14:30. Derived for display only.
function formatFinishedAt(iso: string) {
  return new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
}

type Props = {
  history: History;
};

export default function AboutScreen({ history }: Props) {
  const { results, loadFailed, saveFailed, clearFailed, clear } = history;
  const [confirming, setConfirming] = useState(false);

  const cancel = useCallback(() => setConfirming(false), []);
  const confirm = () => {
    clear();
    setConfirming(false);
  };

  return (
    <section className="screen screen--about">
      <header className="screen__header">
        <h1 className="brand">אודות</h1>
      </header>
      <div className="card">
        <h2 className="card__title">על המשחק</h2>
        {INSTRUCTIONS.map((line) => (
          <p key={line} className="card__line">
            {line}
          </p>
        ))}
      </div>
      <h2 className="section-title">10 המשחקים האחרונים</h2>
      {loadFailed && (
        <p className="storage-error" role="alert">
          לא ניתן לטעון את היסטוריית המשחקים.
        </p>
      )}
      {saveFailed && (
        <p className="storage-error" role="alert">
          לא הצלחנו לשמור את תוצאת המשחק האחרון.
        </p>
      )}
      {clearFailed && (
        <p className="storage-error" role="alert">
          המחיקה נכשלה. ההיסטוריה לא נמחקה.
        </p>
      )}
      {results.length === 0 ? (
        <p className="empty-state">עדיין אין משחקים שמורים</p>
      ) : (
        <>
          <ol className="history-list">
            {results.map((r) => (
              <li key={r.id} className="history-card">
                <div className="history-card__main">
                  <span className="history-card__rounds">
                    שלבים שהושלמו: <bdi>{r.completedRounds}</bdi>
                  </span>
                  <span className={`history-card__outcome history-card__outcome--${r.outcome}`}>
                    {r.outcome === 'win' ? 'ניצחון' : 'הפסד'}
                  </span>
                </div>
                <time className="history-card__date" dateTime={r.finishedAt}>
                  <bdi>{formatFinishedAt(r.finishedAt)}</bdi>
                </time>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn--secondary" onClick={() => setConfirming(true)}>
            מחק היסטוריה
          </button>
        </>
      )}
      {confirming && <ConfirmDialog onConfirm={confirm} onCancel={cancel} />}
    </section>
  );
}
