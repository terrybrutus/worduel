import { ArrowRight, Check, Flame, RotateCcw, Trophy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type ReviewQuestion, retryQuestion } from "../lib/reviewQuiz";
import { AppButton } from "./AppButton";
import { MeaningAttribution } from "./MeaningAttribution";

interface Props {
  questions: ReviewQuestion[];
  source: string;
  busy?: boolean;
  onReview: (word: string, remembered: boolean) => boolean;
  onEnd: () => void;
  onAgain: () => void;
}

export function ReviewQuiz({
  questions: initialQuestions,
  source,
  busy = false,
  onReview,
  onEnd,
  onAgain,
}: Props) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [baseCount] = useState(questions.length);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [remembered, setRemembered] = useState(0);
  const [recovered, setRecovered] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const question = questions[index];
  const answered = selected !== null;
  const correct = selected === question?.answer;
  useEffect(() => {
    if (question || index === questions.length) heading.current?.focus();
  }, [question, index, questions.length]);
  const choose = (choice: string) => {
    if (!question || answered) return;
    const right = choice === question.answer;
    if (!question.retry && !onReview(question.entry.word, right)) return;
    setSelected(choice);
    const nextStreak = right ? streak + 1 : 0;
    setStreak(nextStreak);
    setBest((previous) => Math.max(previous, nextStreak));
    if (question.retry) {
      if (right) setRecovered((value) => value + 1);
    } else if (right) setRemembered((value) => value + 1);
    else setQuestions((items) => [...items, retryQuestion(question)]);
  };
  return (
    <section
      aria-label="Quick word quiz"
      className="border-y border-border py-5"
      data-ocid="word_bank.quiz"
    >
      {question ? (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            {source} - {baseCount} {baseCount === 1 ? "word" : "words"}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted-foreground">
              {question.retry
                ? `Another look - ${index - baseCount + 1} of ${questions.length - baseCount}`
                : `Question ${index + 1} of ${baseCount}`}
            </p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Flame size={16} className="text-primary" aria-hidden="true" />
                {streak} streak
              </span>
              <AppButton
                className="px-2 text-muted-foreground hover:text-foreground"
                onClick={onEnd}
              >
                End round
              </AppButton>
            </div>
          </div>
          <progress
            aria-label="Round progress"
            max={questions.length}
            value={index + (answered ? 1 : 0)}
            className="mt-2 h-1.5 w-full accent-primary"
          />
          <p className="mt-5 text-xs font-semibold uppercase text-primary">
            {question.kind === "meaning"
              ? "Meaning Match"
              : "Finish the Sentence"}
          </p>
          {question.aiGenerated && (
            <p className="mt-1 text-xs text-muted-foreground">
              AI-assisted question
            </p>
          )}
          <h2
            ref={heading}
            tabIndex={-1}
            className="mt-2 break-words text-2xl font-bold outline-none"
          >
            {question.kind === "meaning"
              ? question.entry.word.toUpperCase()
              : question.prompt}
          </h2>
          {question.kind === "meaning" && (
            <p className="mt-2 text-sm text-muted-foreground">
              {question.prompt}
            </p>
          )}
          <fieldset className="mt-5 grid gap-3" aria-label="Answer choices">
            {question.choices.map((choice, i) => {
              const isAnswer = answered && choice === question.answer;
              const isMiss = answered && selected === choice && !isAnswer;
              return (
                <AppButton
                  key={choice}
                  disabled={answered}
                  onClick={() => choose(choice)}
                  aria-pressed={selected === choice}
                  className={`flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm leading-relaxed transition-colors disabled:cursor-default ${isAnswer ? "border-green-500 bg-green-500/10" : isMiss ? "border-destructive bg-destructive/10" : "border-border enabled:hover:border-primary enabled:hover:bg-primary/5"}`}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-current/25 font-semibold"
                    aria-hidden="true"
                  >
                    {isAnswer ? (
                      <Check size={16} />
                    ) : isMiss ? (
                      <X size={16} />
                    ) : (
                      String.fromCharCode(65 + i)
                    )}
                  </span>
                  <span
                    className={`min-w-0 flex-1 break-words ${question.kind === "sentence" ? "font-semibold" : ""}`}
                  >
                    {choice}
                  </span>
                  {isAnswer && <span className="sr-only">Correct answer</span>}
                </AppButton>
              );
            })}
          </fieldset>
          {answered && (
            <div className="mt-5" data-ocid="word_bank.quiz_feedback">
              <output className="block font-semibold">
                {correct
                  ? question.retry
                    ? "You got it this time."
                    : streak >= 3
                      ? `${streak} in a row!`
                      : "That's it!"
                  : question.retry
                    ? "Still a little new. We'll keep it ready for review."
                    : "Not quite. You'll get another look."}
              </output>
              {!correct && selected && question.explanations?.[selected] && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {question.explanations[selected]}
                </p>
              )}
              <p className="mt-2 text-sm">
                <strong className="uppercase">{question.entry.word}</strong> -{" "}
                {question.entry.definition}
              </p>
              {question.entry.example && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Example: {question.entry.example}
                </p>
              )}
              <MeaningAttribution {...question.entry} />
              <AppButton
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground"
                onClick={() => {
                  setIndex((value) => value + 1);
                  setSelected(null);
                }}
              >
                {index + 1 === questions.length
                  ? "See results"
                  : "Next question"}
                <ArrowRight size={16} />
              </AppButton>
            </div>
          )}
        </>
      ) : (
        <>
          <Trophy className="h-8 w-8 text-primary" aria-hidden="true" />
          <h2
            ref={heading}
            tabIndex={-1}
            className="mt-3 text-2xl font-bold outline-none"
          >
            {baseCount
              ? "Round complete"
              : "Let's use flashcards for these words"}
          </h2>
          {baseCount > 0 && (
            <>
              <p className="mt-3 text-lg">
                {remembered} remembered - {baseCount - remembered} worth another
                look
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Best streak: {best}
                {recovered ? ` - ${recovered} picked up on retry` : ""}
              </p>
              {baseCount > remembered && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Missed words stay ready for another review in 10 minutes.
                </p>
              )}
            </>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {baseCount > 0 && (
              <AppButton
                onClick={onAgain}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
              >
                <RotateCcw size={16} />
                Play another round
              </AppButton>
            )}
            <AppButton
              onClick={onEnd}
              className="rounded-md border border-border px-4 py-3 font-semibold"
            >
              Back to Word Bank
            </AppButton>
          </div>
        </>
      )}
    </section>
  );
}
