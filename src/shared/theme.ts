import type { ThemePreference } from './settings';

export function resolveThemePreference(theme: ThemePreference, currentWindow: Window) {
  if (theme === 'light' || theme === 'dark') {
    return theme;
  }

  if (typeof currentWindow.matchMedia !== 'function') {
    return 'light';
  }

  return currentWindow.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyThemePreference(document: Document, currentWindow: Window, theme: ThemePreference) {
  const resolvedTheme = resolveThemePreference(theme, currentWindow);
  document.documentElement.dataset.theme = resolvedTheme;
}
