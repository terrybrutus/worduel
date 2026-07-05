import { cn } from "@/lib/utils";

interface HudProps {
  score: number;
  streak: number;
  roundIndex: number;
  totalRounds: number;
  timeLeft: number;
  roundSeconds: number;
  bestScore: number;
}

function Stat({
  label,
  value,
  accent,
  markerId,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  markerId: string;
}) {
  return (
    <div
      className="flex flex-col items-center px-3 sm:px-5"
      data-ocid={markerId}
    >
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
        {label}
      </span>
      <span
        className={cn(
          "font-display text-xl sm:text-2xl font-bold tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-8 w-px bg-border" aria-hidden />;
}

/**
 * Persistent HUD — Worduel title on the left, score/streak/round stats in the
 * center, timer + best score on the right. Sits in the elevated card header.
 */
export function Hud({
  score,
  streak,
  roundIndex,
  totalRounds,
  timeLeft,
  roundSeconds,
  bestScore,
}: HudProps) {
  const danger = timeLeft <= 5 && timeLeft > 0;
  const timerPct = Math.max(0, Math.min(1, timeLeft / roundSeconds));

  return (
    <header className="bg-card border-b-2 border-border shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-baseline gap-2" data-ocid="worduel.brand">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-primary">
            WORDUEL
          </h1>
        </div>

        {/* Center stats */}
        <div className="flex items-center">
          <Stat label="Score" value={score} markerId="worduel.hud.score" />
          <Divider />
          <Stat
            label="Streak"
            value={streak > 0 ? `x${streak}` : "—"}
            accent={streak >= 2}
            markerId="worduel.hud.streak"
          />
          <Divider />
          <Stat
            label="Round"
            value={`${roundIndex + 1}/${totalRounds}`}
            markerId="worduel.hud.round"
          />
        </div>

        {/* Right: timer + best */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="flex flex-col items-end"
            data-ocid="worduel.hud.timer"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
              Time
            </span>
            <span
              className={cn(
                "font-display text-xl sm:text-2xl font-bold tabular-nums",
                danger
                  ? "text-destructive animate-timer-pulse"
                  : "text-foreground",
              )}
            >
              {timeLeft}s
            </span>
          </div>
          <div
            className="hidden flex-col items-end sm:flex"
            data-ocid="worduel.hud.best"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
              Best
            </span>
            <span className="font-display text-lg font-bold tabular-nums text-muted-foreground">
              {bestScore}
            </span>
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1 w-full bg-border" aria-hidden>
        <div
          className={cn(
            "h-full transition-[width] duration-1000 ease-linear",
            danger ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${timerPct * 100}%` }}
        />
      </div>
    </header>
  );
}
