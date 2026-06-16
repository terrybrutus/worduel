import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameMode, PlayerOutcome, type TileState } from "../backend";
import type { Guess } from "../backend";
import {
  Keyboard,
  playInvalidSound,
  playLossSound,
  playWinSound,
} from "../components/Keyboard";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { TileCell, TileGrid } from "../components/TileGrid";
import {
  useAcceptRematch,
  useLeaveGame,
  useRematchOffer,
  useRequestRematch,
} from "../hooks/useBackend";
import { useGame } from "../hooks/useGame";
import { triggerHaptic } from "../hooks/useHapticEnabled";
import { useHapticEnabled } from "../hooks/useHapticEnabled";
import { useSoundEnabled } from "../hooks/useSoundEnabled";
import { SESSION_KEY } from "../types";
import { getOpponentName } from "../types";

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

// ── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  "oklch(0.65 0.15 66)",
  "oklch(0.55 0.18 142)",
  "oklch(0.55 0.22 280)",
  "oklch(0.75 0.18 66)",
  "oklch(0.85 0.1 100)",
];

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
      {pieces.map((i) => (
        <div
          key={i}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            width: `${6 + Math.random() * 8}px`,
            height: `${8 + Math.random() * 10}px`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animation: `confettiFall ${1.5 + Math.random() * 2}s linear ${Math.random() * 0.8}s forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

// ── Opponent Ghost Grid (versus mode) ────────────────────────────────────────
// Shows how many guesses the opponent has made as blank rows (we don't have
// their actual letters — only the count — so we render ghost tiles).
// Shows opponent's guesses as colored tiles (progress visible, letters hidden).
// We only receive a guess COUNT from the backend (no tile states), so we render
// submitted rows with a solid "guessed" accent and empty rows as ghosts.
function OpponentGhostGrid({
  guessCount,
  opponentName,
  opponentLeft,
  opponentGuessTileStates,
}: {
  guessCount: number;
  opponentName: string;
  opponentLeft: boolean;
  opponentGuessTileStates: TileState[][];
}) {
  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => i);
  const hasTileStates = opponentGuessTileStates.length > 0;

  return (
    <div
      className="flex flex-col items-center gap-2"
      data-ocid="game.opponent_grid"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-chart-1 inline-block" />
        <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider truncate max-w-[120px]">
          {opponentLeft ? `${opponentName} left` : opponentName}
        </p>
        {!opponentLeft && (
          <span className="text-xs font-mono text-chart-1 font-bold">
            {guessCount}/{MAX_GUESSES}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((rowIdx) => {
          const tileStates = hasTileStates
            ? opponentGuessTileStates[rowIdx]
            : undefined;
          const isGuessed = rowIdx < guessCount;

          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: static grid row
              key={rowIdx}
              className="flex gap-1"
            >
              {Array.from({ length: WORD_LENGTH }, (_, colIdx) => {
                if (tileStates && tileStates[colIdx] !== undefined) {
                  return (
                    <TileCell
                      // biome-ignore lint/suspicious/noArrayIndexKey: grid column
                      key={colIdx}
                      letter=""
                      state={tileStates[colIdx]}
                    />
                  );
                }
                return (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: grid column
                    key={colIdx}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded border-2 transition-all duration-300 ${
                      isGuessed
                        ? "border-chart-1/60 bg-chart-1/35"
                        : "border-border/30 bg-card/40"
                    }`}
                    aria-label={isGuessed ? "opponent guessed" : "empty"}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
      {!opponentLeft && guessCount > 0 && (
        <p className="text-[10px] font-mono text-muted-foreground mt-1 uppercase tracking-wider">
          {guessCount} guess{guessCount !== 1 ? "es" : ""}
        </p>
      )}
    </div>
  );
}

// ── Win Screen ────────────────────────────────────────────────────────────────
interface WinScreenProps {
  word: string;
  guessCount: number;
  mode: GameMode;
  onRematch: () => void;
  onLobby: () => void;
  isRematchPending: boolean;
  opponentWon?: boolean;
  playerName: string;
  opponentName: string;
}

