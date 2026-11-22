import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { type PlayerInfo, Role } from "../backend";
import {
  type LocalGuest,
  connectLocalGuest,
  localCall,
  localGuest,
  signInNativeIdentity,
  storeNativeSession,
} from "../lib/localBackend";
import { readWithDeadline } from "../lib/readDeadline";
import {
  loadWordBank,
  mergeGuestWordBankIntoUser,
  saveWordBank,
} from "../lib/wordBank";
import { mergeBanks, startWordBankSync } from "../lib/wordBankSync";
import { SESSION_KEY } from "../types";

export type SignInProvider = "google" | "microsoft" | "passkey";
export interface AuthUser {
  username: string;
  role: Role;
  isGuest: boolean;
}
export interface AuthContextValue {
  user: AuthUser | null;
  sessionToken: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConnecting: boolean;
  isSigningIn: boolean;
  authError: string;
  accountNotice: string;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  loginWithProvider: (provider: SignInProvider, username?: string) => void;
  retryConnection: () => void;
  logout: () => Promise<void>;
  promoteToAdmin: (secretKey: string) => Promise<void>;
}
const unavailable = async () => {
  throw new Error("Use Google or Microsoft to sign in.");
};
export const AuthContext = createContext<AuthContextValue>({
  user: null,
  sessionToken: null,
  isAdmin: false,
  isLoading: true,
  isConnecting: true,
  isSigningIn: false,
  authError: "",
  accountNotice: "",
  login: unavailable,
  register: unavailable,
  loginWithProvider: () => {},
  retryConnection: () => {},
  logout: async () => {},
  promoteToAdmin: unavailable,
});
const PENDING_NAME = "__worduel_sign_in_name__";

