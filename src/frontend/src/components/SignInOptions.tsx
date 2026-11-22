import { KeyRound, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { AppButton } from "./AppButton";

export function SignInOptions({ onClose }: { onClose: () => void }) {
  const { user, loginWithProvider, isSigningIn, authError, accountNotice } =
    useAuth();
  const [username, setUsername] = useState("");
  useEffect(() => {
    if (user && !user.isGuest) onClose();
  }, [user, onClose]);
  return (
    <section
      className="mx-auto w-full max-w-md space-y-4 p-6"
      aria-label="Sign in to Worduel"
    >
      <h1 className="text-2xl font-bold">Keep your Worduel progress</h1>
      <p className="text-sm text-muted-foreground">
        Use the same account on any device. Your guest words, stats, and game
        history come with you.
      </p>
      <label className="block text-sm font-semibold" htmlFor="account-name">
        Username for a new account{" "}
        <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <input
        id="account-name"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        maxLength={24}
        autoComplete="nickname"
        placeholder="Player"
        disabled={isSigningIn}
        className="min-h-11 w-full rounded-md border border-border bg-background px-3"
      />
      <div className="grid gap-3">
        <AppButton
          disabled={isSigningIn}
          onClick={() => loginWithProvider("google", username)}
          className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 font-semibold"
        >
          <LogIn size={18} />
          Continue with Google
        </AppButton>
        <AppButton
          disabled={isSigningIn}
          onClick={() => loginWithProvider("microsoft", username)}
          className="flex min-h-12 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 font-semibold"
        >
          <LogIn size={18} />
          Continue with Microsoft
        </AppButton>
      </div>
      {isSigningIn && (
        <output className="block text-sm">Finishing sign-in...</output>
      )}
      {authError && (
        <p role="alert" className="text-sm text-destructive">
          {authError}
        </p>
      )}
      {accountNotice && (
        <output className="block text-sm">{accountNotice}</output>
      )}
      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer py-2">Other sign-in options</summary>
        <AppButton
          disabled={isSigningIn}
          onClick={() => loginWithProvider("passkey", username)}
          className="flex min-h-11 items-center gap-2"
        >
          <KeyRound size={16} />
          Continue with a passkey
        </AppButton>
      </details>
      <p className="text-xs text-muted-foreground">
        Your email address is not your public username. Worduel never asks for
        your Google or Microsoft password.
      </p>
      <AppButton
        disabled={isSigningIn}
        onClick={onClose}
        className="min-h-11 w-full rounded-md border border-border px-4 font-semibold"
      >
        Keep playing as guest
      </AppButton>
    </section>
  );
}
