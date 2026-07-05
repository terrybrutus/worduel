import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { createActor } from "@/backend";
import { EndScreen } from "@/components/EndScreen";
import { GameScreen } from "@/components/GameScreen";
import { Hud } from "@/components/Hud";
import { StartScreen } from "@/components/StartScreen";
import { useGame } from "@/hooks/useGame";

function useBestScore() {
  const { actor, isFetching } = useActor(createActor);
  const query = useQuery<number>({
    queryKey: ["bestScore"],
    queryFn: async () => {
      if (!actor) return 0;
      const result = await actor.getBestScore();
      return Number(result);
    },
    enabled: !!actor && !isFetching,
    initialData: 0,
  });
  return query;
}

function useSubmitScore() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (score: number) => {
      if (!actor) return 0;
      const result = await actor.submitScore(BigInt(score));
      return Number(result);
    },
    onSuccess: (newBest) => {
      queryClient.setQueryData(["bestScore"], newBest);
    },
  });
}

export default function App() {
  const bestScoreQuery = useBestScore();
  const submitScoreMutation = useSubmitScore();
  const bestScore = bestScoreQuery.data ?? 0;

  const handleSubmitScore = useCallback(
    (score: number) => {
      if (!submitScoreMutation.isPending) {
        submitScoreMutation.mutate(score);
      }
    },
    [submitScoreMutation],
  );

  const game = useGame({
    bestScore,
    onSubmitScore: handleSubmitScore,
  });

  const isNewBest = useMemo(
    () => game.phase === "end" && game.score > bestScore,
    [game.phase, game.score, bestScore],
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {game.phase === "playing" && (
        <Hud
          score={game.score}
          streak={game.streak}
          roundIndex={game.roundIndex}
          totalRounds={game.totalRounds}
          timeLeft={game.timeLeft}
          roundSeconds={game.roundSeconds}
          bestScore={bestScore}
        />
      )}

      <main className="flex flex-1 flex-col">
        {game.phase === "start" && (
          <StartScreen bestScore={bestScore} onStart={game.start} />
        )}

        {game.phase === "playing" && game.currentRound != null && (
          <GameScreen
            target={game.currentRound.target}
            pool={game.currentRound.pool}
            placedChars={game.placedChars}
            usedIds={game.usedIds}
            isAnswerComplete={game.isAnswerComplete}
            lastOutcome={game.lastOutcome}
            timeLeft={game.timeLeft}
            onPlace={game.placeLetter}
            onRemove={game.removeLetter}
            onSubmit={game.submit}
            onSkip={game.skip}
            onAdvance={game.advance}
          />
        )}

        {game.phase === "end" && (
          <EndScreen
            score={game.score}
            bestStreak={game.bestStreak}
            bestScore={bestScore}
            isNewBest={isNewBest}
            onPlayAgain={game.start}
          />
        )}
      </main>

      <footer className="border-t-2 border-border bg-card px-4 py-3 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              typeof window !== "undefined"
                ? window.location.hostname
                : "worduel",
            )}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
            data-ocid="worduel.footer.link"
          >
            caffeine.ai
          </a>
        </span>
      </footer>
    </div>
  );
}
