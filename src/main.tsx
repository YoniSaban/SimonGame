import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Bundle only the Heebo weights in use, so the font works offline.
import '@fontsource/heebo/400.css';
import '@fontsource/heebo/600.css';
import '@fontsource/heebo/700.css';
import './styles/index.css';
import App from './App';
import { registerPwa } from './pwa/registerPwa';

registerPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
