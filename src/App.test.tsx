import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App shell', () => {
  it('shows the home screen by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'סיימון' })).toBeInTheDocument();
    // The numbers sit in <bdi> elements, so match the whole paragraph text.
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'שלב 1 מתוך 10'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
    for (const name of ['ירוק', 'אדום', 'צהוב', 'כחול']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('lays out the board green, red, yellow, blue (TL, TR, BL, BR)', () => {
    const { container } = render(<App />);
    const pads = [...container.querySelectorAll('.board__pad')].map((el) => el.getAttribute('data-color'));
    expect(pads).toEqual(['green', 'red', 'yellow', 'blue']);
  });

  it('has exactly two navigation options', () => {
    render(<App />);
    const nav = screen.getByRole('navigation');
    expect(within(nav).getAllByRole('button').map((b) => b.textContent)).toEqual(['בית', 'אודות']);
  });

  it('navigates to About and back without losing the home screen', async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = screen.getByRole('navigation');

    await user.click(within(nav).getByRole('button', { name: 'אודות' }));
    expect(screen.getByRole('heading', { name: 'אודות' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'על המשחק' })).toBeInTheDocument();
    expect(screen.getByText('זכור את רצף הצבעים שמוצג.')).toBeInTheDocument();
    expect(screen.getByText('לחץ על הצבעים באותו סדר.')).toBeInTheDocument();
    expect(screen.getByText('נסה להגיע עד שלב 10!')).toBeInTheDocument();
    expect(screen.getByText('הפעל צליל בטלפון (בלי מצב שקט) כדי לשמוע את הצבעים.')).toBeInTheDocument();
    expect(screen.getByText('עדיין אין משחקים שמורים')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'אודות' })).toHaveAttribute('aria-current', 'page');

    await user.click(within(nav).getByRole('button', { name: 'בית' }));
    expect(screen.getByRole('heading', { name: 'סיימון' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'בית' })).toHaveAttribute('aria-current', 'page');
  });
});
