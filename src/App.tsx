import { useEffect, useRef, useState } from 'react';
import NavBar, { type Screen } from './components/NavBar';
import HomeScreen from './screens/HomeScreen';
import AboutScreen from './screens/AboutScreen';
import { useGame } from './game/useGame';
import { createResult } from './history/historyStore';
import { useHistory } from './history/useHistory';
import { applyUpdate, useUpdateAvailable } from './pwa/updateStore';

export default function App() {
  // Screens are in-app views, not routes, so switching never reloads the page.
  const [screen, setScreen] = useState<Screen>('home');
  // Game state lives here so switching screens doesn't unmount it.
  const game = useGame();
  const history = useHistory();
  const { record } = history;
  const updateAvailable = useUpdateAvailable();

  // A finished game is recorded once, when it enters won/lost (not when the message shows), so leaving
  // during the end delay or message can't skip or repeat it. The gameId guard also covers Strict Mode.
  const lastRecordedGameId = useRef(0);
  const { status, gameId, completedRounds } = game.state;
  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return;
    if (lastRecordedGameId.current === gameId) return;
    lastRecordedGameId.current = gameId;
    record(createResult(completedRounds, status === 'won' ? 'win' : 'loss'));
  }, [status, gameId, completedRounds, record]);

  function navigate(next: Screen) {
    // Leaving for About pauses an active game; it resumes only by "resume game".
    if (next === 'about') game.pauseGame();
    setScreen(next);
  }

  return (
    <div className="app">
      <main className="app__content">
        {screen === 'home' ? (
          <HomeScreen
            game={game.state}
            litColor={game.litColor}
            shownRound={game.shownRound}
            endingVisible={game.endingVisible}
            audioError={game.audioError}
            onStart={game.startGame}
            onResume={game.resumeGame}
            onPress={game.pressColor}
            playTone={game.playTone}
            onDismiss={game.dismiss}
            updateAvailable={updateAvailable}
            onUpdate={applyUpdate}
          />
        ) : (
          <AboutScreen history={history} />
        )}
      </main>
      <NavBar current={screen} onNavigate={navigate} />
    </div>
  );
}
