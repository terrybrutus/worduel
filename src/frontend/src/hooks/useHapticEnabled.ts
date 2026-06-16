import { useEffect, useState } from "react";

const HAPTIC_STORAGE_KEY = "__worduel_haptic__";

function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return navigator.maxTouchPoints > 0 || "ontouchstart" in window;
}

export function useHapticEnabled() {
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(HAPTIC_STORAGE_KEY);
    if (stored !== null) return stored === "true";
    // Default: on for mobile, off for desktop
    return isMobileDevice();
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === HAPTIC_STORAGE_KEY) {
        setHapticEnabled(e.newValue === "true");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleHaptic = () => {
    setHapticEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(HAPTIC_STORAGE_KEY, next ? "true" : "false");
      return next;
    });
  };

  const supportsVibration =
    typeof window !== "undefined" && "vibrate" in navigator;

  return { hapticEnabled, toggleHaptic, supportsVibration };
}

/** Safe haptic trigger — respects the toggle and browser support */
export function triggerHaptic(
  pattern: number | number[],
  enabled: boolean,
): void {
  if (!enabled) return;
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* unavailable */
  }
}
