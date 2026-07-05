import { motion } from "motion/react";

import { Button } from "@/components/ui/button";

interface StartScreenProps {
  bestScore: number;
  onStart: () => void;
}

/**
 * Pre-game overlay — title, one-line how-to, and the Start button. Centered
 * over the dark canvas with a single lime accent.
 */
export function StartScreen({ bestScore, onStart }: StartScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex w-full max-w-md flex-col items-center text-center"
      >
        <span className="mb-4 inline-block border-2 border-primary px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
          Word Unscramble Duel
        </span>
        <h2 className="font-display text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          WORDUEL
        </h2>
        <p className="mt-5 max-w-xs font-body text-sm leading-relaxed text-muted-foreground">
          Tap letters into the answer row, hit{" "}
          <span className="font-mono text-foreground">SUBMIT</span> before the
          timer dies. Chain correct answers to multiply your score.
        </p>

        <div
          className="mt-8 flex items-center gap-3"
          data-ocid="worduel.start.best"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Best Score
          </span>
          <span className="font-display text-2xl font-bold tabular-nums text-primary">
            {bestScore}
          </span>
        </div>

        <Button
          variant="default"
          size="lg"
          onClick={onStart}
          data-ocid="worduel.start.primary_button"
          className="mt-8 h-14 px-10 font-display text-lg font-bold uppercase tracking-wider shadow-tile-lift"
        >
          Start
        </Button>
      </motion.div>
    </div>
  );
}
