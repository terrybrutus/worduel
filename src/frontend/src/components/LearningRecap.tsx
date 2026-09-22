import {
  Brain,
  CheckCircle2,
  HelpCircle,
  Share2,
  Star,
  UserPlus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { GameMode } from "../backend";
import { useAuth } from "../hooks/useAuth";
import {
  type Confidence,
  confidenceKey,
  isWordSaved,
  removeWord,
  saveWord,
  updateSavedWordConfidence,
} from "../lib/wordBank";

const MAX_GUESSES = 6;

const WORD_NOTES: Record<string, string> = {
  about: "concerning; on the subject of",
  ambiguous: "open to more than one meaning or interpretation",
  apple: "a round fruit with firm flesh",
  audio: "sound, especially recorded or transmitted sound",
  banks: "land along the sides of a river; also financial institutions",
  basic: "forming an essential foundation",
  brain: "the organ of thought and memory",
  brave: "ready to face danger or difficulty",
  bread: "food made from baked dough",
  chair: "a seat with a back",
  clean: "free from dirt or unwanted marks",
  close: "near in space, time, or relationship",
  court: "a place where legal cases or games are held",
  crane: "a tall machine for lifting heavy things",
  dream: "thoughts or images during sleep",
  earth: "the ground or the planet we live on",
  faith: "trust or strong belief",
  flame: "the visible burning part of a fire",
  fresh: "new, clean, or recently made",
  ghost: "the spirit of a dead person in stories",
  grace: "elegance, kindness, or favor",
  heart: "the organ that pumps blood; also courage or feeling",
  infer: "to reach a conclusion using evidence and reasoning",
  light: "brightness that makes seeing possible",
  lucky: "having good fortune",
  mitigate: "to make something less severe, harmful, or painful",
  plant: "a living thing that grows in soil or water",
  photosynthesis: "the process plants use to turn light into energy",
  pride: "a feeling of self-respect or satisfaction in achievement",
  prune: "a dried plum; also to trim branches or cut something back",
  proud: "feeling pleased about achievement or identity",
  quiet: "making little or no noise",
  resilient: "able to recover after difficulty or change",
  round: "shaped like a circle or sphere",
  share: "to use, enjoy, or divide something with others",
  smart: "quick to understand or learn",
  sound: "something heard",
  stakeholder: "a person or group affected by a decision or project",
  talks: "conversations or formal discussions",
  tests: "checks or trials used to measure knowledge, quality, or performance",
  trust: "firm belief in someone or something",
  world: "the earth, or all people and things",
};

const CONFIDENCE_OPTIONS: Array<{
  value: Confidence;
  label: string;
  icon: typeof CheckCircle2;
}> = [
  { value: "knew", label: "Knew it", icon: CheckCircle2 },
  { value: "guessed", label: "Guessed it", icon: Brain },
  { value: "unknown", label: "No idea", icon: HelpCircle },
];

function getDefinition(word: string): string {
  return WORD_NOTES[word.toLowerCase()] ?? "Definition coming soon.";
}

function copyText(text: string): boolean {
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    navigator.clipboard.writeText(text).catch(() => {});
    return true;
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export interface LearningRecapProps {
  word: string;
  won: boolean;
  guessCount: number;
  mode: GameMode | "practice";
  opponentWon?: boolean;
}

export function LearningRecap({
  word,
  won,
  guessCount,
  mode,
  opponentWon = false,
}: LearningRecapProps) {
  const { user } = useAuth();
  const normalized = word.toLowerCase();
  const hasWord = normalized.trim().length > 0;
  const key = hasWord ? confidenceKey(user?.username, normalized) : "";
  const [confidence, setConfidence] = useState<Confidence | null>(() => {
    if (!key) return null;
    const saved = localStorage.getItem(key);
    return saved === "knew" || saved === "guessed" || saved === "unknown"
      ? saved
      : null;
  });
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(() =>
    hasWord ? isWordSaved(user?.username, normalized) : false,
  );

  const modeLabel =
    mode === "practice"
      ? "Practice"
      : mode === GameMode.coop
        ? "Co-op"
        : "Versus";
  const shareText = `Worduel ${won ? "win" : "result"}: ${
    hasWord ? normalized.toUpperCase() : "answer pending"
  } in ${guessCount || 0}/${MAX_GUESSES} (${modeLabel})`;

  const recap = useMemo(() => {
    if (!hasWord)
      return "The backend did not send the answer for this finished game.";
    if (opponentWon)
      return "Your opponent solved it first. Review the word and try to recall it next time.";
    if (won)
      return "You solved the word. Mark how confident you felt so this can become review data later.";
    return "You saw the answer after the round. Save the meaning mentally for the next duel.";
  }, [hasWord, opponentWon, won]);

  const handleConfidence = (value: Confidence) => {
    setConfidence(value);
    if (key) localStorage.setItem(key, value);
    if (saved) updateSavedWordConfidence(user?.username, normalized, value);
  };

  const handleCopy = () => {
    if (copyText(shareText)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleSaveWord = () => {
    if (!hasWord) return;
    if (saved) {
      removeWord(user?.username, normalized);
      setSaved(false);
      return;
    }
    saveWord(user?.username, normalized, getDefinition(normalized), confidence);
    setSaved(true);
  };

  return (
    <div
      className="w-full max-w-sm rounded-xl border border-border bg-card/80 p-4 text-left"
      data-ocid="learning_recap.card"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary">
            Learning recap
          </p>
          <p className="mt-1 font-display text-xl font-black uppercase tracking-widest text-foreground">
            {hasWord ? normalized : "-----"}
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-display font-bold text-foreground hover:bg-muted/40"
          onClick={handleCopy}
          data-ocid="learning_recap.share_button"
        >
          <Share2 className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Share"}
        </button>
      </div>

      <p className="mt-3 text-sm font-body text-foreground">
        {hasWord ? getDefinition(normalized) : "Answer unavailable."}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{recap}</p>

      <div className="mt-4">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Did you know this word?
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {CONFIDENCE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = confidence === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleConfidence(option.value)}
                disabled={!hasWord}
                className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-display font-bold transition-smooth disabled:opacity-50 ${
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/10 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
                data-ocid={`learning_recap.confidence_${option.value}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleSaveWord}
          disabled={!hasWord}
          className={`mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-display font-bold transition-smooth disabled:opacity-50 ${
            saved
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-muted/10 text-foreground hover:border-primary/40 hover:bg-primary/10"
          }`}
          data-ocid="learning_recap.save_word_button"
        >
          <Star className="h-4 w-4" />
          {user
            ? saved
              ? "Saved to Word Bank"
              : "Save to Word Bank"
            : saved
              ? "Saved on This Device"
              : "Save on This Device"}
        </button>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {user
            ? "Saved words appear in Word Memory Bank."
            : saved
              ? "Saved in this browser. Sign in to keep it with your account."
              : "Guest saves stay on this device until you sign in."}
        </p>
      </div>

      {!user && (
        <button
          type="button"
          onClick={() => window.location.assign("/login?redirect=/word-bank")}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-display font-bold text-primary hover:bg-primary/15"
          data-ocid="learning_recap.sign_in_to_keep_button"
        >
          <UserPlus className="h-4 w-4" />
          Sign in to keep words
        </button>
      )}
    </div>
  );
}

export function getWordDefinition(word: string): string {
  return getDefinition(word);
}
