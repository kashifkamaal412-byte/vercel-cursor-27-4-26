import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type ThemeOption = "light" | "dark" | "system";
type ResolvedTheme = Exclude<ThemeOption, "system">;

const THEME_STORAGE_KEY = "app-theme";
const ACCENT_STORAGE_KEY = "app-accent";
const DEFAULT_THEME: ThemeOption = "dark";
const DEFAULT_ACCENT = "#3b82f6";
const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

interface ThemeContextValue {
  theme: ThemeOption;
  resolvedTheme: ResolvedTheme;
  accent: string;
  setTheme: (theme: ThemeOption) => void;
  setAccent: (accent: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const isBrowser = typeof window !== "undefined";

const getStoredTheme = (): ThemeOption => {
  if (!isBrowser) return DEFAULT_THEME;

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
    ? storedTheme
    : DEFAULT_THEME;
};

const getStoredAccent = (): string => {
  if (!isBrowser) return DEFAULT_ACCENT;

  const storedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY);
  return storedAccent && /^#[0-9A-Fa-f]{6}$/.test(storedAccent) ? storedAccent : DEFAULT_ACCENT;
};

const getSystemTheme = (): ResolvedTheme => {
  if (!isBrowser) return "dark";
  return window.matchMedia(THEME_MEDIA_QUERY).matches ? "dark" : "light";
};

const resolveTheme = (theme: ThemeOption): ResolvedTheme => (theme === "system" ? getSystemTheme() : theme);

const hexToHsl = (hex: string) => {
  const safeHex = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : DEFAULT_ACCENT;
  const r = Number.parseInt(safeHex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(safeHex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(safeHex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        hue = (g - b) / delta + (g < b ? 6 : 0);
        break;
      case g:
        hue = (b - r) / delta + 2;
        break;
      default:
        hue = (r - g) / delta + 4;
        break;
    }

    hue *= 60;
  }

  return {
    h: Math.round(hue),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
};

const applyAccentToDom = (accent: string) => {
  if (!isBrowser) return;

  const root = document.documentElement;
  const { h, s, l } = hexToHsl(accent);
  const hsl = `${h} ${s}% ${l}%`;
  const glowOpacity = root.classList.contains("light") ? 0.18 : 0.38;
  const primaryForeground = l >= 60 ? "220 20% 8%" : "0 0% 100%";

  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--ring", hsl);
  root.style.setProperty("--neon-cyan", hsl);
  root.style.setProperty("--primary-foreground", primaryForeground);
  root.style.setProperty("--glow-primary", `0 0 24px hsl(${h} ${s}% ${l}% / ${glowOpacity})`);
};

const applyThemeToDom = (theme: ThemeOption, accent: string) => {
  if (!isBrowser) return;

  const root = document.documentElement;
  const resolvedTheme = resolveTheme(theme);

  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;

  applyAccentToDom(accent);
};

export const initializeTheme = () => {
  if (!isBrowser) return;
  applyThemeToDom(getStoredTheme(), getStoredAccent());
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeOption>(() => getStoredTheme());
  const [accent, setAccentState] = useState<string>(() => getStoredAccent());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  useEffect(() => {
    if (!isBrowser) return;

    const mediaQuery = window.matchMedia(THEME_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isBrowser) return;

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    applyThemeToDom(theme, accent);
  }, [theme, accent, systemTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: theme === "system" ? systemTheme : theme,
      accent,
      setTheme: setThemeState,
      setAccent: setAccentState,
    }),
    [theme, systemTheme, accent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }

  return context;
};