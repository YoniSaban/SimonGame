import { registerSW } from 'virtual:pwa-register';
import { setUpdateHandler } from './updateStore';

export function registerPwa() {
  const updateSW = registerSW({
    immediate: true,
    // No automatic skipWaiting: the new version waits for the player's tap on "update".
    onNeedRefresh: () => setUpdateHandler(() => void updateSW(true)),
  });
}
