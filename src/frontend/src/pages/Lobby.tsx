import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Crown,
  Flame,
  Globe,
  Lock,
  LogOut,
  Plus,
  Search,
  Shield,
  TrendingUp,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GameMode } from "../backend";
import type { GameHistoryEntry, GameSummary } from "../backend";
import { useAuth } from "../hooks/useAuth";
import {
  useCreateGame,
  useGamesNeedingAction,
  useJoinGame,
  useLeaveGame,
  useMyActiveGames,
  useMyGameHistory,
  useMyStats,
  usePublicGames,
} from "../hooks/useBackend";
import { useHapticEnabled } from "../hooks/useHapticEnabled";
import { useTheme } from "../hooks/useTheme";
import { SOUND_KEY, isGameStatus } from "../types";

// ─── Sound toggle
function useSoundToggle() {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem(SOUND_KEY);
    return stored === null ? true : stored === "true";
  });
  const toggle = () =>
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_KEY, String(next));
      return next;
    });
  return { soundEnabled: enabled, toggleSound: toggle };
}

// ─── Clipboard helper — synchronous-first for iOS Safari
// Must be called directly in a click handler (no await before the call).
function copyToClipboard(text: string): boolean {
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    // Fire-and-forget. We return true optimistically.
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }
  // execCommand fallback (iOS Safari < 13.4, non-HTTPS)
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

// ─── Invite modal
interface InviteModalProps {
  open: boolean;
  roomCode: string;
  gameId: string;
  joinToken: string;
  onClose: () => void;
}

