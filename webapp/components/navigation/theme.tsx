"use client";

import { useSyncExternalStore } from "react";
import styles from "./navigation.module.css";

// Colour mode for the experiment navigation. The choice persists per browser;
// "system" follows the OS.

type Theme = "system" | "light" | "dark";

const themeStorageKey = "nrf-navigation-theme";
const themeChangeEvent = "nrf-navigation-theme-change";

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function subscribeTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(themeChangeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(themeChangeEvent, onChange);
  };
}

function setTheme(next: "light" | "dark") {
  try {
    window.localStorage.setItem(themeStorageKey, next);
  } catch {
    // Storage may be unavailable; the choice then lasts until reload.
    document
      .querySelectorAll<HTMLElement>("[data-nrf-navigation]")
      .forEach((root) => (root.dataset.theme = next));
    return;
  }
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function useNavigationTheme() {
  return useSyncExternalStore<Theme>(subscribeTheme, readTheme, () => "system");
}

export function ThemeToggle() {
  return (
    <div role="group" aria-label="Colour mode" className={styles.segmented}>
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Light mode"
        className={`${styles.segment} ${styles.lightOption}`}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className={styles.icon} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="3" fill="currentColor" stroke="none" />
          <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" />
        </svg>
        light
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Dark mode"
        className={`${styles.segment} ${styles.darkOption}`}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" className={styles.icon} fill="currentColor">
          <path d="M13.5 10.2A6 6 0 0 1 5.8 2.5a6 6 0 1 0 7.7 7.7Z" />
        </svg>
        dark
      </button>
    </div>
  );
}
