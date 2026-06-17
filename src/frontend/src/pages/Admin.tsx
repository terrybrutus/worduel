import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Shield,
  Upload,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";
import {
  useAddWord,
  useAllPlayerStats,
  useAllWords,
  useDisablePlayer,
  useEnablePlayer,
  useImportWords,
  useListAllPlayers,
  useWordCount,
} from "../hooks/useBackend";
import { VALID_WORDS } from "../words";

type Tab = "words" | "players";

function PlayerRow({
  player,
  index,
  token,
}: {
  player: {
    username: string;
    isDisabled: boolean;
    role: { __kind__: string } | string;
    createdAt: bigint;
    stats: { totalWins: bigint; totalLosses: bigint };
  };
  index: number;
  token: string;
}) {
  const disablePlayer = useDisablePlayer();
  const enablePlayer = useEnablePlayer();
  const isPending = disablePlayer.isPending || enablePlayer.isPending;

  const roleLabel =
    typeof player.role === "object" && player.role !== null
      ? (player.role as { __kind__: string }).__kind__ === "admin"
        ? "Admin"
        : "Player"
      : String(player.role) === "admin"
        ? "Admin"
        : "Player";

  const joinDate = player.createdAt
    ? new Date(Number(player.createdAt / 1_000_000n)).toLocaleDateString(
        undefined,
        { month: "short", day: "numeric", year: "numeric" },
      )
    : null;

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-border/30 hover:bg-muted/10 transition-colors gap-3"
      data-ocid={`admin.players.item.${index}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-semibold text-sm text-foreground truncate">
            {player.username}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
              roleLabel === "Admin"
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted/20 text-muted-foreground border-border/40"
            }`}
          >
            {roleLabel}
          </span>
          {player.isDisabled && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-destructive/15 text-destructive border border-destructive/30 uppercase tracking-wider">
              Disabled
            </span>
          )}
        </div>
        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
          {Number(player.stats.totalWins)}W / {Number(player.stats.totalLosses)}
          L
          {joinDate && (
            <span className="ml-2 opacity-60">· Joined {joinDate}</span>
          )}
        </p>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (player.isDisabled) {
            enablePlayer.mutate({ token, username: player.username });
          } else {
            disablePlayer.mutate({ token, username: player.username });
          }
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-semibold border transition-smooth disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
          player.isDisabled
            ? "border-success/40 text-success hover:bg-success/10"
            : "border-destructive/40 text-destructive hover:bg-destructive/10"
        }`}
        data-ocid={`admin.players.${
          player.isDisabled ? "enable" : "disable"
        }_button.${index}`}
      >
        {isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : player.isDisabled ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <XCircle className="w-3 h-3" />
        )}
        {player.isDisabled ? "Enable" : "Disable"}
      </button>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, sessionToken, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("words");
  const [wordInput, setWordInput] = useState("");
  const [wordInputError, setWordInputError] = useState("");
  const [wordInputWarn, setWordInputWarn] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const { data: wordCount } = useWordCount();
  // True total = baked-in frontend word list + custom backend words
  const totalWordCount = VALID_WORDS.size + Number(wordCount ?? 0n);
  const { data: allWords } = useAllWords(sessionToken);
  const { data: players, isLoading: playersLoading } =
    useListAllPlayers(sessionToken);
  const { data: playerStats } = useAllPlayerStats(sessionToken);

  const addWord = useAddWord();
  const importWords = useImportWords();

  // CSV import state
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvParsed, setCsvParsed] = useState<string[]>([]);
  const [csvFilename, setCsvFilename] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    retrying?: boolean;
  } | null>(null);

  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const raw = text
        .split(/[\n,]+/)
        .map((w) =>
          w
            .trim()
            .toLowerCase()
            .replace(/[^a-z]/g, ""),
        )
        .filter((w) => w.length === 5);
      setCsvParsed([...new Set(raw)]);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!sessionToken || csvParsed.length === 0) return;
    const existingWords = new Set((allWords ?? []).map((w) => w.toLowerCase()));
    const toAdd = csvParsed.filter((w) => !existingWords.has(w));
    const duplicates = csvParsed.length - toAdd.length;

    if (toAdd.length === 0) {
      setFeedback({
        type: "error",
        msg: `All ${duplicates} word${duplicates !== 1 ? "s" : ""} already exist in the pool.`,
      });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    const CHUNK_SIZE = 500;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 500;
    const BATCH_DELAY_MS = 100;

    const chunks: string[][] = [];
    for (let i = 0; i < toAdd.length; i += CHUNK_SIZE) {
      chunks.push(toAdd.slice(i, i + CHUNK_SIZE));
    }

    setImportProgress({ current: 0, total: chunks.length });
    let totalAdded = 0n;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));

    try {
      for (let i = 0; i < chunks.length; i++) {
        setImportProgress({ current: i + 1, total: chunks.length });

        let attempt = 0;
        let batchSucceeded = false;

        while (attempt < MAX_RETRIES && !batchSucceeded) {
          if (attempt > 0) {
            // Show retry status and wait before retrying
            setImportProgress({
              current: i + 1,
              total: chunks.length,
              retrying: true,
            });
            await sleep(RETRY_DELAY_MS);
          }

          let result: { added: bigint; unauthorized: boolean };
          try {
            result = await importWords.mutateAsync({
              token: sessionToken,
              words: chunks[i],
            });
          } catch (callErr) {
            // Network / canister error — treat as retryable
            attempt++;
            if (attempt >= MAX_RETRIES) {
              throw callErr;
            }
            continue;
          }

          if (result.unauthorized) {
            attempt++;
            if (attempt >= MAX_RETRIES) {
              throw new Error(
                `Unauthorized after ${MAX_RETRIES} retries on batch ${i + 1}. Try refreshing and logging in again.`,
              );
            }
            // Will retry after RETRY_DELAY_MS on next loop iteration
            continue;
          }

          totalAdded += result.added;
          batchSucceeded = true;
        }

        // Small pause between successful batches to let the canister settle
        if (i < chunks.length - 1) {
          await sleep(BATCH_DELAY_MS);
        }
      }

      setImportProgress(null);
      const addedCount = Number(totalAdded);
      setFeedback({
        type: "success",
        msg:
          duplicates > 0
            ? `${addedCount} word${addedCount !== 1 ? "s" : ""} added, ${duplicates} duplicate${duplicates !== 1 ? "s" : ""} skipped.`
            : `${addedCount} word${addedCount !== 1 ? "s" : ""} added successfully.`,
      });
      setCsvParsed([]);
      setCsvFilename(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
      setTimeout(() => setFeedback(null), 6000);
    } catch (err) {
      setImportProgress(null);
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Import failed",
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const enrichedPlayers = (players ?? []).map((p) => {
    const found = (playerStats ?? []).find((s) => s.username === p.username);
    return {
      ...p,
      stats: found?.stats ?? p.stats ?? { totalWins: 0n, totalLosses: 0n },
    };
  });

  const handleAddWord = () => {
    setWordInputError("");
    setWordInputWarn("");
    const word = wordInput.trim().toLowerCase();
    if (!word) return;
    if (word.length !== 5 || !/^[a-z]+$/.test(word)) {
      setWordInputError("Must be exactly 5 letters (a\u2013z only).");
      return;
    }
    if (!sessionToken) return;
    const existsInPool = (allWords ?? []).some((w) => w.toLowerCase() === word);
    if (existsInPool) {
      setWordInputError(`"${word.toUpperCase()}" is already in the pool.`);
      return;
    }
    const inBaseList = VALID_WORDS.has(word);
    if (inBaseList) {
      setWordInputWarn(
        `\u201c${word.toUpperCase()}\u201d is already in the base word list \u2014 will still be saved.`,
      );
    }
    addWord.mutate(
      { token: sessionToken, word },
      {
        onSuccess: (count) => {
          setWordInput("");
          setWordInputWarn("");
          setFeedback({
            type: "success",
            msg: inBaseList
              ? `"${word.toUpperCase()}" added (already in base word list). Pool now has ${Number(count)} words.`
              : `"${word.toUpperCase()}" added. Pool now has ${Number(count)} words.`,
          });
          setTimeout(() => setFeedback(null), 4000);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Failed to add word";
          if (
            msg.toLowerCase().includes("already") ||
            msg.toLowerCase().includes("duplicate")
          ) {
            setWordInputError(
              `"${word.toUpperCase()}" is already in the pool.`,
            );
          } else {
            setFeedback({ type: "error", msg });
            setTimeout(() => setFeedback(null), 4000);
          }
        },
      },
    );
  };

  // Loading guard: don't flash "access denied" while auth is loading
  if (!user) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center bg-background"
        data-ocid="admin.loading.page"
      >
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Admin setup card (logged in but not admin)
  if (user && !isAdmin) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 bg-background px-6"
        data-ocid="admin.setup.page"
      >
        <div className="w-full max-w-sm bg-card border border-border/60 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-display font-extrabold text-lg text-foreground">
              Admin Setup
            </h2>
          </div>
          <p className="text-sm text-muted-foreground font-body">
            Self-service admin promotion is disabled. Sign in with an existing
            admin account to manage words and players.
          </p>
        </div>
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => void navigate({ to: "/lobby" })}
          data-ocid="admin.setup.back_button"
        >
          \u2190 Back to Lobby
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background" data-ocid="admin.page">
      {/* Header */}
      <header className="bg-card border-b border-border/60 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-primary shrink-0" />
          <h1 className="font-display font-extrabold text-lg text-foreground">
            Admin Panel
          </h1>
          <span className="admin-badge hidden sm:inline">admin</span>
        </div>
        <button
          type="button"
          onClick={() => void navigate({ to: "/lobby" })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="admin.back_button"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Lobby</span>
        </button>
      </header>

      {/* Tab bar */}
      <div className="bg-card border-b border-border/60 px-4">
        <div className="flex gap-1 max-w-3xl mx-auto">
          {(
            [
              {
                key: "words" as Tab,
                label: "Word Pool",
                icon: <FileText className="w-3.5 h-3.5" />,
              },
              {
                key: "players" as Tab,
                label: "Players",
                icon: <Users className="w-3.5 h-3.5" />,
              },
            ] as const
          ).map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-display font-semibold border-b-2 transition-colors ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-ocid={`admin.tab.${key}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`px-4 py-2.5 flex items-center gap-2 text-sm font-body border-b ${
            feedback.type === "success"
              ? "bg-success/10 border-success/30 text-success"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
          data-ocid={
            feedback.type === "success"
              ? "admin.success_state"
              : "admin.error_state"
          }
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          {feedback.msg}
        </div>
      )}

      <div className="container mx-auto max-w-3xl px-4 py-5">
        {/* WORDS TAB */}
        {tab === "words" && (
          <div className="space-y-5">
            {/* Stats bar */}
            <div className="stat-card">
              <p className="stat-label">Total Words</p>
              <p className="stat-value">{totalWordCount.toLocaleString()}</p>
            </div>

            {/* CSV Import */}
            <div className="bg-card border border-border/60 rounded-xl p-4 space-y-3">
              <h2 className="section-header">Import from CSV / TXT</h2>
              <p className="text-xs text-muted-foreground font-body">
                Upload a .csv or .txt file. Words are filtered to exactly 5
                letters (a\u2013z only). Duplicates are skipped and counted.
              </p>
              <div className="flex items-center gap-2">
                <label
                  className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border/60 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors text-sm text-muted-foreground"
                  data-ocid="admin.csv.dropzone"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {csvFilename ?? "Choose file\u2026"}
                  </span>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,.txt"
                    className="sr-only"
                    onChange={handleCsvSelect}
                    data-ocid="admin.csv.upload_button"
                  />
                </label>
              </div>
              {csvParsed.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-success/10 border border-success/20">
                    <span className="text-sm text-success font-body">
                      Found <strong>{csvParsed.length}</strong> valid 5-letter
                      words to import
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCsvImport()}
                      disabled={
                        importWords.isPending || importProgress !== null
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success text-white text-xs font-display font-semibold hover:bg-success/90 transition-colors disabled:opacity-50"
                      data-ocid="admin.csv.import_button"
                    >
                      {importProgress !== null ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      Import {csvParsed.length} words
                    </button>
                  </div>
                  {importProgress !== null && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs font-body text-primary"
                      data-ocid="admin.csv.loading_state"
                    >
                      <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                      {importProgress.retrying
                        ? `Retrying batch ${importProgress.current} of ${importProgress.total}…`
                        : `Importing batch ${importProgress.current} of ${importProgress.total}…`}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add word form */}
            <div className="bg-card border border-border/60 rounded-xl p-4">
              <h2 className="section-header mb-3">Add Word</h2>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="5-letter word\u2026"
                    maxLength={5}
                    value={wordInput}
                    onChange={(e) => {
                      setWordInput(e.target.value.toLowerCase());
                      setWordInputError("");
                      setWordInputWarn("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
                    className={`input-base w-full font-mono uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal ${
                      wordInputError
                        ? "border-destructive/60 focus:border-destructive"
                        : ""
                    }`}
                    data-ocid="admin.add_word_input"
                  />
                  {wordInputError && (
                    <p
                      className="text-destructive text-xs mt-1 font-body"
                      data-ocid="admin.add_word.field_error"
                    >
                      {wordInputError}
                    </p>
                  )}
                  {!wordInputError && wordInputWarn && (
                    <p
                      className="flex items-center gap-1 text-amber-500 dark:text-amber-400 text-xs mt-1 font-body"
                      data-ocid="admin.add_word.warn_state"
                    >
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {wordInputWarn}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAddWord}
                  disabled={addWord.isPending || !wordInput.trim()}
                  className="btn-primary flex items-center gap-1.5 px-4 disabled:opacity-50"
                  data-ocid="admin.add_word_button"
                >
                  {addWord.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Add</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PLAYERS TAB */}
        {tab === "players" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card">
                <p className="stat-label">Total Players</p>
                <p className="stat-value">{enrichedPlayers.length}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Disabled</p>
                <p className="stat-value text-destructive">
                  {enrichedPlayers.filter((p) => p.isDisabled).length}
                </p>
              </div>
            </div>

            <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2">
                <UserCog className="w-4 h-4 text-primary" />
                <h2 className="section-header flex-1">All Players</h2>
              </div>

              {playersLoading ? (
                <div
                  className="p-8 text-center"
                  data-ocid="admin.players.loading_state"
                >
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2 font-body">
                    Loading players\u2026
                  </p>
                </div>
              ) : enrichedPlayers.length === 0 ? (
                <div
                  className="empty-state"
                  data-ocid="admin.players.empty_state"
                >
                  <p className="text-sm">
                    No players found. Players appear here once they register.
                  </p>
                </div>
              ) : (
                <div
                  className="divide-y divide-border/20"
                  data-ocid="admin.players.list"
                >
                  {enrichedPlayers.map((player, i) => (
                    <PlayerRow
                      key={player.username}
                      player={player}
                      index={i + 1}
                      token={sessionToken!}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