function WinScreen({
  word,
  guessCount,
  mode,
  onRematch,
  onLobby,
  isRematchPending,
  opponentWon = false,
  playerName,
  opponentName,
}: WinScreenProps) {
  const isCoopWin = mode === GameMode.coop;
  const title = isCoopWin
    ? "🎉 You Both Won!"
    : opponentWon
      ? "😔 Opponent Won"
      : "🎉 You Win!";

  const subtitle = isCoopWin
    ? `${playerName} & ${opponentName} solved it in ${guessCount} guesses`
    : opponentWon
      ? `${opponentName} found the word first`
      : guessCount === 1
        ? "Hole in one!"
        : `Solved in ${guessCount} ${guessCount === 1 ? "guess" : "guesses"}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-5 py-8 px-6 text-center"
      data-ocid="game.win_screen"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="text-5xl leading-none"
      >
        {opponentWon ? "🏆" : "🎊"}
      </motion.div>

      <div className="space-y-1">
        <h2 className="text-3xl font-display font-black text-foreground">
          {title}
        </h2>
        <p className="text-muted-foreground font-body text-base">{subtitle}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-6 py-3 rounded-xl bg-card border-2 border-primary/40"
      >
        <p className="text-xs font-body text-muted-foreground uppercase tracking-widest mb-1">
          The word was
        </p>
        <p className="text-3xl font-display font-black text-primary tracking-widest uppercase">
          {word}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="flex flex-col sm:flex-row gap-3 w-full max-w-xs"
      >
        <button
          type="button"
          className="btn-game flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onRematch}
          disabled={isRematchPending}
          data-ocid="game.rematch_button"
        >
          {isRematchPending ? (
            <span className="flex items-center gap-2 justify-center">
              <LoadingSpinner size="sm" /> Starting…
            </span>
          ) : (
            "Play Again"
          )}
        </button>
        <button
          type="button"
          className="btn-game flex-1 bg-muted text-foreground hover:bg-muted/80"
          onClick={onLobby}
          data-ocid="game.back_to_lobby_button"
        >
          Back to Lobby
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Loss Screen ───────────────────────────────────────────────────────────────
interface LossScreenProps {
  word: string;
  mode: GameMode;
  onRematch: () => void;
  onLobby: () => void;
  isRematchPending: boolean;
  exitReason?: string;
  opponentName?: string;
  opponentWon?: boolean;
}

function LossScreen({
  word,
  mode,
  onRematch,
  onLobby,
  isRematchPending,
  exitReason,
  opponentName,
  opponentWon = false,
}: LossScreenProps) {
  const isOpponentLeft =
    exitReason?.toLowerCase().includes("opponent_left") ?? false;
  const title = isOpponentLeft
    ? "Opponent Left"
    : opponentWon
      ? `${opponentName ?? "Opponent"} Won!`
      : "Game Over";
  const subtitle = isOpponentLeft
    ? "Your opponent disconnected."
    : opponentWon
      ? `${opponentName ?? "Opponent"} found the word first.`
      : mode === GameMode.coop
        ? "Better luck next time!"
        : "You couldn't find the word in time.";
  const emoji = isOpponentLeft ? "👋" : opponentWon ? "🏆" : "😔";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="loss-screen"
      data-ocid="game.loss_screen"
    >
      <motion.div
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="text-5xl"
      >
        {emoji}
      </motion.div>

      <div className="space-y-1">
        <h2 className="text-3xl font-display font-black text-foreground">
          {title}
        </h2>
        <p className="loss-message">{subtitle}</p>
      </div>

      {word && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="px-6 py-3 rounded-xl bg-card border-2 border-destructive/40"
        >
          <p className="text-xs font-body text-muted-foreground uppercase tracking-widest mb-1">
            The word was
          </p>
          <p className="loss-word-reveal">{word.toUpperCase()}</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-3 w-full max-w-xs"
      >
        <button
          type="button"
          className="btn-game flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onRematch}
          disabled={isRematchPending}
          data-ocid="game.rematch_button"
        >
          {isRematchPending ? (
            <span className="flex items-center gap-2 justify-center">
              <LoadingSpinner size="sm" /> Starting…
            </span>
          ) : (
            "Play Again"
          )}
        </button>
        <button
          type="button"
          className="btn-game flex-1 bg-muted text-foreground hover:bg-muted/80"
          onClick={onLobby}
          data-ocid="game.back_to_lobby_button"
        >
          Back to Lobby
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Coop Turn Indicator ─────────────────────────────────────────────────────
function CoopTurnIndicator({
  isMyTurn,
  myName,
  opponentName,
  currentTurnPlayer,
}: {
  isMyTurn: boolean;
  myName: string;
  opponentName: string;
  currentTurnPlayer?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card border border-border"
      data-ocid="game.coop_turn_indicator"
    >
      {/* My avatar */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={`relative w-9 h-9 rounded-full flex items-center justify-center font-display font-black text-base transition-all duration-300 ${
            isMyTurn
              ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-card"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isMyTurn && (
            <span
              className="absolute inset-0 rounded-full animate-ping bg-primary/40"
              style={{ animationDuration: "1.5s" }}
            />
          )}
          {myName.charAt(0).toUpperCase()}
        </div>
        <span
          className={`text-[10px] font-body truncate max-w-[60px] ${
            isMyTurn ? "text-primary font-semibold" : "text-muted-foreground"
          }`}
        >
          {myName}
        </span>
      </div>

      {/* Center label */}
      <div className="flex flex-col items-center gap-0.5 flex-1">
        <span className="text-[10px] font-display uppercase tracking-widest text-muted-foreground">
          Co-op
        </span>
        <span
          className={`text-sm font-display font-bold ${
            isMyTurn ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {isMyTurn
            ? "Your Turn"
            : `${currentTurnPlayer ?? opponentName}'s Turn`}
        </span>
      </div>

      {/* Opponent avatar */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={`relative w-9 h-9 rounded-full flex items-center justify-center font-display font-black text-base transition-all duration-300 ${
            !isMyTurn
              ? "bg-chart-1 text-foreground ring-2 ring-chart-1 ring-offset-2 ring-offset-card"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {!isMyTurn && (
            <span
              className="absolute inset-0 rounded-full animate-ping bg-chart-1/40"
              style={{ animationDuration: "1.5s" }}
            />
          )}
          {opponentName.charAt(0).toUpperCase()}
        </div>
        <span
          className={`text-[10px] font-body truncate max-w-[60px] ${
            !isMyTurn ? "text-chart-1 font-semibold" : "text-muted-foreground"
          }`}
        >
          {opponentName}
        </span>
      </div>
    </div>
  );
}

// ── Versus Opponent Status ────────────────────────────────────────────────────
function VersusStatus({
  opponentName,
  opponentGuessCount,
  opponentLeft,
}: {
  opponentName: string;
  opponentGuessCount: bigint;
  opponentLeft: boolean;
}) {
  if (opponentLeft) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border text-sm">
        <span className="text-muted-foreground">👋</span>
        <span className="font-body text-muted-foreground">
          {opponentName} left
        </span>
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm"
      data-ocid="game.opponent_status"
    >
      <span className="text-muted-foreground text-xs uppercase tracking-wide font-display">
        {opponentName}:
      </span>
      <span className="font-display font-bold text-foreground">
        {Number(opponentGuessCount)}
      </span>
      <span className="text-muted-foreground text-xs">
        {Number(opponentGuessCount) === 1 ? "guess" : "guesses"}
      </span>
    </div>
  );
}

// ── Invite Link Copy ──────────────────────────────────────────────────────────
function InviteLink({ token, gameId }: { token: string; gameId?: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    const url = gameId
      ? `${window.location.origin}/game/join/${token}?gameId=${gameId}`
      : `${window.location.origin}/game/join/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for non-secure context
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [token, gameId]);

  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="text-xs font-body text-muted-foreground text-center">
        Share this link with your opponent to start the game
      </p>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 transition-colors"
        data-ocid="game.copy_invite_button"
      >
        {copied ? "✓ Copied!" : "📋 Copy Invite Link"}
      </button>
      <div className="px-3 py-2 rounded-lg bg-card border border-border text-center">
        <p className="text-[10px] font-mono text-muted-foreground break-all">
          {window.location.origin}/game/join/{token}
        </p>
      </div>
    </div>
  );
}

