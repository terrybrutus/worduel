import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Role, type PlayerInfo } from "../backend";
import { connectLocalGuest, localGuest, localCall, signInNativeIdentity, type LocalGuest } from "../lib/localBackend";
import { loadWordBank, saveWordBank, mergeGuestWordBankIntoUser } from "../lib/wordBank";
import { SESSION_KEY } from "../types";
import { startWordBankSync } from "../lib/wordBankSync";

export interface AuthUser { username: string; role: Role }
export interface AuthContextValue {
  user: AuthUser | null; sessionToken: string | null; isAdmin: boolean; isLoading: boolean; isConnecting: boolean;
  login: (username: string,password: string) => Promise<void>;
  register: (username: string,password: string) => Promise<void>;
  loginWithProvider: (requestedUsername?: string) => Promise<void>;
  logout: () => Promise<void>;
  promoteToAdmin: (secretKey: string) => Promise<void>;
}
const unavailable = async () => { throw new Error("Password login is retired. Use guest play or Caffeine identity."); };
export const AuthContext = createContext<AuthContextValue>({ user: null,sessionToken: null,isAdmin: false,isLoading: true,isConnecting: true,login: unavailable,register: unavailable,loginWithProvider: unavailable,logout: async () => {},promoteToAdmin: unavailable });
export function AuthProvider({ children }: { children: ReactNode }) {
  const identity = useInternetIdentity();
  const [session,setSession] = useState<LocalGuest | null>(null);
  const [role,setRole] = useState(Role.player);
  const [error,setError] = useState("");
  const signingIn = useRef(false);
  const connect = useCallback(async () => {
    setError("");
    try {
      const before = localGuest();
      const next = await connectLocalGuest();
      const profile = await localCall<PlayerInfo | null>("getMyProfile");
      if (!profile) throw new Error("Session could not be verified.");
      if (before && before.username !== next.username) {
        const saved = loadWordBank(next.username);
        saveWordBank(next.username,[...saved,...loadWordBank(before.username).filter(word => !saved.some(entry => entry.word === word.word))]);
      }
      // Preserve the previous local prototype's saved words when moving to the canister.
      if (!localStorage.getItem("__worduel_native_bank_migrated__")) {
        let previous: LocalGuest | null = null;
        try { previous = JSON.parse(localStorage.getItem("__worduel_local_guest__") ?? "null"); } catch {}
        const current = loadWordBank(next.username);
        const old = [...loadWordBank("WordMaster"),...(previous ? loadWordBank(previous.username) : [])];
        saveWordBank(next.username,[...current,...old.filter((word,index) => !current.some(entry => entry.word === word.word) && old.findIndex(entry => entry.word === word.word) === index)]);
        mergeGuestWordBankIntoUser(next.username);
        localStorage.setItem("__worduel_native_bank_migrated__","true");
      }
      setRole(profile.role); setSession(next);
      localStorage.setItem("__worduel_user__",JSON.stringify({username: next.username,role: profile.role}));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not connect."); }
  },[]);
  useEffect(() => { void connect(); },[connect]);
  useEffect(() => { if (session) return startWordBankSync(session.username,session.token); },[session?.username,session?.token]);
  const loginWithProvider = useCallback(async (requestedUsername?: string) => {
    if (!identity.identity || !identity.isAuthenticated) {
      localStorage.setItem("__worduel_pending_identity__",requestedUsername?.trim() || "player");
      identity.login(); return;
    }
    const before = localGuest();
    const next = await signInNativeIdentity(identity.identity,requestedUsername || "player");
    if (before) {
      const saved = loadWordBank(next.username);
      saveWordBank(next.username,[...saved,...loadWordBank(before.username).filter(word => !saved.some(entry => entry.word === word.word))]);
    }
    localStorage.removeItem("__worduel_pending_identity__");
    await connect();
  },[connect,identity]);
  useEffect(() => {
    const pending = localStorage.getItem("__worduel_pending_identity__");
    if (!pending || !identity.isAuthenticated || signingIn.current) return;
    signingIn.current = true;
    void loginWithProvider(pending).catch(reason => setError(String(reason))).finally(() => { signingIn.current = false; });
  },[identity.isAuthenticated,loginWithProvider]);
  if (!session) return createElement("main",{className:"mx-auto p-6 text-center"},
    createElement("p",{role:"status"},error || "Connecting to Worduel..."),
    error && createElement("button",{onClick:() => void connect(),className:"mt-4 rounded-md border p-3"},"Retry connection"));
  return createElement(AuthContext.Provider,{value:{
    user:{username:session.username,role}, sessionToken:session.token,isAdmin:role === Role.admin,isLoading:false,isConnecting:false,
    login:unavailable,register:unavailable,loginWithProvider,
    logout:async () => {
      await localCall("logout");
      localStorage.removeItem("__worduel_native_guest__"); localStorage.removeItem(SESSION_KEY); localStorage.removeItem("__worduel_user__");
      if (identity.isAuthenticated) identity.clear();
      setSession(null); await connect();
    },
    promoteToAdmin:async () => { throw new Error("Only the Caffeine canister controller can assign administrators."); },
  }},children);
}
export function useAuth() { return useContext(AuthContext); }
