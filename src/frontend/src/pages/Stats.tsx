import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Flame,
  Swords,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  useMyGameHistory,
  useMyStats,
  useOpponentStats,
} from "../hooks/useBackend";
import { GameMode } from "../types";

type RivalSortKey = "total" | "wins" | "wr";

function formatDate(ts: bigint): string {
  const d = new Date(Number(ts) / 1_000_000);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function SortIcon({ asc }: { asc: boolean }) {
  return asc ? (
    <ChevronUp className="w-3 h-3" />
  ) : (
    <ChevronDown className="w-3 h-3" />
  );
}

function SummaryCardSkeleton() {
  return <Skeleton className="h-24 rounded-xl" />;
}

export default function Stats() {
  const navigate = useNavigate();
  const { user, sessionToken } = useAuth();
  const [rivalSort, setRivalSort] = useState<RivalSortKey>("total");
  const [rivalAsc, setRivalAsc] = useState(false);

  const { data: stats, isLoading: statsLoading } = useMyStats(sessionToken);
  const { data: history, isLoading: historyLoading } = useMyGameHistory(
    user?.username ?? null,
  );
  const { data: opponentStats, isLoading: opponentsLoading } =
    useOpponentStats(sessionToken);

  const wins = stats ? Number(stats.totalWins) : 0;
  const losses = stats ? Number(stats.totalLosses) : 0;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const currentStreak = stats ? Number(stats.currentStreak) : 0;
  const bestStreak = stats ? Number(stats.bestStreak) : 0;

  // Mode breakdown from history
  const allHistory = history ?? [];
  const versusGames = allHistory.filter((e) => e.mode === GameMode.versus);
  const coopGames = allHistory.filter((e) => e.mode === GameMode.coop);
  const versusWins = versusGames.filter((e) => e.won).length;
  const versusLosses = versusGames.length - versusWins;
  const coopWins = coopGames.filter((e) => e.won).length;
  const coopLosses = coopGames.length - coopWins;

  // Rivals
  const rivals = [...(opponentStats ?? [])]
    .map(([username, rec]) => ({
      username,
      wins: Number(rec.wins),
      losses: Number(rec.losses),
      total: Number(rec.wins) + Number(rec.losses),
    }))
    .map((r) => ({
      ...r,
      wr: r.total > 0 ? Math.round((r.wins / r.total) * 100) : 0,
    }));

  const sortedRivals = [...rivals].sort((a, b) => {
    const diff = a[rivalSort] - b[rivalSort];
    return rivalAsc ? diff : -diff;
  });

  function toggleSort(key: RivalSortKey) {
    if (rivalSort === key) setRivalAsc((v) => !v);
    else {
      setRivalSort(key);
      setRivalAsc(false);
    }
  }

  const isEmpty =
    !statsLoading && !historyLoading && total === 0 && allHistory.length === 0;

  return (
    <div className="flex-1 bg-background py-6 px-4" data-ocid="stats.page">
      <div className="container mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BarChart3 className="w-5 h-5 text-primary shrink-0" />
            <h1 className="font-display font-extrabold text-xl sm:text-2xl text-foreground uppercase tracking-wide truncate">
              My Stats
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void navigate({ to: "/lobby" })}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            data-ocid="stats.back_button"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Lobby</span>
          </button>
        </div>

        {/* Summary cards */}
        {statsLoading ? (
          <div
            className="grid grid-cols-3 sm:grid-cols-6 gap-3"
            data-ocid="stats.loading_state"
          >
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <SummaryCardSkeleton key={k} />
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-3 sm:grid-cols-6 gap-3"
            data-ocid="stats.summary.section"
          >
            {(
              [
                {
                  label: "Games",
                  value: total,
                  icon: <Swords className="w-4 h-4" />,
                  ocid: "stats.total_games",
                  accent: false,
                },
                {
                  label: "Wins",
                  value: wins,
                  icon: <Trophy className="w-4 h-4" />,
                  ocid: "stats.wins",
                  accent: true,
                },
                {
                  label: "Losses",
                  value: losses,
                  icon: <Users className="w-4 h-4" />,
                  ocid: "stats.losses",
                  accent: false,
                },
                {
                  label: "Win %",
                  value: `${winRate}%`,
                  icon: <TrendingUp className="w-4 h-4" />,
                  ocid: "stats.win_rate",
                  accent: false,
                },
                {
                  label: "Streak",
                  value: currentStreak,
                  icon: <Flame className="w-4 h-4" />,
                  ocid: "stats.current_streak",
                  accent: currentStreak > 0,
                },
                {
                  label: "Best",
                  value: bestStreak,
                  icon: <Zap className="w-4 h-4" />,
                  ocid: "stats.best_streak",
                  accent: false,
                },
              ] as const
            ).map(({ label, value, icon, ocid, accent }) => (
              <div
                key={label}
                data-ocid={ocid}
                className={`rounded-xl p-3 flex flex-col items-center justify-center gap-1 border ${
                  accent
                    ? "bg-primary/10 border-primary/30"
                    : "bg-card border-border/60"
                }`}
              >
                <span
                  className={accent ? "text-primary" : "text-muted-foreground"}
                >
                  {icon}
                </span>
                <p
                  className={`font-display font-extrabold text-xl sm:text-2xl leading-none ${
                    accent ? "text-primary" : "text-foreground"
                  }`}
                >
                  {value}
                </p>
                <p className="text-[9px] sm:text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Mode breakdown */}
        {!historyLoading && allHistory.length > 0 && (
          <div
            className="bg-card border border-border/60 rounded-xl p-4"
            data-ocid="stats.mode_breakdown.section"
          >
            <h2 className="section-header mb-3">Mode Breakdown</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Versus",
                  wins: versusWins,
                  losses: versusLosses,
                  total: versusGames.length,
                  icon: <Swords className="w-4 h-4 text-primary" />,
                },
                {
                  label: "Co-op",
                  wins: coopWins,
                  losses: coopLosses,
                  total: coopGames.length,
                  icon: <Users className="w-4 h-4 text-accent" />,
                },
              ].map(({ label, wins: w, losses: l, total: t, icon }) => (
                <div
                  key={label}
                  className="flex flex-col gap-2 rounded-lg bg-muted/20 border border-border/40 p-3"
                >
                  <div className="flex items-center gap-1.5">
                    {icon}
                    <span className="font-display font-bold text-sm text-foreground">
                      {label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-extrabold text-2xl text-foreground">
                      {t}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      games
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs font-mono">
                    <span className="text-success font-semibold">{w}W</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-destructive font-semibold">{l}L</span>
                    {t > 0 && (
                      <span className="text-muted-foreground ml-auto">
                        {Math.round((w / t) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opponent History Table */}
        {!opponentsLoading && sortedRivals.length > 0 && (
          <div
            className="bg-card border border-border/60 rounded-xl overflow-hidden"
            data-ocid="stats.rivals.section"
          >
            <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
              <h2 className="section-header flex-1">Opponent History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20">
                    <th className="text-left px-4 py-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Opponent
                    </th>
                    {[
                      { key: "total" as RivalSortKey, label: "Games" },
                      { key: "wins" as RivalSortKey, label: "Wins" },
                      { key: "wr" as RivalSortKey, label: "Win %" },
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        className="text-right px-4 py-2 text-xs font-mono text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
                        onClick={() => toggleSort(key)}
                        onKeyDown={(e) =>
                          (e.key === "Enter" || e.key === " ") &&
                          toggleSort(key)
                        }
                        scope="col"
                        aria-sort={
                          rivalSort === key
                            ? rivalAsc
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        data-ocid={`stats.rivals.sort_${key}`}
                      >
                        <span className="inline-flex items-center justify-end gap-1">
                          {label}
                          {rivalSort === key ? (
                            <SortIcon asc={rivalAsc} />
                          ) : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {sortedRivals.slice(0, 12).map((rival, i) => (
                    <tr
                      key={rival.username}
                      className="hover:bg-muted/10 transition-colors"
                      data-ocid={`stats.rivals.item.${i + 1}`}
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-display font-semibold text-foreground">
                          {rival.username}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                        {rival.total}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono text-xs">
                          <span className="text-success">{rival.wins}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-destructive">
                            {rival.losses}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs ${
                            rival.wr >= 60
                              ? "border-success/40 text-success"
                              : rival.wr >= 40
                                ? "border-border text-foreground"
                                : "border-destructive/40 text-destructive"
                          }`}
                        >
                          {rival.wr}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent game history */}
        {!historyLoading && allHistory.length > 0 && (
          <div
            className="bg-card border border-border/60 rounded-xl overflow-hidden"
            data-ocid="stats.history.section"
          >
            <div className="px-4 py-3 border-b border-border/40">
              <h2 className="section-header">Recent Games</h2>
            </div>
            <div className="divide-y divide-border/30">
              {allHistory.slice(0, 10).map((entry, i) => (
                <div
                  key={entry.gameId}
                  className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-muted/10 transition-colors"
                  data-ocid={`stats.history.item.${i + 1}`}
                >
                  {/* Outcome dot + mode */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        entry.won ? "bg-success" : "bg-destructive"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs font-display font-bold ${
                            entry.won ? "text-success" : "text-destructive"
                          }`}
                        >
                          {entry.won ? "Win" : "Loss"}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 h-4 font-mono border-border/40 text-muted-foreground"
                        >
                          {entry.mode === GameMode.coop ? "Co-op" : "Versus"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        vs{" "}
                        <span className="text-foreground font-semibold">
                          {entry.opponent || "—"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Guesses + date */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="font-mono text-xs text-muted-foreground">
                      {Number(entry.myGuessCount)}/6 guesses
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/60">
                      {formatDate(entry.endedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton for history/rivals sections */}
        {(historyLoading || opponentsLoading) && !statsLoading && (
          <div className="space-y-3" data-ocid="stats.sections_loading_state">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="stats.empty_state"
          >
            <Award className="w-14 h-14 text-muted-foreground/20 mb-4" />
            <p className="font-display font-bold text-lg text-foreground mb-1">
              No games yet
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              Play your first game to start tracking your stats.
            </p>
            <button
              type="button"
              onClick={() => void navigate({ to: "/lobby" })}
              className="btn-primary text-sm px-5 py-2"
              data-ocid="stats.play_now_button"
            >
              Play Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
