import { localCall } from "./localBackend";
import {
  type GeneratedQuizPack,
  type ReviewQuestion,
  hasAuthoredChoices,
  makeQuestion,
} from "./reviewQuiz";

interface Reply {
  status: string;
  question?: GeneratedQuizPack;
}
const cached = new Map<string, { reply: Reply; expires: number }>();
const pending = new Map<string, Promise<Reply>>();
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function validPack(pack: GeneratedQuizPack, question: ReviewQuestion): boolean {
  const safe = (value: unknown, max: number): value is string =>
    typeof value === "string" &&
    value.trim().length >= 3 &&
    value.length <= max &&
    !/[<>]|https?:\/\//i.test(value);
  const alternatives = (items: GeneratedQuizPack["alternatives"]) =>
    Array.isArray(items) &&
    items.length === 2 &&
    items.every(
      (item) =>
        item &&
        safe(item.word, 40) &&
        /^[a-z][a-z '-]*$/i.test(item.word) &&
        normalize(item.word) !== normalize(question.entry.word) &&
        safe(item.definition, 350) &&
        normalize(item.definition) !== normalize(question.entry.definition),
    ) &&
    new Set(items.map((item) => normalize(item.word))).size === 2 &&
    new Set(items.map((item) => normalize(item.definition))).size === 2;
  if (
    !pack ||
    pack.aiGenerated !== true ||
    typeof pack.word !== "string" ||
    pack.word.toLowerCase() !== question.entry.word.toLowerCase() ||
    typeof pack.savedDefinition !== "string" ||
    normalize(pack.savedDefinition) !== normalize(question.entry.definition) ||
    !alternatives(pack.alternatives)
  )
    return false;
  if (
    pack.sentence &&
    (!safe(pack.sentence.text, 350) ||
      (pack.sentence.text.match(/_____/g) ?? []).length !== 1 ||
      /_{6}/.test(pack.sentence.text) ||
      new RegExp(`\\b${question.entry.word}\\b`, "i").test(
        pack.sentence.text,
      ) ||
      !alternatives(pack.sentence.alternatives))
  )
    return false;
  return true;
}

async function fetchQuestion(question: ReviewQuestion): Promise<Reply> {
  const key = JSON.stringify([
    question.entry.word.toLowerCase(),
    normalize(question.entry.definition),
  ]);
  const known = cached.get(key);
  if (known && known.expires > Date.now()) return known.reply;
  const active = pending.get(key);
  if (active) return active;
  const request = localCall<Reply>(
    "wordQuiz",
    [question.entry.word, question.entry.definition],
    25000,
  )
    .then((reply) => {
      if (cached.size >= 500) cached.delete(cached.keys().next().value!);
      cached.set(key, {
        reply,
        expires: Date.now() + (reply.status === "ready" ? 86400000 : 60000),
      });
      return reply;
    })
    .catch(() => ({ status: "unavailable" }))
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

export async function prepareQuiz(questions: ReviewQuestion[]) {
  const failures: string[] = [];
  const prepared = await Promise.all(
    questions.map(async (question) => {
      if (hasAuthoredChoices(question.entry)) return question;
      const reply = await fetchQuestion(question);
      if (
        reply.status === "ready" &&
        reply.question &&
        validPack(reply.question, question)
      ) {
        return makeQuestion(
          question.entry,
          question.requestedKind ?? question.kind,
          question.retry,
          Math.random,
          reply.question,
        );
      }
      failures.push(reply.status === "ready" ? "unavailable" : reply.status);
      return question;
    }),
  );
  const notice = !failures.length
    ? ""
    : failures.includes("not-configured")
      ? "AI questions aren't configured yet. New words use standard choices for now."
      : failures.includes("limit")
        ? "The AI limit was reached. Some words use standard choices for this round."
        : "Some words use standard choices because clearer questions aren't available right now.";
  return { questions: prepared, notice };
}