function InviteModal({
  open,
  roomCode,
  gameId,
  joinToken,
  onClose,
}: InviteModalProps) {
  const inviteUrl = `${window.location.origin}/game/join/${joinToken}?gameId=${gameId}`;
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { sessionToken } = useAuth();
  const { data: activeGames } = useMyActiveGames(sessionToken);
  const didRedirectRef = useRef(false);

  useEffect(() => {
    if (!open || !gameId || didRedirectRef.current) return;
    const thisGame = (activeGames ?? []).find((g) => g.id === gameId);
    if (!thisGame) return;
    const status = (thisGame.status as { __kind__: string }).__kind__;
    if (status === "playing") {
      didRedirectRef.current = true;
      void navigate({ to: "/game/$gameId", params: { gameId } });
    }
  }, [activeGames, gameId, open, navigate]);

  // Synchronous copy handler — no async gap before clipboard call (required for iOS)
  const handleCopy = () => {
    const ok = copyToClipboard(inviteUrl);
    if (ok) {
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 3000);
    } else {
      toast.error("Tap and hold the URL to copy it manually");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      data-ocid="invite.dialog"
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          data-ocid="invite.close_button"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <h2 className="font-display font-bold text-lg text-foreground">
            Private Game Created!
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Share this link with your opponent — they'll join instantly.
        </p>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Room code</p>
            <p className="font-mono font-bold text-primary tracking-widest text-lg">
              {roomCode}
            </p>
          </div>
          <Badge
            variant="outline"
            className="font-mono text-xs border-primary/40 text-primary"
          >
            Private
          </Badge>
        </div>

        {/* Selectable URL so user can tap-and-hold to copy on mobile */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/60 mb-4">
          <p
            className="text-xs font-mono text-muted-foreground break-all select-all cursor-text"
            title="Tap and hold to copy"
          >
            {inviteUrl}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="btn-primary w-full flex items-center justify-center gap-2"
          data-ocid="invite.copy_link_button"
        >
          {copied ? (
            <ClipboardCheck className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? "Copied!" : "Copy Invite Link"}
        </button>
      </div>
    </div>
  );
}

// ─── Active game row
function ActiveGameRow({
  game,
  index,
  sessionToken,
  onNavigate,
}: {
  game: GameSummary;
  index: number;
  sessionToken: string | null;
  onNavigate: (id: string) => void;
}) {
  const leaveGame = useLeaveGame();
  const [leaving, setLeaving] = useState(false);

  const handleLeave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sessionToken || leaving) return;
    setLeaving(true);
    try {
      await leaveGame.mutateAsync({ gameId: game.id, sessionToken });
      toast.success("Left game");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not leave game");
      setLeaving(false);
    }
  };

  return (
    <div
      className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/20 hover:border-primary/40 transition-smooth"
      data-ocid={`lobby.active_games.item.${index}`}
    >
      <button
        type="button"
        onClick={() => onNavigate(game.id)}
        className="flex-1 flex items-center justify-between gap-3 min-w-0 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="room-code text-xs">{game.roomCode}</span>
            {game.waitingForMove && (
              <span className="text-[10px] font-mono text-primary border border-primary/40 rounded-full px-1.5 py-0.5 uppercase tracking-widest bg-primary/10">
                Your turn
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
            {game.players.join(" vs ")} ·{" "}
            {game.mode === GameMode.coop ? "Co-op" : "Versus"}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>
      <button
        type="button"
        onClick={handleLeave}
        disabled={leaving}
        className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
        aria-label="Leave game"
        data-ocid={`lobby.active_games.leave_button.${index}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── History item
function HistoryItem({
  entry,
  index,
}: {
  entry: GameHistoryEntry;
  index: number;
}) {
  const date = new Date(Number(entry.endedAt / 1000000n));
  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return (
    <div
      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/10"
      data-ocid={`lobby.history.item.${index}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-display font-bold ${
            entry.won
              ? "bg-[oklch(0.62_0.2_142/0.15)] text-[oklch(0.62_0.2_142)]"
              : "bg-destructive/15 text-destructive"
          }`}
        >
          {entry.won ? "W" : "L"}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-body font-medium text-foreground truncate">
            vs {entry.opponent || "Opponent"}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground">
            {entry.mode === GameMode.coop ? "Co-op" : "Versus"} · {dateStr}
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-[10px] font-mono text-muted-foreground">
          {Number(entry.myGuessCount)} guess
          {entry.myGuessCount !== 1n ? "es" : ""}
        </p>
        <span className="room-code text-[9px] py-0.5 px-1.5">
          {entry.roomCode}
        </span>
      </div>
    </div>
  );
}

// ─── Profile side panel
function ProfileSheet({
  open,
  onClose,
  username,
  isAdmin,
  wins,
  losses,
  winRate,
  streak,
  onViewStats,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  username: string | undefined;
  isAdmin: boolean;
  wins: number;
  losses: number;
  winRate: number;
  streak: number;
  onViewStats: () => void;
  onLogout: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close"
      />
      <div
        className="fixed right-0 top-0 h-full w-80 z-50 bg-card border-l border-border shadow-2xl"
        data-ocid="lobby.profile.sheet"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <h2 className="font-display font-bold text-foreground">My Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label="Close profile"
            data-ocid="lobby.profile.close_button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto h-[calc(100%-64px)]">
          <div className="p-4 rounded-xl bg-muted/20 border border-border/60">
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Logged in as
            </p>
            <p className="font-display font-bold text-lg text-foreground mt-1">
              {username}
            </p>
            {isAdmin && (
              <Badge
                variant="outline"
                className="mt-1 text-xs border-primary/40 text-primary"
              >
                Admin
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Wins", value: wins },
              { label: "Losses", value: losses },
              { label: "Win Rate", value: `${winRate}%` },
              { label: "Streak", value: streak },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="p-3 rounded-xl bg-card border border-border/60 text-center"
              >
                <p className="font-display font-bold text-primary text-xl">
                  {value}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  {label}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onViewStats}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/60 text-sm font-display font-semibold hover:bg-muted/20 transition-smooth"
            data-ocid="lobby.profile.view_stats_button"
          >
            <TrendingUp className="w-4 h-4 text-primary" /> Full Stats
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-destructive/40 text-sm font-display font-semibold text-destructive hover:bg-destructive/10 transition-smooth"
            data-ocid="lobby.profile.logout_button"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Lobby mode type
type LobbyMode = null | "new" | "join";

// ─── Main Lobby
export default function Lobby() {
  const navigate = useNavigate();
  const { user, sessionToken, isAdmin, logout } = useAuth();
  const { soundEnabled, toggleSound } = useSoundToggle();
  const { theme, toggleTheme } = useTheme();
  const { hapticEnabled, toggleHaptic, supportsVibration } = useHapticEnabled();

  const [lobbyMode, setLobbyMode] = useState<LobbyMode>(null);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.versus);
  const [isPrivate, setIsPrivate] = useState(false);
  const [inviteData, setInviteData] = useState<{
    gameId: string;
    roomCode: string;
    joinToken: string;
  } | null>(null);

  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [showProfile, setShowProfile] = useState(false);

  const { data: publicGames, isLoading: publicLoading } = usePublicGames();
  const { data: activeGames } = useMyActiveGames(sessionToken);
  const { data: myStats } = useMyStats(sessionToken);
  const { data: gameHistory } = useMyGameHistory(user?.username ?? null);
  const gamesNeedingAction = useGamesNeedingAction(sessionToken);

  const createGame = useCreateGame();
  const joinGame = useJoinGame();

  const wins = myStats ? Number(myStats.totalWins) : 0;
  const losses = myStats ? Number(myStats.totalLosses) : 0;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const streak = myStats ? Number(myStats.currentStreak) : 0;

  const openPublicGames = (publicGames ?? []).filter((g) =>
    isGameStatus(g.status, "waiting"),
  );
  const recentHistory = (gameHistory ?? []).slice(0, 5);
  const hasActiveGames = (activeGames ?? []).length > 0;

  const handleCreateGame = () => {
    if (!sessionToken) return;
    createGame.mutate(
      { sessionToken, mode: gameMode, isPrivate },
      {
        onSuccess: (data) => {
          if (isPrivate && data.joinToken) {
            setInviteData({
              gameId: data.gameId,
              roomCode: data.roomCode,
              joinToken: data.joinToken,
            });
          } else {
            void navigate({
              to: "/game/$gameId",
              params: { gameId: data.gameId },
            });
          }
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to create game",
          ),
      },
    );
  };

  const handleJoinByCode = async () => {
    setJoinError("");
    if (!joinCode.trim() || !sessionToken) return;
    const suffix = joinCode
      .trim()
      .toUpperCase()
      .replace(/^WORD-/i, "");
    const fullCode = `WORD-${suffix}`;
    try {
      const result = await joinGame.mutateAsync({
        roomCode: fullCode,
        sessionToken,
      });
      void navigate({ to: "/game/$gameId", params: { gameId: result.id } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not join game";
      if (
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("already started")
      ) {
        setJoinError("Game not found or has already started.");
      } else {
        setJoinError(msg);
      }
    }
  };

  const toggleMode = (m: LobbyMode) =>
    setLobbyMode((prev) => (prev === m ? null : m));

  return (
    <div className="flex-1 flex flex-col bg-background" data-ocid="lobby.page">
      {/* Header */}
      <header className="bg-card border-b border-border/60 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display font-extrabold text-xl text-foreground">
            Word<span className="text-primary text-glow">uel</span>
          </h1>
          {isAdmin && (
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-primary/40 text-primary"
            >
              Admin
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => void navigate({ to: "/admin" })}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-primary/40 text-xs font-display font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
              data-ocid="lobby.admin_header_button"
            >
              <Shield className="w-3 h-3" />
              Admin
            </button>
          )}
          {gamesNeedingAction.length > 0 && (
            <button
              type="button"
              className="relative p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
              onClick={() =>
                void navigate({
                  to: "/game/$gameId",
                  params: { gameId: gamesNeedingAction[0].id },
                })
              }
              aria-label="Game needs your turn"
              data-ocid="lobby.pending_game_alert"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-ping" />
            </button>
          )}
          {/* Theme toggle */}
          <button
            type="button"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            data-ocid="lobby.theme_toggle"
          >
            {theme === "dark" ? (
              /* Sun icon for dark mode (click to go light) */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              /* Moon icon for light mode (click to go dark) */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Haptic toggle — only on devices that support vibration */}
          {supportsVibration && (
            <button
              type="button"
              className={`p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${
                hapticEnabled
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={toggleHaptic}
              aria-label={hapticEnabled ? "Disable haptics" : "Enable haptics"}
              data-ocid="lobby.haptic_toggle"
            >
              {/* Phone vibrate icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" />
                <path d="M18 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="3" width="12" height="18" rx="2" />
                {hapticEnabled && (
                  <path d="M9 9h6M9 12h6M9 15h4" strokeOpacity="0.6" />
                )}
              </svg>
            </button>
          )}

          {/* Sound toggle */}
          <button
            type="button"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            onClick={toggleSound}
            aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
            data-ocid="lobby.sound_toggle"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 text-sm font-body font-medium text-foreground hover:bg-muted/60 transition-colors"
            onClick={() => setShowProfile(true)}
            data-ocid="lobby.profile_button"
          >
            <span className="truncate max-w-[5rem] font-display">
              {user?.username}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="flex-1 container mx-auto max-w-2xl px-4 py-5 space-y-5">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              label: "W",
              value: wins,
              icon: <Trophy className="w-3 h-3" />,
              accent: true,
            },
            { label: "L", value: losses, icon: null, accent: false },
            {
              label: "Win%",
              value: `${winRate}%`,
              icon: <TrendingUp className="w-3 h-3" />,
              accent: false,
            },
            {
              label: "Streak",
              value: streak,
              icon: <Flame className="w-3 h-3" />,
              accent: streak > 0,
            },
          ].map(({ label, value, icon, accent }) => (
            <div
              key={label}
              className={`rounded-xl p-2.5 text-center border ${
                accent
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card border-border/60"
              }`}
            >
              <div
                className={`flex items-center justify-center gap-1 mb-0.5 ${
                  accent ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {icon}
                <span className="text-[10px] font-mono uppercase tracking-widest">
                  {label}
                </span>
              </div>
              <p
                className={`font-display font-bold text-base ${
                  accent ? "text-primary" : "text-foreground"
                }`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Active games — only shown when games exist */}
        {hasActiveGames && (
          <div
            className="rounded-xl p-4 border-2 bg-primary/5 border-primary/40"
            data-ocid="lobby.active_games.section"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-base uppercase tracking-widest text-primary">
                Your Active Games
              </h2>
              <span className="flex items-center gap-1 text-xs font-mono text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                {(activeGames ?? []).length} in progress
              </span>
            </div>
            <div className="space-y-2" data-ocid="lobby.active_games.list">
              {(activeGames ?? []).map((game, i) => (
                <ActiveGameRow
                  key={game.id}
                  game={game}
                  index={i + 1}
                  sessionToken={sessionToken}
                  onNavigate={(id) =>
                    void navigate({
                      to: "/game/$gameId",
                      params: { gameId: id },
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Two-choice entry: Start New Game / Join a Game */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => toggleMode("new")}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 font-display font-bold text-sm transition-smooth ${
              lobbyMode === "new"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
            }`}
            data-ocid="lobby.start_new_game_button"
          >
            <Plus
              className={`w-5 h-5 ${
                lobbyMode === "new" ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span>Start a New Game</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                lobbyMode === "new"
                  ? "rotate-180 text-primary"
                  : "text-muted-foreground"
              }`}
            />
          </button>

          <button
            type="button"
            onClick={() => toggleMode("join")}
            className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 font-display font-bold text-sm transition-smooth ${
              lobbyMode === "join"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
            }`}
            data-ocid="lobby.join_game_button"
          >
            <Search
              className={`w-5 h-5 ${
                lobbyMode === "join" ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span>Join a Game</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                lobbyMode === "join"
                  ? "rotate-180 text-primary"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        </div>

        {/* START A NEW GAME expanded panel */}
        {lobbyMode === "new" && (
          <div
            className="bg-card border border-border/60 rounded-xl p-4 space-y-4"
            data-ocid="lobby.create_game.section"
          >
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                Visibility
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border font-display font-semibold text-sm transition-smooth ${
                    !isPrivate
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                  data-ocid="lobby.privacy_public_tab"
                >
                  <Globe className="w-4 h-4" />
                  <span>Public</span>
                  <span className="text-[10px] font-mono font-normal opacity-70">
                    Open to everyone
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border font-display font-semibold text-sm transition-smooth ${
                    isPrivate
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                  data-ocid="lobby.privacy_private_tab"
                >
                  <Lock className="w-4 h-4" />
                  <span>Private</span>
                  <span className="text-[10px] font-mono font-normal opacity-70">
                    Invite link only
                  </span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                Mode
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGameMode(GameMode.versus)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-display font-semibold text-sm transition-smooth ${
                    gameMode === GameMode.versus
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                  data-ocid="lobby.mode_versus_tab"
                >
                  <Zap className="w-4 h-4" />
                  Versus
                </button>
                <button
                  type="button"
                  onClick={() => setGameMode(GameMode.coop)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-display font-semibold text-sm transition-smooth ${
                    gameMode === GameMode.coop
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                  data-ocid="lobby.mode_coop_tab"
                >
                  <Users className="w-4 h-4" />
                  Co-op
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground font-body">
              {gameMode === GameMode.coop
                ? "Share a board and take turns solving together."
                : "Race to solve the same word first."}
              {isPrivate
                ? " An invite link will appear after creation — share it with your opponent."
                : " Your game will appear in Open Games for anyone to join."}
            </p>

            <button
              type="button"
              onClick={handleCreateGame}
              disabled={createGame.isPending}
              className="btn-primary w-full disabled:opacity-50"
              data-ocid="lobby.create_game_button"
            >
              {createGame.isPending ? "Creating…" : "Create Game"}
            </button>
          </div>
        )}

        {/* JOIN A GAME expanded panel */}
        {lobbyMode === "join" && (
          <div
            className="bg-card border border-border/60 rounded-xl p-4 space-y-4"
            data-ocid="lobby.join_game.section"
          >
            {/* Private game code input */}
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
                Join Private Game by Code
              </p>
              <p className="text-xs text-muted-foreground font-body mb-2">
                Enter the code your opponent shared with you.
              </p>
              <div className="flex gap-2 items-center">
                <div className="flex flex-1 items-center gap-0 rounded-lg border border-border bg-input overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/60 transition-all">
                  <span className="px-2.5 py-2 text-sm font-mono font-bold text-muted-foreground bg-muted/40 border-r border-border select-none flex-shrink-0">
                    WORD-
                  </span>
                  <input
                    type="text"
                    placeholder="ABCD"
                    maxLength={4}
                    value={joinCode}
                    onChange={(e) => {
                      const raw = e.target.value
                        .toUpperCase()
                        .replace(/^WORD-/i, "")
                        .replace(/[^A-Z0-9]/g, "");
                      setJoinCode(raw);
                      setJoinError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleJoinByCode();
                    }}
                    className="flex-1 min-w-0 px-2 py-2 text-sm font-mono tracking-widest uppercase bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none"
                    data-ocid="lobby.join_code_input"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleJoinByCode}
                  disabled={joinCode.trim().length !== 4 || joinGame.isPending}
                  className="btn-primary px-5 disabled:opacity-50"
                  data-ocid="lobby.join_submit_button"
                >
                  Join
                </button>
              </div>
              {joinError && (
                <p
                  className="text-destructive text-xs mt-2 font-body"
                  data-ocid="lobby.join_error_state"
                >
                  {joinError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <hr className="flex-1 border-border/40" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                or browse open games
              </span>
              <hr className="flex-1 border-border/40" />
            </div>

            {/* Open public games list — no codes needed */}
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
                Open Public Games
              </p>
              {publicLoading ? (
                <div
                  className="space-y-2"
                  data-ocid="lobby.public_games.loading_state"
                >
                  {[1, 2].map((k) => (
                    <Skeleton key={k} className="h-14 rounded-xl" />
                  ))}
                </div>
              ) : openPublicGames.length === 0 ? (
                <div
                  className="py-6 text-center"
                  data-ocid="lobby.public_games.empty_state"
                >
                  <p className="text-sm text-muted-foreground font-body">
                    No open games right now.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create a public game and your opponents can click Join!
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-48">
                  <div
                    className="space-y-2"
                    data-ocid="lobby.public_games.list"
                  >
                    {openPublicGames.map((game, i) => (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => {
                          if (!sessionToken) return;
                          joinGame.mutate(
                            { roomCode: game.roomCode, sessionToken },
                            {
                              onSuccess: (result) =>
                                void navigate({
                                  to: "/game/$gameId",
                                  params: { gameId: result.id },
                                }),
                              onError: (err) =>
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Could not join",
                                ),
                            },
                          );
                        }}
                        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/10 hover:border-primary/40 hover:bg-primary/5 transition-smooth text-left"
                        data-ocid={`lobby.public_games.item.${i + 1}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="room-code text-xs">
                              {game.roomCode}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {game.mode === GameMode.coop ? "Co-op" : "Versus"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                            Host: {game.players[0] ?? "Unknown"}
                          </p>
                        </div>
                        <span className="text-xs font-display font-bold text-primary">
                          Join →
                        </span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        )}

        {/* Recent game history */}
        {recentHistory.length > 0 && (
          <div className="bg-card border border-border/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-sm uppercase tracking-widest text-muted-foreground">
                Recent Games
              </h2>
              <button
                type="button"
                onClick={() => void navigate({ to: "/stats" })}
                className="text-xs text-primary font-body hover:underline"
                data-ocid="lobby.history.view_all_button"
              >
                View all →
              </button>
            </div>
            <div className="space-y-2" data-ocid="lobby.history.list">
              {recentHistory.map((entry, i) => (
                <HistoryItem key={entry.gameId} entry={entry} index={i + 1} />
              ))}
            </div>
          </div>
        )}

        {/* Quick nav */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void navigate({ to: "/stats" })}
            className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-smooth text-sm font-display font-semibold"
            data-ocid="lobby.view_stats_button"
          >
            <Crown className="w-4 h-4 text-primary" />
            My Stats
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => void navigate({ to: "/admin" })}
              className="flex items-center gap-2 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-smooth text-sm font-display font-semibold"
              data-ocid="lobby.admin_button"
            >
              <Shield className="w-4 h-4 text-primary" />
              Admin Panel
            </button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/50 font-body pb-2">
          © {new Date().getFullYear()}. 
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </div>

      {/* Invite modal */}
      {inviteData && (
        <InviteModal
          open
          roomCode={inviteData.roomCode}
          gameId={inviteData.gameId}
          joinToken={inviteData.joinToken}
          onClose={() => setInviteData(null)}
        />
      )}

      {/* Profile side panel */}
      <ProfileSheet
        open={showProfile}
        onClose={() => setShowProfile(false)}
        username={user?.username}
        isAdmin={isAdmin}
        wins={wins}
        losses={losses}
        winRate={winRate}
        streak={streak}
        onViewStats={() => {
          setShowProfile(false);
          void navigate({ to: "/stats" });
        }}
        onLogout={() => {
          void logout();
          setShowProfile(false);
        }}
      />
    </div>
  );
}
