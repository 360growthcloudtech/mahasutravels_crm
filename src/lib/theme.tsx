"use client";

import * as React from "react";

const THEME_KEY = "mahasu-theme";

export type Theme = "light" | "dark";

type ThemeCtx = {
  theme: Theme;
  /** False until client has synced theme from DOM/localStorage (avoids hydration mismatch). */
  ready: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = React.createContext<ThemeCtx>({
  theme: "light",
  ready: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function readStoredTheme(): Theme {
  try {
    if (window.localStorage.getItem(THEME_KEY) === "dark") return "dark";
  } catch {
    // ignore
  }
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start as light on server + first client render so SSR HTML matches.
  const [theme, setThemeState] = React.useState<Theme>("light");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const initial = readStoredTheme();
    setThemeState(initial);
    applyTheme(initial);
    setReady(true);
  }, []);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, ready, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
