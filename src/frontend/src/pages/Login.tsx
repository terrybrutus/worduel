import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertCircle, BookOpen, Eye, EyeOff, UserX } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";

type Mode = "login" | "signup";

interface LoginFormProps {
  onSuccess?: () => void;
}

/** Core login/signup form — no router hooks. Safe to render anywhere. */
function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, register, isLoading, isConnecting } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsernameTaken, setIsUsernameTaken] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUsernameTaken(false);

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      if (onSuccess) {
        onSuccess();
      }
      // If no onSuccess, the caller (LoginPage) handles navigation
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      const taken =
        msg.toLowerCase().includes("already taken") ||
        msg.toLowerCase().includes("username already");
      setIsUsernameTaken(taken && mode === "signup");
      setError(
        taken && mode === "signup"
          ? "That username is already taken. Please choose a different one."
          : msg,
      );
      if (taken && mode === "signup")
        setTimeout(() => usernameRef.current?.focus(), 0);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setError(null);
    setIsUsernameTaken(false);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div
      className="flex-1 flex items-center justify-center px-4 py-16 bg-background"
      data-ocid="login.page"
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 glow-primary">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display font-extrabold text-3xl tracking-tight text-foreground">
            Word<span className="text-primary text-glow">uel</span>
          </h1>
          <p className="text-sm text-muted-foreground font-mono uppercase tracking-widest">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-8 shadow-[0_4px_32px_oklch(0_0_0/0.4)]">
          <div
            className="flex rounded-lg bg-muted/60 p-1 mb-6"
            data-ocid="login.tab"
          >
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                data-ocid={`login.${m}_tab`}
                className={`flex-1 py-2 rounded-md text-sm font-semibold font-body transition-smooth ${
                  mode === m
                    ? "bg-card text-foreground shadow-xs border border-border/40"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="username"
                className="text-sm font-semibold font-body text-foreground"
              >
                Username
              </label>
              <input
                ref={usernameRef}
                id="username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (isUsernameTaken) setIsUsernameTaken(false);
                }}
                className={`input-base w-full${isUsernameTaken ? " input-error" : ""}`}
                data-ocid="login.username_input"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-semibold font-body text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base w-full pr-11"
                  data-ocid="login.password_input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-semibold font-body text-foreground"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-base w-full"
                  data-ocid="login.confirm_password_input"
                  disabled={isLoading}
                />
              </div>
            )}

            {error && (
              <div
                className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm font-body ${
                  isUsernameTaken
                    ? "bg-secondary/10 border border-secondary/40 text-secondary"
                    : "bg-destructive/10 border border-destructive/40 text-destructive"
                }`}
                data-ocid="login.error_state"
              >
                {isUsernameTaken ? (
                  <UserX className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base justify-center flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              data-ocid="login.submit_button"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  {isConnecting
                    ? "Connecting to server…"
                    : mode === "login"
                      ? "Signing in…"
                      : "Creating account…"}
                </>
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </button>

            {isConnecting && !isLoading && (
              <p
                className="text-center text-xs text-muted-foreground"
                data-ocid="login.loading_state"
              >
                <span className="animate-pulse">●</span> Connecting to game
                server…
              </p>
            )}
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="text-primary hover:underline font-semibold"
              data-ocid="login.switch_mode_button"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Login page — rendered inside RouterProvider.
 * Reads redirect param from the URL and navigates after success.
 */
export default function Login() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, string>;
  const redirectTo = search.redirect
    ? decodeURIComponent(search.redirect)
    : "/lobby";

  const handleSuccess = () => {
    void navigate({ to: redirectTo as "/lobby" });
  };

  return <LoginForm onSuccess={handleSuccess} />;
}

/**
 * LoginModal — safe to render outside RouterProvider.
 * Does NOT call any router hooks.
 */
export function LoginModal({ onClose }: { onClose: () => void }) {
  return <LoginForm onSuccess={onClose} />;
}
