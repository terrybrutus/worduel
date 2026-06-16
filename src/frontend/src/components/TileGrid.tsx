import { TileState } from "../backend";
import type { Guess } from "../backend";

interface TileGridProps {
  guesses: Guess[];
  currentInput: string;
  maxGuesses?: number;
  isFlipping?: boolean;
  /** Shake the current input row (invalid word feedback) */
  isShaking?: boolean;
  /** Legacy: shake a specific row index */
  shakeRow?: number;
  showPlayerLabels?: boolean;
  label?: string;
}

function getTileClass(state: TileState | null): string {
  switch (state) {
    case TileState.correct:
      return "tile tile-correct";
    case TileState.present:
      return "tile tile-present";
    case TileState.absent:
      return "tile tile-absent";
    default:
      return "tile tile-empty";
  }
}

interface TileCellProps {
  letter: string;
  state: TileState | null;
  flipDelay?: number;
  isFlipping?: boolean;
}

export function TileCell({
  letter,
  state,
  flipDelay = 0,
  isFlipping = false,
}: TileCellProps) {
  const hasState = state !== null;
  const className = getTileClass(state);
  const inputClass =
    !hasState && letter ? "tile tile-input tile-input-active" : className;

  return (
    <div
      className={`${inputClass} select-none`}
      style={
        isFlipping && hasState
          ? { animation: `tileFlip 0.6s ease-in-out ${flipDelay}s both` }
          : undefined
      }
      aria-label={letter ? `${letter}${state ? `, ${state}` : ""}` : "empty"}
    >
      {letter && (
        <span
          className="uppercase leading-none"
          style={{ fontSize: "1.1rem", fontWeight: 700 }}
        >
          {letter}
        </span>
      )}
    </div>
  );
}

const WORD_LENGTH = 5;

function PlayerDot({ playerNum }: { playerNum: bigint }) {
  const isP1 = Number(playerNum) === 1;
  return (
    <span
      className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold font-mono ${
        isP1
          ? "bg-primary/30 text-primary border border-primary/40"
          : "bg-muted-foreground/30 text-muted-foreground border border-muted-foreground/40"
      }`}
      title={`Player ${playerNum}`}
    >
      {isP1 ? "1" : "2"}
    </span>
  );
}

export function TileGrid({
  guesses,
  currentInput,
  maxGuesses = 6,
  isFlipping = false,
  isShaking = false,
  shakeRow,
  showPlayerLabels = false,
  label,
}: TileGridProps) {
  // isShaking shakes the current input row (the row the player is typing on)
  const inputRowIndex = guesses.length;
  const rows: {
    letters: string[];
    states: (TileState | null)[];
    isSubmitted: boolean;
    playerNum?: bigint;
  }[] = [];

  for (let i = 0; i < guesses.length; i++) {
    const guess = guesses[i];
    const letters = guess.word.split("").slice(0, WORD_LENGTH);
    const states = guess.states.slice(0, WORD_LENGTH) as (TileState | null)[];
    while (letters.length < WORD_LENGTH) letters.push("");
    while (states.length < WORD_LENGTH) states.push(null);
    rows.push({
      letters,
      states,
      isSubmitted: true,
      playerNum: guess.playerNum,
    });
  }

  if (guesses.length < maxGuesses) {
    const inputLetters = currentInput.split("").slice(0, WORD_LENGTH);
    while (inputLetters.length < WORD_LENGTH) inputLetters.push("");
    rows.push({
      letters: inputLetters,
      states: Array(WORD_LENGTH).fill(null) as null[],
      isSubmitted: false,
    });
  }

  while (rows.length < maxGuesses) {
    rows.push({
      letters: Array(WORD_LENGTH).fill("") as string[],
      states: Array(WORD_LENGTH).fill(null) as null[],
      isSubmitted: false,
    });
  }

  const lastSubmittedIndex = guesses.length - 1;

  return (
    <div
      className="flex flex-col items-center gap-1"
      data-ocid="game.tile_grid"
    >
      {label && <p className="result-player-label mb-1">{label}</p>}
      {rows.map((row, rowIdx) => {
        const isFlippingRow = isFlipping && rowIdx === lastSubmittedIndex;
        const shouldShake =
          (isShaking && rowIdx === inputRowIndex) ||
          (typeof shakeRow === "number" && rowIdx === shakeRow);

        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: tile rows are positional
            key={rowIdx}
            className="flex items-center gap-1"
            style={
              shouldShake ? { animation: "shake 0.5s ease-in-out" } : undefined
            }
            data-ocid={`game.tile_row.${rowIdx + 1}`}
          >
            {showPlayerLabels &&
            row.isSubmitted &&
            row.playerNum !== undefined ? (
              <PlayerDot playerNum={row.playerNum} />
            ) : showPlayerLabels ? (
              <span className="flex-shrink-0 w-4 h-4" />
            ) : null}

            {row.letters.map((letter, colIdx) => (
              <TileCell
                // biome-ignore lint/suspicious/noArrayIndexKey: tile columns are positional
                key={colIdx}
                letter={letter}
                state={row.states[colIdx]}
                flipDelay={isFlippingRow ? colIdx * 0.1 : 0}
                isFlipping={isFlippingRow}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
