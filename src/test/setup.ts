import '@testing-library/jest-dom/vitest';

// Keep saved history from leaking between tests.
beforeEach(() => {
  localStorage.clear();
});
