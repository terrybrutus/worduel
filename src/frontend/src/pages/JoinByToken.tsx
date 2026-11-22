import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppButton } from "../components/AppButton";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";
import { inviteError } from "../lib/gameConnection";
import { localBackend } from "../lib/localBackend";

export default function JoinByToken() {
  const { joinToken } = useParams({ from: "/game/join/$joinToken" });
  const search = useSearch({ strict: false }) as Record<string, string>;
  const hint = search.gameId || null;
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const request = useRef(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: An explicit retry must restart the join request.
  useEffect(() => {
    if (!sessionToken) return;
    const current = ++request.current;
    setError(null);
    const timer = window.setTimeout(() => {
      if (request.current === current) setError("connection");
    }, 15000);
    void localBackend
      .joinByToken(sessionToken, joinToken, hint)
      .then((result) => {
        window.clearTimeout(timer);
        if (request.current !== current) return;
        if (result.__kind__ === "err") {
          setError(result.err);
          return;
        }
        void navigate({
          to: "/game/$gameId",
          params: { gameId: result.ok.id },
          replace: true,
        });
      })
      .catch(() => {
        window.clearTimeout(timer);
        if (request.current === current) setError("connection");
      });
    return () => {
      window.clearTimeout(timer);
      request.current++;
    };
  }, [sessionToken, joinToken, hint, attempt, navigate]);
  const failure = error ? inviteError(error) : null;
  return (
    <main
      className="flex min-h-[var(--app-height)] flex-col items-center justify-center gap-5 bg-background px-6 text-center"
      data-ocid="join_by_token.page"
    >
      {failure ? (
        <>
          <div role="alert" className="max-w-sm space-y-2">
            <h1 className="text-xl font-bold">{failure.title}</h1>
            <p className="text-sm text-muted-foreground">{failure.detail}</p>
          </div>
          <AppButton
            className="btn-primary flex min-h-11 items-center gap-2 px-4"
            onClick={() => setAttempt((value) => value + 1)}
          >
            <RefreshCw size={16} />
            Try again
          </AppButton>
          <AppButton
            className="flex min-h-11 items-center gap-2 px-4"
            onClick={() => void navigate({ to: "/lobby", replace: true })}
          >
            <ArrowLeft size={16} />
            Back to Lobby
          </AppButton>
        </>
      ) : (
        <>
          <LoadingSpinner size="lg" />
          <output className="block font-semibold">
            Joining your friend's game...
          </output>
        </>
      )}
    </main>
  );
}
