import { COLORS } from '../game/colors';

export default function Board() {
  return (
    <div className="board">
      {COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          className={`board__pad board__pad--${color.id}`}
          aria-label={color.label}
          data-color={color.id}
        />
      ))}
      <div className="board__center" aria-hidden="true" />
    </div>
  );
}
