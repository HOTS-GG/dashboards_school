import { useEffect, useState } from "react";

// Per-PC display preferences, kept in localStorage (browser storage is fine:
// losing them only resets the look).

export type ThemePref = "system" | "light" | "dark";
export type TextSize = "small" | "normal" | "large" | "xlarge";

export type Prefs = { theme: ThemePref; textSize: TextSize; showStrip: boolean };

export const TEXT_SCALE: Record<TextSize, number> = { small: 0.93, normal: 1, large: 1.15, xlarge: 1.3 };

const KEY = "prefs-v1";
const DEFAULTS: Prefs = { theme: "system", textSize: "normal", showStrip: true };
const listeners = new Set<(p: Prefs) => void>();

function read(): Prefs {
  try {
    const legacyStrip = localStorage.getItem("show-today-strip");
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { ...DEFAULTS, ...(legacyStrip === "0" ? { showStrip: false } : {}), ...saved };
  } catch {
    return DEFAULTS;
  }
}

let current = read();

export function getPrefs(): Prefs {
  return current;
}

export function setPrefs(change: Partial<Prefs>) {
  current = { ...current, ...change };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {}
  apply();
  listeners.forEach((fn) => fn(current));
}

export function usePrefs(): Prefs {
  const [p, setP] = useState(current);
  useEffect(() => {
    listeners.add(setP);
    return () => void listeners.delete(setP);
  }, []);
  return p;
}

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

export function isDark(p: Prefs = current) {
  return p.theme === "dark" || (p.theme === "system" && darkQuery.matches);
}

/** Puts the resolved theme and text scale on <html>; tokens.css reads them. */
export function apply() {
  const root = document.documentElement;
  root.dataset.theme = isDark() ? "dark" : "light";
  root.style.setProperty("--text-scale", String(TEXT_SCALE[current.textSize]));
}

darkQuery.addEventListener("change", () => {
  apply();
  listeners.forEach((fn) => fn(current));
});
apply();
