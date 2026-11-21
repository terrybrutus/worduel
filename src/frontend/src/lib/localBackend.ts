import { Actor, HttpAgent, type Identity } from "@icp-sdk/core/agent";
import { IDL } from "@icp-sdk/core/candid";
import type { backendInterface, CreateGameResult, GameMode } from "../backend";
import { SESSION_KEY } from "../types";
import { readWithDeadline } from "./readDeadline";

const IDENTITY = "__worduel_native_guest__";
export interface LocalGuest { token: string; username: string }
export function localGuest(): LocalGuest | null {
  try { return JSON.parse(localStorage.getItem(IDENTITY) ?? "null"); } catch { return null; }
}
interface NativeService {
  appCall: (token: string, method: string, args: string) => Promise<string>;
  loginWithIdentity: (name: string) => Promise<{ ok: string } | { err: string }>;
}
const idlFactory: IDL.InterfaceFactory = ({ IDL }) => IDL.Service({
  appCall: IDL.Func([IDL.Text,IDL.Text,IDL.Text],[IDL.Text],[]),
  loginWithIdentity: IDL.Func([IDL.Text],[IDL.Variant({ ok: IDL.Text, err: IDL.Text })],[]),
});
let anonymousActor: Promise<NativeService> | undefined;
async function createNativeActor(identity?: Identity): Promise<NativeService> {
  const response = await fetch("/env.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Backend configuration is unavailable.");
  const config = await response.json();
  if (!config.backend_canister_id) throw new Error("The Caffeine backend canister is not configured.");
  const agent = await HttpAgent.create({ host: config.backend_host || location.origin, identity });
  if (import.meta.env.DEV && config.worduel_local === true) await agent.fetchRootKey();
  return Actor.createActor(idlFactory, { agent, canisterId: config.backend_canister_id }) as unknown as NativeService;
}
function nativeActor() {
  return anonymousActor ??= createNativeActor().catch(error => { anonymousActor = undefined; throw error; });
}
const enumKinds = new Set(["correct","present","absent","coop","versus","admin","player","opponentWon"]);
const bigFields = new Set(["playerNum","timestamp","opponentGuessCount","currentTurn","createdAt","endedAt","myGuessCount","totalWins","totalLosses","currentStreak","bestStreak","wins","losses"]);
function decode(value: unknown, key = ""): any {
  if (Array.isArray(value)) return value.map(item => decode(item));
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 1 && entries[0][0] === "__worduelBigInt") return BigInt(String(entries[0][1]));
    if (entries.length === 1 && entries[0][0].startsWith("#")) {
      const kind = entries[0][0].slice(1), payload = entries[0][1];
      if (enumKinds.has(kind) || key === "myOutcome") return kind;
      return { __kind__: kind, [kind]: kind === "won" && typeof payload === "number" ? BigInt(payload) : decode(payload,kind) };
    }
    return Object.fromEntries(entries.map(([field,item]) => [field,decode(item,field)]));
  }
  if (typeof value === "number" && bigFields.has(key)) return BigInt(value);
  return value;
}
const timedReads = new Set(["getGameState","getGameStateWithRole","getMyActiveGames","listPublicGames","getMyProfile","getUsernameForSession","getRematchOffer"]);
export async function localCall<T>(method: string, args: unknown[] = [], timeoutMs = 12000): Promise<T> {
  if (method === "connection") {
    if (!import.meta.env.DEV) return { origins: [location.origin] } as T;
    const response = await fetch("/__worduel_connection");
    return await response.json() as T;
  }
  const token = localGuest()?.token ?? localStorage.getItem(SESSION_KEY) ?? "";
  const request = async () => (await nativeActor()).appCall(token,method,JSON.stringify(args,(_,value) => typeof value === "bigint" ? Number(value) : value));
  let result: string;
  try {
    // A read may be abandoned safely; mutations must not be retried implicitly.
    result = await (timedReads.has(method) ? readWithDeadline(request,timeoutMs) : request());
  } catch (error) { if (timedReads.has(method)) anonymousActor = undefined; throw error; }
  const decoded = decode(JSON.parse(result));
  if (method === "getWordCount" && typeof decoded === "number") return BigInt(decoded) as T;
  if (decoded?.day && /^\d+$/.test(decoded.day)) decoded.day = new Date(Number(decoded.day) * 86400000).toISOString().slice(0,10);
  return decoded as T;
}
let pendingGuest: Promise<LocalGuest> | null = null;
let shareOrigin: string | null = null;
export function localInviteOrigin(): string { return ["localhost","127.0.0.1"].includes(location.hostname) ? shareOrigin || location.origin : location.origin; }
export function storeNativeSession(guest: LocalGuest) {
  localStorage.setItem(IDENTITY,JSON.stringify(guest));
  localStorage.setItem(SESSION_KEY,guest.token);
}
export function connectLocalGuest(): Promise<LocalGuest> {
  if (!pendingGuest) pendingGuest = (async () => {
    const existing = localGuest();
    if (existing && await localCall<string | null>("getUsernameForSession") === existing.username) return existing;
    const guest = await localCall<LocalGuest>("guest");
    storeNativeSession(guest);
    return guest;
  })().finally(() => { pendingGuest = null; });
  return pendingGuest;
}
export async function signInNativeIdentity(identity: Identity, name: string): Promise<LocalGuest> {
  const actor = await createNativeActor(identity);
  const result = await actor.loginWithIdentity(name);
  if ("err" in result) throw new Error(result.err);
  storeNativeSession({ token: result.ok, username: name });
  const username = await localCall<string | null>("getUsernameForSession");
  if (!username) throw new Error("Identity session could not be verified.");
  const session = { token: result.ok,username };
  storeNativeSession(session);
  return session;
}
export const localBackend = new Proxy({} as backendInterface, {
  get: (_,method) => typeof method === "string" && method !== "then" ? (...args: unknown[]) => localCall(method,args) : undefined,
});
export function createLocalMatch(token: string, mode: GameMode, isPrivate: boolean, length: number): Promise<CreateGameResult> {
  return localCall(isPrivate ? "createPrivateGame" : "createPublicGame",[token,mode,length]);
}
export function gameWordLength(game: unknown): number {
  const length = Number((game as { wordLength?: number } | null)?.wordLength);
  return length === 6 || length === 7 ? length : 5;
}
export async function friendOrigin(): Promise<string> {
  if (import.meta.env.DEV && ["localhost","127.0.0.1"].includes(location.hostname)) {
    try { const reply = await localCall<{origins:string[]}>("connection"); shareOrigin = reply.origins.find(origin => !origin.includes("172.")) || reply.origins[0] || location.origin; } catch {}
  }
  return localInviteOrigin();
}
