import { useSyncExternalStore } from 'react';

// Holds "a new version is waiting" outside React, so the service worker callback can set it
// and the Home screen can read it. Kept free of the PWA virtual module so tests can use it.
let activate: (() => void) | null = null;
const listeners = new Set<() => void>();

export function setUpdateHandler(handler: (() => void) | null) {
  activate = handler;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useUpdateAvailable() {
  return useSyncExternalStore(subscribe, () => activate !== null);
}

// Activates the waiting version and reloads; only ever called from the player's tap on "update".
export function applyUpdate() {
  activate?.();
}
