import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { CalendarDays, Copy, Link, ArrowLeft, Send } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppButton } from "../components/AppButton";
import { Keyboard } from "../components/Keyboard";
import { TileGrid } from "../components/TileGrid";
import { LearningRecap } from "../components/LearningRecap";
import { GameMode, type Guess } from "../backend";
import { localCall, localInviteOrigin } from "../lib/localBackend";

interface Challenge {
  id: string; kind: "daily" | "replay"; day: string; wordLength: number;
  guesses: Guess[]; finished: boolean; solved: boolean; answer?: string; streak: number;
  scores: Array<{ username: string; isYou: boolean; solved: boolean; guesses: number }>;
}
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 py-2 font-semibold";

export function Challenges() {
  const navigate = useNavigate();
  const [length, setLength] = useState(5);
  const [busy, setBusy] = useState(false);
  const recent = useQuery({ queryKey: ["local-challenges"], queryFn: () => localCall<Challenge[]>("listChallenges"), retry: false, staleTime: 0 });
  const start = async (method: string) => {
    setBusy(true);
    try {
      const challenge = await localCall<Challenge>(method, [length]);
      await navigate({ to: "/challenge/$token", params: { token: challenge.id } });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not start challenge."); }
    finally { setBusy(false); }
  };
  return <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-5">
    <AppButton className={button} onClick={() => void navigate({ to: "/lobby" })}><ArrowLeft size={16} />Lobby</AppButton>
    <h1 className="text-2xl font-bold">Daily &amp; Play-Later</h1>
    <>
      <div role="radiogroup" aria-label="Word length" className="flex flex-wrap gap-2">{[5,6,7].map(value => <AppButton role="radio" aria-checked={length === value} key={value} disabled={busy} className={`${button} ${length === value ? "border-primary bg-primary/10 text-primary" : ""}`} onClick={() => setLength(value)}>{value} letters</AppButton>)}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <AppButton className={`${button} justify-start border-primary bg-primary/10 p-5 text-primary`} disabled={busy} onClick={() => void start("dailyChallenge")}><CalendarDays size={20} />Daily Duel</AppButton>
        <AppButton className={`${button} justify-start p-5`} disabled={busy} onClick={() => void start("createReplay")}><Send size={20} />Play-later challenge</AppButton>
      </div>
      <p className="text-sm text-muted-foreground">Daily puzzles change at midnight UTC. Play-later links last 30 days.</p>
      {Boolean(recent.data?.length) && <section className="space-y-2 border-t border-border pt-4"><h2 className="font-semibold">Your recent challenges</h2>{recent.data?.map(challenge => <AppButton key={challenge.id} className={`${button} w-full justify-between text-left text-sm`} onClick={() => void navigate({ to: "/challenge/$token", params: { token: challenge.id } })}><span>{challenge.kind === "daily" ? "Daily Duel" : "Play-later"} · {challenge.wordLength} letters</span><span>{challenge.finished ? challenge.solved ? "Solved" : "Finished" : `${challenge.guesses.length}/6`}</span></AppButton>)}</section>}
    </>
  </main>;
}

export function ChallengeRound() {
  const { token } = useParams({ strict: false }) as { token: string };
  const navigate = useNavigate(), client = useQueryClient();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const queryKey = ["local-challenge", token];
  const query = useQuery({ queryKey, queryFn: () => localCall<Challenge>("challengeState", [token]),
    retry: false, refetchInterval: query => query.state.data?.finished ? 3000 : false });
  const state = query.data;
  useEffect(() => { setInput(""); setError(""); }, [token]);
  const onKey = (key: string) => {
    if (!state || state.finished || busy) return;
    if (key === "BACKSPACE") setInput(value => value.slice(0,-1));
    else if (key === "ENTER") {
      if (input.length !== state.wordLength) { setError(`Enter ${state.wordLength} letters.`); return; }
      setBusy(true); setError("");
      void localCall<Challenge>("submitChallengeGuess", [token, input]).then(next => {
        client.setQueryData(queryKey, next); setInput("");
      }).catch(reason => setError(reason instanceof Error ? reason.message : "Could not submit guess.")).finally(() => setBusy(false));
    } else if (/^[A-Z]$/.test(key)) { setInput(value => value.length < state.wordLength ? value + key : value); setError(""); }
  };
  const share = async () => {
    try { await navigator.clipboard.writeText(`${localInviteOrigin()}/challenge/${token}`); toast.success("Challenge link copied"); }
    catch { toast.error("Could not copy. Select the link below to copy it."); }
  };
  if (query.isError) return <main className="mx-auto max-w-xl space-y-4 p-6"><p role="alert">{query.error instanceof Error ? query.error.message : "Could not load challenge."}</p><AppButton className={button} onClick={() => void navigate({ to: "/challenges" })}>Back to challenges</AppButton></main>;
  if (!state) return <main className="p-6 text-center" role="status">Loading challenge...</main>;
  const active = !state.finished;
  return <div className={active ? "game-live flex flex-col bg-background" : "mx-auto w-full max-w-2xl px-4 py-5"} style={{ "--word-length": state.wordLength } as React.CSSProperties} data-ocid="challenge.page">
    <header className="game-header flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
      <AppButton aria-label="Back to challenges" className="min-h-11 px-2 text-sm" onClick={() => void navigate({ to: "/challenges" })}><ArrowLeft size={16} /></AppButton>
      <h1 className="text-sm font-semibold">{state.kind === "daily" ? "Daily Duel" : "Play-later challenge"} · {state.wordLength} letters</h1>
      <span className="text-xs text-muted-foreground">{state.guesses.length}/6</span>
    </header>
    {active ? <main className="game-main flex min-h-0 flex-1 flex-col items-center gap-2 px-3 py-3">
      <p className="text-xs text-muted-foreground">{state.kind === "daily" ? `${state.day} UTC · ${state.streak} day streak` : "Your board · Share your result when finished"}</p>
      <div className="coop-board"><TileGrid wordLength={state.wordLength} guesses={state.guesses} currentInput={input} maxGuesses={6} /></div>
      <p role="status" className="min-h-5 text-sm text-destructive">{error}</p>
      <Keyboard guesses={state.guesses} onKey={onKey} disabled={busy} />
    </main> : <main className="space-y-5 py-5">
      <h2 className="text-2xl font-bold">{state.solved ? `Solved in ${state.guesses.length} ${state.guesses.length === 1 ? "guess" : "guesses"}` : "The word was"} <span className="uppercase text-primary">{state.answer}</span></h2>
      {state.kind === "daily" && <p className="text-sm">{state.day} UTC · {state.streak} day streak</p>}
      <section aria-label="Your completed puzzle" className="space-y-3">
        <h3 className="text-sm font-semibold">Your puzzle</h3>
        <TileGrid wordLength={state.wordLength} guesses={state.guesses} currentInput="" maxGuesses={6} />
      </section>
      <LearningRecap word={state.answer ?? ""} won={state.solved} guessCount={state.guesses.length} mode={GameMode.versus} />
      <div className="space-y-2 border-y border-border py-4">
        <AppButton className={`${button} bg-primary text-primary-foreground`} onClick={() => void share()}><Copy size={16} />Copy challenge link</AppButton>
        <div className="flex items-center gap-2"><Link size={16} /><input aria-label="Challenge link" readOnly value={`${localInviteOrigin()}/challenge/${token}`} onFocus={event => event.target.select()} className="min-h-11 min-w-0 flex-1 rounded border border-border bg-background px-3 text-sm" /></div>
      </div>
      <section aria-label="Challenge results"><h3 className="font-semibold">Same word, your own pace</h3><table className="mt-2 w-full text-left text-sm"><thead><tr className="border-b border-border"><th className="py-2">Player</th><th>Result</th></tr></thead><tbody>{state.scores.map((score,i) => <tr key={`${score.username}-${i}`} className="border-b border-border"><td className="py-3">{score.isYou ? "You" : score.username}</td><td>{score.solved ? `${score.guesses}/6` : "Not solved"}</td></tr>)}</tbody></table></section>
      <AppButton className={button} onClick={() => void navigate({ to: "/challenges" })}>Back to challenges</AppButton>
    </main>}
  </div>;
}
