import { motion } from "motion/react";

import { Button } from "@/components/ui/button";

interface EndScreenProps {
  score: number;
  bestStreak: number;
  bestScore: number;
  isNewBest: boolean;
  onPlayAgain: () => void;
}

function ResultStat({
  label,
  value,
  highlight,
  markerId,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  markerId: string;
}) {
  return (
    <div
      className="flex flex-col items-center border-2 border-border bg-card px-6 py-4"
      data-ocid={markerId}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span
        className={`font-display text-3xl font-extrabold tabular-nums ${
          highlight ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Final score screen — big score, stat tiles, new-best banner, play again.
 */
export function EndScreen({
  score,
  bestStreak,
  bestScore,
  isNewBest,
  onPlayAgain,
}: EndScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex w-full max-w-md flex-col items-center text-center"
      >
        <span className="mb-3 inline-block border-2 border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Round Complete
        </span>

        {isNewBest && (
          <motion.span
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-2 inline-block bg-primary px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground"
            data-ocid="worduel.end.new_best"
          >
            New Best
          </motion.span>
        )}

        <h2 className="font-display text-6xl font-extrabold tabular-nums text-foreground">
          {score}
        </h2>
        <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Final Score
        </p>

        <div className="mt-8 grid w-full grid-cols-2 gap-3">
          <ResultStat
            label="Best Streak"
            value={`x${bestStreak}`}
            highlight={bestStreak >= 3}
            markerId="worduel.end.best_streak"
          />
          <ResultStat
            label="Best Score"
            value={bestScore}
            markerId="worduel.end.best_score"
          />
        </div>

        <Button
          variant="default"
          size="lg"
          onClick={onPlayAgain}
          data-ocid="worduel.end.play_again.primary_button"
          className="mt-10 h-14 px-10 font-display text-lg font-bold uppercase tracking-wider shadow-tile-lift"
        >
          Play Again
        </Button>
      </motion.div>
    </div>
  );
}
