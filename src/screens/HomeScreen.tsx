import Board from '../components/Board';

export default function HomeScreen() {
  return (
    <section className="screen screen--home">
      <header className="screen__header">
        <h1 className="brand">סיימון</h1>
      </header>
      <p className="round-indicator">
        שלב <bdi>1</bdi> מתוך <bdi>10</bdi>
      </p>
      {/* Status line keeps a fixed height so the layout won't jump once game states add text. */}
      <p className="status" aria-live="polite" />
      <Board />
      <div className="actions">
        <button type="button" className="btn btn--primary">
          התחל משחק
        </button>
      </div>
    </section>
  );
}
