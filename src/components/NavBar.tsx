export type Screen = 'home' | 'about';

const ITEMS: { id: Screen; label: string }[] = [
  { id: 'home', label: 'בית' },
  { id: 'about', label: 'אודות' },
];

type Props = {
  current: Screen;
  onNavigate: (screen: Screen) => void;
};

export default function NavBar({ current, onNavigate }: Props) {
  return (
    <nav className="navbar" aria-label="ניווט ראשי">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="navbar__item"
          aria-current={item.id === current ? 'page' : undefined}
          onClick={() => onNavigate(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
