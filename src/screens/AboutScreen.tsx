const INSTRUCTIONS = [
  'זכור את רצף הצבעים שמוצג.',
  'לחץ על הצבעים באותו סדר.',
  'נסה להגיע עד שלב 10!',
  'הפעל צליל בטלפון (בלי מצב שקט) כדי לשמוע את הצבעים.',
];

export default function AboutScreen() {
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
      <p className="empty-state">עדיין אין משחקים שמורים</p>
    </section>
  );
}
