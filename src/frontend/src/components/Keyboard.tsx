import { useCallback, useEffect } from "react";
import { TileState } from "../backend";
import type { Guess } from "../backend";
import { triggerHaptic, useHapticEnabled } from "../hooks/useHapticEnabled";
import { useSoundEnabled } from "../hooks/useSoundEnabled";

interface KeyboardProps {
  guesses: Guess[];
  onKey: (key: string) => void;
  disabled?: boolean;
}

const ROW1 = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
const ROW2 = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
const ROW3 = ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"];

function getBestState(guesses: Guess[], letter: string): TileState | null {
  let best: TileState | null = null;
  for (const guess of guesses) {
    for (let i = 0; i < guess.word.length; i++) {
      if (guess.word[i]?.toUpperCase() === letter) {
        const state = guess.states[i] as TileState | undefined;
        if (!state) continue;
        if (state === TileState.correct) return TileState.correct;
        if (state === TileState.present) {
          best = TileState.present;
        } else if (state === TileState.absent && best === null) {
          best = TileState.absent;
        }
      }
    }
  }
  return best;
}

function getKeyClass(state: TileState | null, disabled: boolean): string {
  const base =
    "flex items-center justify-center rounded-md font-display font-bold text-sm select-none transition-smooth cursor-pointer h-14";
  if (disabled) return `${base} opacity-40 cursor-not-allowed`;
  switch (state) {
    case TileState.correct:
      return `${base} tile-correct`;
    case TileState.present:
      return `${base} tile-present`;
    case TileState.absent:
      return `${base} tile-absent opacity-60`;
    default:
      return `${base} bg-muted text-foreground hover:bg-muted/70 active:scale-95`;
  }
}

let audioCtx: AudioContext | null = null;

function playClickSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      440,
      audioCtx.currentTime + 0.04,
    );
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.05);
  } catch {
    /* AudioContext unavailable */
  }
}

export function playChimeSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523, audioCtx.currentTime);
    osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);
  } catch {
    /* AudioContext unavailable */
  }
}

export function playWinSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.connect(gain);
      gain.connect(audioCtx!.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx!.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.25, audioCtx!.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx!.currentTime + i * 0.12 + 0.3,
      );
      osc.start(audioCtx!.currentTime + i * 0.12);
      osc.stop(audioCtx!.currentTime + i * 0.12 + 0.3);
    });
  } catch {
    /* AudioContext unavailable */
  }
}

export function playLossSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);
  } catch {
    /* AudioContext unavailable */
  }
}

export function playInvalidSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(380, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      200,
      audioCtx.currentTime + 0.18,
    );
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.2);
  } catch {
    /* AudioContext unavailable */
  }
}

interface KeyButtonProps {
  label: string;
  state: TileState | null;
  disabled: boolean;
  onPress: (key: string) => void;
  soundEnabled: boolean;
  hapticEnabled: boolean;
}

function KeyButton({
  label,
  state,
  disabled,
  onPress,
  soundEnabled,
  hapticEnabled,
}: KeyButtonProps) {
  const isWide = label === "ENTER" || label === "BACKSPACE";
  const displayLabel = label === "BACKSPACE" ? "⌫" : label;

  const handlePress = () => {
    if (disabled) return;
    triggerHaptic(50, hapticEnabled);
    if (soundEnabled) playClickSound();
    onPress(label);
  };

  return (
    <button
      type="button"
      className={`${getKeyClass(state, disabled)} ${isWide ? "px-3 min-w-[3.2rem]" : "w-9"}`}
      onPointerDown={(e) => {
        e.preventDefault();
        handlePress();
      }}
      disabled={disabled}
      aria-label={label}
      data-ocid={`game.key_${label.toLowerCase()}`}
    >
      {displayLabel}
    </button>
  );
}

export function Keyboard({ guesses, onKey, disabled = false }: KeyboardProps) {
  const { soundEnabled } = useSoundEnabled();
  const { hapticEnabled } = useHapticEnabled();

  const handleKeyPress = useCallback(
    (key: string) => {
      if (disabled) return;
      onKey(key);
    },
    [disabled, onKey],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Let input fields, textareas, and contentEditable handle their own keypresses
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (disabled) return;
      const key = e.key.toUpperCase();
      if (key === "ENTER") {
        onKey("ENTER");
      } else if (key === "BACKSPACE") {
        onKey("BACKSPACE");
      } else if (/^[A-Z]$/.test(key)) {
        onKey(key);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [disabled, onKey]);

  return (
    <div
      className={`flex flex-col items-center gap-1.5 w-full max-w-sm mx-auto transition-opacity duration-300 ${
        disabled ? "opacity-40 pointer-events-none select-none" : ""
      }`}
      data-ocid="game.keyboard"
      aria-label="On-screen keyboard"
      aria-disabled={disabled}
    >
      {[ROW1, ROW2, ROW3].map((row, rowIdx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: keyboard rows are stable positional layout
        <div key={rowIdx} className="flex gap-1 justify-center w-full">
          {row.map((key) => (
            <KeyButton
              key={key}
              label={key}
              state={key.length === 1 ? getBestState(guesses, key) : null}
              disabled={disabled}
              onPress={handleKeyPress}
              soundEnabled={soundEnabled}
              hapticEnabled={hapticEnabled}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
