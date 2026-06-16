import { useActor } from "@caffeineai/core-infrastructure";
import {
  type ReactNode,
  createContext,
  createElement,
  useCallback,
  useContext,
  useState,
} from "react";
import { Role, createActor } from "../backend";
import { SESSION_KEY } from "../types";

export interface AuthUser {
  username: string;
  role: Role;
}

export interface AuthContextValue {
  user: AuthUser | null;
  sessionToken: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConnecting: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  promoteToAdmin: (secretKey: string) => Promise<void>;
}

const USER_KEY = "__worduel_user__";

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  sessionToken: null,
  isAdmin: false,
  isLoading: false,
  isConnecting: false,
  login: async () => {},
  logout: async () => {},
  register: async () => {},
  promoteToAdmin: async () => {},
});

function useBackendActor() {
  return useActor((canisterId, uploadFile, downloadFile, options) =>
    createActor(canisterId, uploadFile, downloadFile, options),
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { actor, isFetching } = useBackendActor();
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(() =>
    localStorage.getItem(SESSION_KEY),
  );
  const [adminPromoted, setAdminPromoted] = useState(() =>
    user?.username != null
      ? localStorage.getItem(`admin_promoted_${user.username}`) === "true"
      : false,
  );

  // Admin if the backend returned an admin role OR the user self-promoted via secret key
  const isAdmin =
    user?.role === Role.admin ||
    adminPromoted ||
    (user?.username != null &&
      localStorage.getItem(`admin_promoted_${user.username}`) === "true");

  const login = useCallback(
    async (username: string, password: string) => {
      if (!actor) throw new Error("Connecting to server\u2026");
      setIsLoading(true);
      try {
        const result = await actor.login(username, password);
        if (result.__kind__ === "err") throw new Error(result.err);
        const token = result.ok;
        localStorage.setItem(SESSION_KEY, token);
        setSessionToken(token);
        const promoted =
          localStorage.getItem(`admin_promoted_${username}`) === "true";
        const authUser: AuthUser = {
          username,
          role: promoted ? Role.admin : Role.player,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        setUser(authUser);
        setAdminPromoted(promoted);
      } finally {
        setIsLoading(false);
      }
    },
    [actor],
  );

  const register = useCallback(
    async (username: string, password: string) => {
      if (!actor) throw new Error("Connecting to server\u2026");
      setIsLoading(true);
      try {
        const result = await actor.register(username, password);
        if (result.__kind__ === "err") throw new Error(result.err);
        const token = result.ok;
        localStorage.setItem(SESSION_KEY, token);
        setSessionToken(token);
        const authUser: AuthUser = { username, role: Role.player };
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        setUser(authUser);
        setAdminPromoted(false);
      } finally {
        setIsLoading(false);
      }
    },
    [actor],
  );

  const logout = useCallback(async () => {
    const token = localStorage.getItem(SESSION_KEY);
    if (actor && token) {
      try {
        await actor.logout(token);
      } catch {
        /* best effort */
      }
    }
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    setSessionToken(null);
    setUser(null);
    setAdminPromoted(false);
  }, [actor]);

  // Call the BACKEND promoteToAdmin endpoint so the account role is actually
  // changed to #admin server-side. Then re-issue a fresh session token so all
  // subsequent calls carry the admin role.
  // Calls the BACKEND promoteToAdmin so the account role is persisted as #admin
  // server-side, then clears the stale session token (the backend invalidates it).
  // The caller is redirected to log in again to get a fresh token with admin role.
  const promoteToAdmin = useCallback(
    async (secretKey: string) => {
      if (!user?.username) throw new Error("Not logged in");
      if (!actor) throw new Error("Connecting to server\u2026");
      const result = await actor.promoteToAdmin(user.username, secretKey);
      if (result.__kind__ === "err") throw new Error(result.err);
      // The backend invalidates the old session and returns a fresh token.
      // Swap it immediately so all subsequent admin calls (importWords, addWord, etc)
      // use the new valid token — without this swap every admin action returns Unauthorized.
      const newToken = result.ok.newToken;
      localStorage.setItem(SESSION_KEY, newToken);
      setSessionToken(newToken);
      localStorage.setItem(`admin_promoted_${user.username}`, "true");
      const updatedUser: AuthUser = { ...user, role: Role.admin };
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
      setAdminPromoted(true);
    },
    [actor, user],
  );

  const value: AuthContextValue = {
    user,
    sessionToken,
    isAdmin,
    isLoading,
    isConnecting: isFetching,
    login,
    logout,
    register,
    promoteToAdmin,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}
