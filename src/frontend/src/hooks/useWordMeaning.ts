import { useEffect, useState } from "react";
import { localCall } from "../lib/localBackend";

interface Meaning { definition: string; example: string; source: string; sourceUrl: string; aiEnhanced?: boolean; originalDefinition?: string }
const cache = new Map<string, Meaning>();
const pending = new Map<string, Promise<Meaning | null>>();

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Dictionary unavailable");
    return await response.json();
  } finally { window.clearTimeout(timer); }
}

// Parse external markup inertly and render only text, never external HTML.
function plainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,sup").forEach(node => node.remove());
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

async function lookup(word: string): Promise<Meaning | null> {
  {
    try { const meaning = await localCall<Meaning | null>("wordMeaning", [word], 20000); if (meaning?.definition) return meaning; }
    catch { /* Offline local service: the normal dictionary lookup still works. */ }
  }
  try {
    const entries = await fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`) as Array<{
      meanings?: Array<{ definitions?: Array<{ definition?: string; example?: string }> }>;
    }>;
    const meaning = entries.flatMap(entry => entry.meanings ?? []).flatMap(entry => entry.definitions ?? [])
      .find(entry => typeof entry.definition === "string" && entry.definition.trim());
    if (meaning?.definition) return { definition: meaning.definition, example: meaning.example ?? "",
      source: "Free Dictionary API", sourceUrl: `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}` };
  } catch { /* Valid guesses can be absent from this dictionary. */ }
  try {
    const entries = await fetchJson(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`) as {
      en?: Array<{ definitions?: Array<{ definition?: string; examples?: string[] }> }>;
    };
    const meaning = entries.en?.flatMap(entry => entry.definitions ?? [])
      .find(entry => typeof entry.definition === "string" && plainText(entry.definition));
    if (meaning?.definition) return { definition: plainText(meaning.definition), example: plainText(meaning.examples?.[0] ?? ""),
      source: "Wiktionary (CC BY-SA)", sourceUrl: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#English` };
  } catch { /* Keep misses retryable; don't cache failures. */ }
  return null;
}

export function lookupMeaning(word: string): Promise<Meaning | null> {
  const normalized = word.trim().toLowerCase();
  if (!/^[a-z]{2,32}$/.test(normalized)) return Promise.resolve(null);
  const cached = cache.get(normalized);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(normalized);
  if (existing) return existing;
  const request = lookup(normalized).then(result => {
    if (result) {
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      cache.set(normalized, result);
    }
    return result;
  }).finally(() => pending.delete(normalized));
  pending.set(normalized, request);
  return request;
}

export function useWordMeaning(word: string, fallback: string, enabled = true) {
  const available = Boolean(fallback) && fallback !== "Definition coming soon.";
  const initial = { word, definition: available ? fallback : "", example: "", loading: enabled,
    source: available ? "Worduel" : "", sourceUrl: "", aiEnhanced: false, originalDefinition: "" };
  const [result, setResult] = useState(initial);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setResult({ word, definition: available ? fallback : "", example: "", loading: true,
      source: available ? "Worduel" : "", sourceUrl: "", aiEnhanced: false, originalDefinition: "" });
    void lookupMeaning(word).then(meaning => {
      if (!active) return;
      setResult({ word, definition: meaning?.definition ?? (available ? fallback : ""),
        example: meaning?.example ?? "", loading: false,
        source: meaning?.source ?? (available ? "Worduel" : ""), sourceUrl: meaning?.sourceUrl ?? "",
        aiEnhanced: meaning?.aiEnhanced ?? false, originalDefinition: meaning?.originalDefinition ?? "" });
    });
    return () => { active = false; };
  }, [word, fallback, available, enabled]);
  return result.word === word ? result : initial;
}
