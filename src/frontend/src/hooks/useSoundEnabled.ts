import { useEffect, useState } from "react";

const SOUND_STORAGE_KEY = "__worduel_sound__";

export function useSoundEnabled() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SOUND_STORAGE_KEY) !== "false";
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SOUND_STORAGE_KEY) {
        setSoundEnabled(e.newValue !== "false");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_STORAGE_KEY, next ? "true" : "false");
      return next;
    });
  };

  return { soundEnabled, toggleSound };
}