export function AuthProvider({ children }: { children: ReactNode }) {
  const identity = useInternetIdentity();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<LocalGuest | null>(null);
  const [role, setRole] = useState(Role.player);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [linking, setLinking] = useState(false);
  const [retry, setRetry] = useState(0);
  const flight = useRef<Promise<void>>(Promise.resolve());
  const stopSync = useRef<(() => void) | undefined>(undefined);
  const retryConnection = useCallback(() => setRetry((value) => value + 1), []);

  // Serialize account transitions so a late guest response cannot replace a signed-in session.
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry explicitly restarts a failed connection.
  useEffect(() => {
    if (identity.isInitializing) return;
    let cancelled = false;
    const connect = async () => {
      if (cancelled) return;
      setError("");
      setLinking(identity.isAuthenticated);
      stopSync.current?.();
      try {
        const before = localGuest();
        if (!identity.isAuthenticated && before?.isGuest === false)
          setSession(null);
        let next: LocalGuest;
        if (identity.isAuthenticated && identity.identity) {
          let guest = before?.isGuest === true;
          if (before && before.isGuest === undefined) {
            try {
              guest = await localCall<boolean>("isGuestSession");
            } catch {
              guest = false;
            }
          }
          next = await signInNativeIdentity(
            identity.identity,
            sessionStorage.getItem(PENDING_NAME) || "Player",
            guest && before ? before.token : "",
            guest && before
              ? JSON.stringify(
                  mergeBanks(
                    [],
                    loadWordBank(undefined),
                    loadWordBank(before.username),
                  ),
                )
              : "[]",
          );
          if (cancelled) return;
          storeNativeSession(next);
          if (guest && before) {
            saveWordBank(
              next.username,
              mergeBanks(
                [],
                loadWordBank(next.username),
                loadWordBank(before.username),
              ),
            );
            mergeGuestWordBankIntoUser(next.username);
          }
          setNotice(
            next.guestProgress === "expired"
              ? "Your saved words were kept, but the expired guest session could not transfer its stats."
              : next.guestProgress === "merged"
                ? "Guest words, stats, and game history are now in your account."
                : "",
          );
          sessionStorage.removeItem(PENDING_NAME);
        } else {
          next = await connectLocalGuest();
          if (cancelled) return;
          if (before?.isGuest && before.username !== next.username) {
            saveWordBank(
              next.username,
              mergeBanks(
                [],
                loadWordBank(next.username),
                loadWordBank(before.username),
              ),
            );
          }
          // One-time import of the older local preview, never another signed-in account.
          if (!localStorage.getItem("__worduel_native_bank_migrated__")) {
            let previous: LocalGuest | null = null;
            try {
              previous = JSON.parse(
                localStorage.getItem("__worduel_local_guest__") || "null",
              );
            } catch {}
            saveWordBank(
              next.username,
              mergeBanks([], loadWordBank(next.username), [
                ...loadWordBank("WordMaster"),
                ...(previous ? loadWordBank(previous.username) : []),
              ]),
            );
            mergeGuestWordBankIntoUser(next.username);
            localStorage.setItem("__worduel_native_bank_migrated__", "true");
          }
          if (identity.isSessionExpired)
            setNotice(
              "Your sign-in expired. Sign in again to restore your account.",
            );
        }
        const profile = await localCall<PlayerInfo | null>("getMyProfile");
        if (!profile)
          throw new Error("Your session could not be verified. Please retry.");
        if (cancelled) return;
        queryClient.clear();
        setRole(profile.role);
        setSession(next);
        localStorage.setItem(
          "__worduel_user__",
          JSON.stringify({
            username: next.username,
            role: profile.role,
            isGuest: next.isGuest,
          }),
        );
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not connect. Your guest progress has not been discarded.",
          );
      } finally {
        if (!cancelled) setLinking(false);
      }
    };
    flight.current = flight.current.catch(() => {}).then(connect);
    return () => {
      cancelled = true;
      stopSync.current?.();
    };
  }, [
    identity.identity,
    identity.isAuthenticated,
    identity.isInitializing,
    identity.isSessionExpired,
    queryClient,
    retry,
  ]);

  useEffect(() => {
    if (!session || linking) return;
    const stop = startWordBankSync(session.username, session.token);
    stopSync.current = stop;
    return stop;
  }, [session, linking]);

  const loginWithProvider = (provider: SignInProvider, username?: string) => {
    setError("");
    sessionStorage.setItem(PENDING_NAME, username?.trim() || "Player");
    // Must remain synchronous inside the user's click event for mobile popups.
    if (identity.isAuthenticated) retryConnection();
    else identity.login(provider === "passkey" ? undefined : { provider });
  };
  const logout = async () => {
    stopSync.current?.();
    try {
      await readWithDeadline(() => localCall("logout"), 5000);
    } catch {
      /* Local sign-out must still work offline. */
    }
    localStorage.removeItem("__worduel_native_guest__");
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("__worduel_user__");
    queryClient.clear();
    setSession(null);
    setNotice("");
    if (identity.isAuthenticated) identity.clear();
    else retryConnection();
  };
  const authError =
    error ||
    (identity.isLoginError
      ? "Sign-in was cancelled or could not finish. Your guest progress is still here. Try again."
      : "");
  if (!session)
    return createElement(
      "main",
      { className: "app-shell mx-auto p-6 text-center" },
      createElement(
        "p",
        { role: "status" },
        authError ||
          (linking
            ? "Restoring your words and stats..."
            : "Connecting to Worduel..."),
      ),
      authError &&
        createElement(
          "button",
          {
            type: "button",
            onClick: retryConnection,
            className: "mt-4 rounded-md border p-3",
          },
          "Retry connection",
        ),
      authError &&
        identity.isAuthenticated &&
        createElement(
          "button",
          {
            type: "button",
            onClick: identity.clear,
            className: "mt-4 ml-3 rounded-md border p-3",
          },
          "Continue as guest",
        ),
    );
  return createElement(
    AuthContext.Provider,
    {
      value: {
        user: {
          username: session.username,
          role,
          isGuest: session.isGuest !== false,
        },
        sessionToken: session.token,
        isAdmin: role === Role.admin,
        isLoading: false,
        isConnecting: linking,
        isSigningIn: identity.isInitializing || identity.isLoggingIn || linking,
        authError,
        accountNotice: notice,
        login: unavailable,
        register: unavailable,
        loginWithProvider,
        retryConnection,
        logout,
        promoteToAdmin: unavailable,
      },
    },
    children,
  );
}
export function useAuth() {
  return useContext(AuthContext);
}