// ── Waiting Screen ────────────────────────────────────────────────────────────
function WaitingForOpponent({
  roomCode,
  joinToken,
  gameId,
  onCancel,
}: {
  roomCode: string;
  joinToken: string | null;
  gameId?: string;
  onCancel: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5 py-10 px-6 text-center w-full max-w-sm mx-auto"
      data-ocid="game.waiting_screen"
    >
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-display font-bold text-foreground">
          Waiting for opponent…
        </h2>
        <p className="text-muted-foreground font-body text-sm">
          Send your opponent the invite link below
        </p>
      </div>

      {/* Primary: Invite link with copy button */}
      {joinToken && <InviteLink token={joinToken} gameId={gameId} />}

      {/* Secondary: room code */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/20 border border-border/60 w-full justify-center">
        <span className="text-xs font-body text-muted-foreground">
          Room code:
        </span>
        <span className="room-code text-base">{roomCode}</span>
      </div>

      <button
        type="button"
        className="btn-game bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground text-sm px-4 py-2"
        onClick={onCancel}
        data-ocid="game.cancel_button"
      >
        Cancel
      </button>
    </div>
  );
}

// ── Versus Mode — Side-by-Side Layout ────────────────────────────────────────
function VersusLayout({
  myGrid,
  opponentGrid,
  keyboard,
  myName,
  opponentName,
  invalidWordMessage,
  isShaking: _isShaking,
  isMyTurn: _isMyTurn,
}: {
  myGrid: React.ReactNode;
  opponentGrid: React.ReactNode;
  keyboard: React.ReactNode;
  myName: string;
  opponentName: string;
  invalidWordMessage: string | null;
  isShaking: boolean;
  isMyTurn: boolean;
}) {
  return (
    <div className="w-full flex flex-col gap-2 overflow-hidden">
      {/* Invalid word toast */}
      <AnimatePresence>
        {invalidWordMessage && (
          <motion.div
            key="invalid"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="invalid-word-error mx-auto max-w-xs"
            role="alert"
            data-ocid="game.invalid_word_error"
          >
            {invalidWordMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Both boards always visible — scaled for mobile */}
      <div className="flex gap-2 sm:gap-4 justify-center items-start w-full overflow-hidden">
        {/* My grid */}
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary inline-block" />
            <span className="text-[9px] sm:text-xs font-display font-semibold text-primary uppercase tracking-wider truncate max-w-[80px] sm:max-w-[100px]">
              {myName} (You)
            </span>
          </div>
          <div className="versus-board-scale">{myGrid}</div>
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-border/40 mx-0.5 sm:mx-1 flex-shrink-0" />

        {/* Opponent ghost grid */}
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-chart-1/70 inline-block" />
            <span className="text-[9px] sm:text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider truncate max-w-[80px] sm:max-w-[100px]">
              {opponentName}
            </span>
          </div>
          <div className="versus-board-scale">{opponentGrid}</div>
        </div>
      </div>

      {/* Keyboard — always full width below both boards */}
      <div className="w-full mt-1">{keyboard}</div>
    </div>
  );
}

// ── PA Rematch Waiting State ────────────────────────────────────────────────
function RematchWaiting({
  roomCode,
  onLobby,
}: {
  roomCode: string;
  onLobby: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
      data-ocid="game.rematch_waiting"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl p-6 flex flex-col gap-4 items-center text-center"
      >
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        <div>
          <h2 className="text-xl font-display font-black text-foreground">
            Rematch Offered!
          </h2>
          <p className="text-sm font-body text-muted-foreground mt-1">
            Waiting for your opponent to accept…
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/20 border border-border/60 w-full justify-center">
          <span className="text-xs font-body text-muted-foreground">
            Room code:
          </span>
          <span className="room-code text-base">{roomCode}</span>
        </div>
        <p className="text-xs text-muted-foreground font-body">
          Share the room code with your opponent so they can join.
        </p>
        <button
          type="button"
          className="btn-game bg-muted text-muted-foreground hover:bg-muted/80 text-sm px-4 py-2 w-full"
          onClick={onLobby}
          data-ocid="game.rematch_waiting_lobby_button"
        >
          Back to Lobby
        </button>
      </motion.div>
    </div>
  );
}

// ── PB Accept Rematch Banner ────────────────────────────────────────────────
function AcceptRematchBanner({
  onAccept,
  isPending,
}: {
  onAccept: () => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xs flex flex-col items-center gap-2 p-4 rounded-2xl bg-primary/10 border-2 border-primary/50"
      data-ocid="game.accept_rematch_banner"
    >
      <span className="text-2xl">🔄</span>
      <p className="font-display font-bold text-foreground text-base">
        Opponent wants a rematch!
      </p>
      <button
        type="button"
        onClick={onAccept}
        disabled={isPending}
        className="btn-game w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        data-ocid="game.accept_rematch_button"
      >
        {isPending ? (
          <span className="flex items-center gap-2 justify-center">
            <LoadingSpinner size="sm" /> Joining…
          </span>
        ) : (
          "Accept Rematch"
        )}
      </button>
    </motion.div>
  );
}

// ── Main Game Page ─────────────────────────────────────────────────────────────
export default function Game() {
  const navigate = useNavigate();
  const sessionToken = localStorage.getItem(SESSION_KEY) ?? "";

  const {
    gameState,
    isLoading,
    playerName,
    isMyTurn,
    currentGuesses,
    opponentGuessCount,
    opponentGuessTileStates,
    opponentLeft,
    myOutcome,
    hostToken,
    currentInput,
    invalidWordMessage,
    isShaking,
    isFlipping,
    isSubmitting,
    handleKey,
  } = useGame();

  const leaveGame = useLeaveGame();
  const requestRematch = useRequestRematch();
  const acceptRematch = useAcceptRematch();
  const { soundEnabled } = useSoundEnabled();
  const { hapticEnabled } = useHapticEnabled();
  const [soundPlayed, setSoundPlayed] = useState(false);
  const prevInvalidRef = useRef<string | null>(null);
  // PA rematch: track whether we've offered a rematch (show waiting state)
  const [rematchOffered, setRematchOffered] = useState(false);
  const [rematchRoomCode, setRematchRoomCode] = useState("");
  const [rematchNewGameId, setRematchNewGameId] = useState<string | null>(null);

  // Fire sound + haptics when an invalid word error appears
  useEffect(() => {
    if (!invalidWordMessage || invalidWordMessage === prevInvalidRef.current)
      return;
    prevInvalidRef.current = invalidWordMessage;
    if (soundEnabled) playInvalidSound();
    triggerHaptic([100, 50, 100], hapticEnabled);
  }, [invalidWordMessage, soundEnabled, hapticEnabled]);

  const gameId = gameState?.id ?? "";
  const mode = gameState?.mode ?? GameMode.versus;
  const status = gameState?.status.__kind__;
  const answer = gameState?.answer ?? "";
  const roomCode = gameState?.roomCode ?? "";
  const opponentName = getOpponentName(gameState, playerName);

  // Terminal: game is fully over for this player
  const isTerminal =
    status === "won" ||
    status === "lost" ||
    status === "expired" ||
    myOutcome === PlayerOutcome.lost ||
    myOutcome === PlayerOutcome.opponentWon ||
    myOutcome === PlayerOutcome.won;
  const isWaiting = status === "waiting";

  // Determine win/loss outcome
  const iWon =
    myOutcome === PlayerOutcome.won ||
    (mode === GameMode.coop && status === "won");
  const iLost =
    myOutcome === PlayerOutcome.lost ||
    myOutcome === PlayerOutcome.opponentWon ||
    status === "lost" ||
    status === "expired";
  const opponentWonVersus = myOutcome === PlayerOutcome.opponentWon;

  // Play win/loss sounds + haptics once when terminal state is first reached
  const prevStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (soundPlayed) return;
    if (status === prevStatusRef.current) return;
    prevStatusRef.current = status;
    if (isTerminal) {
      if (iWon && !opponentWonVersus) {
        if (soundEnabled) playWinSound();
        triggerHaptic([100, 50, 100, 50, 200], hapticEnabled);
      } else if (iLost || opponentWonVersus) {
        if (soundEnabled) playLossSound();
        triggerHaptic([200, 100, 200], hapticEnabled);
      }
      setSoundPlayed(true);
    }
  }, [
    status,
    isTerminal,
    iWon,
    iLost,
    opponentWonVersus,
    soundPlayed,
    soundEnabled,
    hapticEnabled,
  ]);

  const handleLeave = useCallback(() => {
    if (!gameId || !sessionToken) {
      void navigate({ to: "/lobby" });
      return;
    }
    leaveGame.mutate(
      { gameId, sessionToken },
      { onSettled: () => void navigate({ to: "/lobby" }) },
    );
  }, [gameId, sessionToken, leaveGame, navigate]);

  const handleRematch = useCallback(() => {
    if (!gameId || !sessionToken) return;
    requestRematch.reset();
    requestRematch.mutate(
      { gameId, sessionToken },
      {
        onSuccess: (data) => {
          // PA side: show waiting state with room code — no modal/navigation
          setRematchOffered(true);
          setRematchRoomCode(data.roomCode);
          setRematchNewGameId(data.newGameId);
        },
        onError: () => {
          requestRematch.reset();
        },
      },
    );
  }, [gameId, sessionToken, requestRematch]);

  const handleLobby = useCallback(() => {
    void navigate({ to: "/lobby" });
  }, [navigate]);

  const handleRematchWaitingLobby = useCallback(() => {
    setRematchOffered(false);
    requestRematch.reset();
    // Navigate to the new game so PA can wait there, or fallback to lobby
    if (rematchNewGameId) {
      void navigate({
        to: "/game/$gameId",
        params: { gameId: rematchNewGameId },
      });
    } else {
      void navigate({ to: "/lobby" });
    }
  }, [navigate, requestRematch, rematchNewGameId]);

  // ── PB: poll for rematch offer from PA ─────────────────────────────────────────
  // Only poll when game is in terminal state and this player has NOT initiated a rematch
  const isPaOfRematch = rematchOffered || requestRematch.isPending;
  const { data: rematchOffer } = useRematchOffer(
    gameId || null,
    isTerminal && !isPaOfRematch,
  );

  const handleAcceptRematch = useCallback(() => {
    if (!rematchOffer || !sessionToken || !gameId) return;
    acceptRematch.mutate(
      {
        sessionToken,
        originalGameId: gameId,
      },
      {
        onSuccess: (newId) => {
          void navigate({ to: "/game/$gameId", params: { gameId: newId } });
        },
      },
    );
  }, [rematchOffer, sessionToken, gameId, acceptRematch, navigate]);

  // PA rematch waiting overlay
  const rematchWaitingOverlay = rematchOffered ? (
    <RematchWaiting
      roomCode={rematchRoomCode}
      onLobby={handleRematchWaitingLobby}
    />
  ) : null;

  // ── Loading ────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className="min-h-[100dvh] flex items-center justify-center bg-background"
        data-ocid="game.loading_state"
      >
        {rematchWaitingOverlay}
        <LoadingSpinner size="lg" label="Loading game…" />
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────────────
  if (!gameState && !isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-background">
        {rematchWaitingOverlay}
        <p className="text-muted-foreground font-body">Game not found.</p>
        <button
          type="button"
          className="btn-game bg-primary text-primary-foreground"
          onClick={handleLobby}
          data-ocid="game.back_to_lobby_button"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  const isCoop = mode === GameMode.coop;
  const isVersus = mode === GameMode.versus;
  const guessesForKeyboard = isCoop
    ? (gameState?.coopGuesses ?? [])
    : (gameState?.myGuesses ?? []);

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-background"
      data-ocid="game.page"
    >
      {rematchWaitingOverlay}
      {/* Win confetti */}
      {iWon && !opponentWonVersus && <Confetti />}

      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200 font-body text-sm"
          onClick={handleLobby}
          data-ocid="game.lobby_link"
        >
          <span className="text-base">←</span>
          <span>Lobby</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Mode badge */}
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-display font-bold uppercase tracking-wider border ${
              isCoop
                ? "bg-primary/15 text-primary border-primary/30"
                : "bg-chart-1/15 text-chart-1 border-chart-1/30"
            }`}
            data-ocid="game.mode_badge"
          >
            {isCoop ? "Co-op" : "Versus"}
          </span>

          {/* Room code */}
          {roomCode && <span className="room-code text-xs">{roomCode}</span>}
        </div>

        {/* Opponent status (versus header) */}
        {isVersus && !isTerminal && !isWaiting && (
          <VersusStatus
            opponentName={opponentName}
            opponentGuessCount={opponentGuessCount}
            opponentLeft={opponentLeft}
          />
        )}

        {/* Leave button during active play */}
        {!isTerminal && !isWaiting && (
          <button
            type="button"
            className="text-muted-foreground hover:text-destructive transition-colors duration-200 font-body text-sm"
            onClick={handleLeave}
            data-ocid="game.leave_button"
          >
            Leave
          </button>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 pt-4 pb-6 gap-4 overflow-y-auto">
        {/* Waiting for second player */}
        {isWaiting && (
          <WaitingForOpponent
            roomCode={roomCode}
            joinToken={hostToken}
            gameId={gameId}
            onCancel={handleLeave}
          />
        )}

        {/* Terminal states: win or loss screen */}
        {isTerminal && (
          <AnimatePresence>
            {iWon && !opponentWonVersus ? (
              <WinScreen
                key="win"
                word={answer}
                guessCount={currentGuesses.length}
                mode={mode}
                onRematch={handleRematch}
                onLobby={handleLobby}
                isRematchPending={requestRematch.isPending}
                opponentWon={false}
                playerName={playerName}
                opponentName={opponentName}
              />
            ) : (
              <LossScreen
                key="loss"
                word={answer}
                mode={mode}
                onRematch={handleRematch}
                onLobby={handleLobby}
                isRematchPending={requestRematch.isPending}
                exitReason={gameState?.exitReason}
                opponentName={opponentName}
                opponentWon={opponentWonVersus}
              />
            )}
          </AnimatePresence>
        )}

        {/* PB: Accept Rematch banner — appears when PA has offered a rematch */}
        {isTerminal && !isPaOfRematch && rematchOffer && (
          <AcceptRematchBanner
            onAccept={handleAcceptRematch}
            isPending={acceptRematch.isPending}
          />
        )}

        {/* Versus: opponent just won — show banner but let this player keep going */}
        {!isTerminal && isVersus && opponentWonVersus && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/40 text-center"
            data-ocid="game.opponent_won_banner"
          >
            <p className="font-display font-bold text-destructive">
              🏆 {opponentName} won!
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Keep going to see the answer.
            </p>
          </motion.div>
        )}

        {/* Active gameplay */}
        {!isTerminal && !isWaiting && (
          <>
            {/* Co-op: turn indicator with glowing avatar */}
            {isCoop && (
              <CoopTurnIndicator
                isMyTurn={isMyTurn}
                myName={playerName}
                opponentName={opponentName}
                currentTurnPlayer={gameState?.currentTurnPlayer ?? undefined}
              />
            )}

            {/* Versus: side-by-side layout */}
            {isVersus ? (
              <VersusLayout
                myName={playerName}
                opponentName={opponentName}
                invalidWordMessage={invalidWordMessage}
                isShaking={isShaking}
                isMyTurn={isMyTurn}
                myGrid={
                  <TileGrid
                    guesses={currentGuesses}
                    currentInput={currentInput}
                    maxGuesses={MAX_GUESSES}
                    isFlipping={isFlipping}
                    isShaking={isShaking}
                  />
                }
                opponentGrid={
                  <OpponentGhostGrid
                    guessCount={Number(opponentGuessCount)}
                    opponentName={opponentName}
                    opponentLeft={opponentLeft}
                    opponentGuessTileStates={opponentGuessTileStates}
                  />
                }
                keyboard={
                  <Keyboard
                    guesses={guessesForKeyboard}
                    onKey={handleKey}
                    disabled={!isMyTurn || isSubmitting}
                  />
                }
              />
            ) : (
              /* Co-op layout: single full grid */
              <>
                {/* Invalid word toast */}
                <AnimatePresence>
                  {invalidWordMessage && (
                    <motion.div
                      key="invalid"
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="invalid-word-error"
                      role="alert"
                      data-ocid="game.invalid_word_error"
                    >
                      {invalidWordMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <TileGrid
                  guesses={currentGuesses}
                  currentInput={currentInput}
                  maxGuesses={MAX_GUESSES}
                  isFlipping={isFlipping}
                  isShaking={isShaking}
                  showPlayerLabels={true}
                />

                <p className="text-xs font-body text-muted-foreground">
                  {MAX_GUESSES - currentGuesses.length} guess
                  {MAX_GUESSES - currentGuesses.length !== 1 ? "es" : ""}{" "}
                  remaining
                </p>

                {/* Co-op waiting message when it's not your turn */}
                {!isMyTurn && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-muted-foreground font-body text-sm"
                    data-ocid="game.coop_waiting_label"
                  >
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse inline-block" />
                    Waiting for {gameState?.currentTurnPlayer ?? opponentName}…
                  </motion.div>
                )}

                <div className="w-full mt-auto">
                  <Keyboard
                    guesses={guessesForKeyboard}
                    onKey={handleKey}
                    disabled={!isMyTurn || isSubmitting}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* Show final guess grid after terminal state */}
        {isTerminal && currentGuesses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col items-center gap-2 mt-4"
          >
            <p className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-1">
              Your guesses
            </p>
            <TileGrid
              guesses={currentGuesses}
              currentInput=""
              maxGuesses={currentGuesses.length}
              showPlayerLabels={isCoop}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
