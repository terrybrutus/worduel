import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

import { LetterTile } from "@/components/LetterTile";
import { Button } from "@/components/ui/button";
import type { RoundOutcome } from "@/hooks/useGame";
import { cn } from "@/lib/utils";

interface GameScreenProps {
  target: string;
  pool: { id: number; char: string }[];
  placedChars: (string | null)[];
  usedIds: Set<number>;
  isAnswerComplete: boolean;
  lastOutcome: RoundOutcome;
  timeLeft: number;
  onPlace: (poolId: number) => void;
  onRemove: (slotIndex: number) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onAdvance: () => void;
}

const OUTCOME_COPY: Record<
  Exclude<RoundOutcome, null>,
  { label: string; tone: string }
> = {
  correct: { label: "Correct", tone: "text-primary" },
  incorrect: { label: "Wrong", tone: "text-destructive" },
  skipped: { label: "Skipped", tone: "text-muted-foreground" },
  timeout: { label: "Time's up", tone: "text-destructive" },
};

/**
 * Centered game stage — answer slots above the letter pool, submit/skip below.
 * Shows a brief outcome banner between rounds.
 */
export function GameScreen({
  target,
  pool,
  placedChars,
  usedIds,
  isAnswerComplete,
  lastOutcome,
  timeLeft,
  onPlace,
  onRemove,
  onSubmit,
  onSkip,
  onAdvance,
}: GameScreenProps) {
  const showOutcome = lastOutcome != null;
  const outcome = showOutcome ? OUTCOME_COPY[lastOutcome] : null;

  // Keyboard: Enter submits / advances, Backspace removes last placed letter.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (showOutcome) onAdvance();
        else if (isAnswerComplete) onSubmit();
      } else if (e.key === "Backspace" && !showOutcome) {
        e.preventDefault();
        const lastFilled = [...placedChars.keys()]
          .reverse()
          .find((i) => placedChars[i] != null);
        if (lastFilled != null) onRemove(lastFilled);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    showOutcome,
    isAnswerComplete,
    placedChars,
    onAdvance,
    onSubmit,
    onRemove,
  ]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
      {/* Answer row */}
      <div
        className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        data-ocid="worduel.answer.row"
      >
        {placedChars.map((char, i) => {
          const isFilled = char != null;
          return (
            <LetterTile
              // biome-ignore lint/suspicious/noArrayIndexKey: slot index is the stable identity
              key={`slot-${i}`}
              char={char ?? "·"}
              state={isFilled ? "placed" : "empty"}
              index={i}
              animatePop={isFilled}
              onClick={isFilled ? () => onRemove(i) : undefined}
              markerId={`worduel.answer.slot.${i + 1}`}
            />
          );
        })}
      </div>

      {/* Outcome banner */}
      <div className="mt-6 h-10" aria-live="polite">
        <AnimatePresence mode="wait">
          {showOutcome && outcome != null && (
            <motion.div
              key={lastOutcome}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
              data-ocid="worduel.outcome.banner"
            >
              <span
                className={cn(
                  "font-display text-2xl font-extrabold uppercase tracking-wider",
                  outcome.tone,
                )}
              >
                {outcome.label}
              </span>
              <span className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Answer: <span className="text-foreground">{target}</span>
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Letter pool */}
      <div
        className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
        data-ocid="worduel.pool.row"
      >
        {pool.map((letter, i) => {
          const used = usedIds.has(letter.id);
          return (
            <LetterTile
              key={letter.id}
              char={letter.char}
              state={used ? "disabled" : "pool"}
              index={i}
              animatePop={!used}
              onClick={used ? undefined : () => onPlace(letter.id)}
              markerId={`worduel.pool.tile.${i + 1}`}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div className="mt-10 flex items-center gap-3">
        {showOutcome ? (
          <Button
            variant="default"
            size="lg"
            onClick={onAdvance}
            data-ocid="worduel.next.primary_button"
            className="h-12 px-8 font-display text-base font-bold uppercase tracking-wider shadow-tile-lift"
          >
            Next
          </Button>
        ) : (
          <>
            <Button
              variant="default"
              size="lg"
              onClick={onSubmit}
              disabled={!isAnswerComplete}
              data-ocid="worduel.submit.primary_button"
              className="h-12 px-8 font-display text-base font-bold uppercase tracking-wider shadow-tile-lift disabled:shadow-none"
            >
              Submit
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onSkip}
              data-ocid="worduel.skip.secondary_button"
              className="h-12 border-2 px-6 font-display text-base font-bold uppercase tracking-wider text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Skip
            </Button>
          </>
        )}
      </div>

      {/* Time-left hint for screen readers */}
      <span className="sr-only" data-ocid="worduel.timer.sr">
        {timeLeft} seconds remaining
      </span>
    </div>
  );
}
