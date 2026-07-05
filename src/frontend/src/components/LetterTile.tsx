import { cn } from "@/lib/utils";

interface LetterTileProps {
  char: string;
  state?: "pool" | "placed" | "empty" | "disabled";
  onClick?: () => void;
  index?: number;
  markerId?: string;
  animatePop?: boolean;
}

/**
 * Brutalist letter tile — sharp 2px corners, flat surface, one hard shadow
 * when active. Used for both the letter pool and the answer slots.
 */
export function LetterTile({
  char,
  state = "pool",
  onClick,
  index = 0,
  markerId,
  animatePop = false,
}: LetterTileProps) {
  const base =
    "relative flex items-center justify-center font-display font-bold uppercase select-none transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const size = "h-14 w-14 sm:h-16 sm:w-16 text-2xl sm:text-3xl";

  const variants: Record<NonNullable<LetterTileProps["state"]>, string> = {
    pool: cn(
      "tile-surface text-foreground hover:-translate-y-0.5 hover:border-primary/60 active:translate-y-0 cursor-pointer",
    ),
    placed: cn(
      "tile-active border-2 border-primary cursor-pointer",
      "shadow-tile-lift",
    ),
    empty: cn(
      "border-2 border-dashed border-border bg-transparent text-muted-foreground/40",
    ),
    disabled:
      "tile-surface text-muted-foreground/40 opacity-60 cursor-not-allowed",
  };

  const isInteractive = state === "pool" || state === "placed";

  return (
    <button
      type="button"
      data-ocid={markerId}
      aria-label={`${state === "placed" ? "Remove" : "Place"} letter ${char}`}
      onClick={isInteractive ? onClick : undefined}
      disabled={!isInteractive}
      style={{ animationDelay: `${index * 0.04}s` }}
      className={cn(
        base,
        size,
        variants[state],
        animatePop && "animate-tile-pop",
      )}
    >
      {char}
    </button>
  );
}
