import { useState } from 'react';
import NavBar, { type Screen } from './components/NavBar';
import HomeScreen from './screens/HomeScreen';
import AboutScreen from './screens/AboutScreen';
import { useGame } from './game/useGame';

export default function App() {
  // Screens are in-app views, not routes, so switching never reloads the page.
  const [screen, setScreen] = useState<Screen>('home');
  // Game state lives here so switching screens doesn't unmount it.
  const game = useGame();

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
          />
        ) : (
          <AboutScreen />
        )}
      </main>
      <NavBar current={screen} onNavigate={navigate} />
    </div>
  );
}
