import { useState } from 'react';
import NavBar, { type Screen } from './components/NavBar';
import HomeScreen from './screens/HomeScreen';
import AboutScreen from './screens/AboutScreen';

export default function App() {
  // Screens are in-app views, not routes, so switching never reloads the page.
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <div className="app">
      <main className="app__content">{screen === 'home' ? <HomeScreen /> : <AboutScreen />}</main>
      <NavBar current={screen} onNavigate={setScreen} />
    </div>
  );
}
