import type { SavedWordEntry } from "./wordBank";
import { reviewChoices } from "./reviewChoices";

type Kind = "meaning" | "sentence";
export interface GeneratedQuizPack {
  word: string;
  savedDefinition: string;
  alternatives: Array<{ word: string; definition: string }>;
  sentence?: { text: string; alternatives: Array<{ word: string; definition: string }> };
  aiGenerated: boolean;
}
export interface ReviewQuestion {
  entry: SavedWordEntry;
  kind: Kind;
  prompt: string;
  choices: string[];
  answer: string;
  retry: boolean;
  explanations?: Record<string, string>;
  generatedPack?: GeneratedQuizPack;
  aiGenerated?: boolean;
  requestedKind?: Kind;
}

// Authored contexts keep cloze questions unambiguous, without generating new claims.
const contexts: Record<string, { sense: RegExp; sentence: string; others: [string, string] }> = {
  apple: { sense: /fruit|flesh|tree/i, sentence: "Granny Smith is a variety of _____.", others: ["chair", "crane"] },
  bread: { sense: /food|dough|bake|flour|loaf/i, sentence: "The baker sliced a fresh loaf of _____.", others: ["light", "chair"] },
  chair: { sense: /seat|sit|back|furniture/i, sentence: "She pulled up a _____ and sat at the table.", others: ["flame", "dream"] },
  crane: { sense: /machine|lift|hoist/i, sentence: "Workers used a _____ to lift the steel beam onto the roof.", others: ["pillow", "blanket"] },
  brave: { sense: /danger|fear|courage|difficul/i, sentence: "Despite feeling afraid, she was _____ enough to face the danger.", others: ["round", "wooden"] },
  plant: { sense: /living|grow|soil|organism|leaf|leaves/i, sentence: "The green _____ grew new leaves after we watered it.", others: ["chair", "crane"] },
  flame: { sense: /fire|burn|gas|heat/i, sentence: "A small _____ burned at the tip of the candle.", others: ["chair", "apple"] },
  trust: { sense: /belief|confidence|reli|honest/i, sentence: "I _____ you to keep the promise you made.", others: ["slice", "water"] },
  smart: { sense: /quick|intelligen|clever|learn|understand/i, sentence: "She learns new ideas quickly because she is _____.", others: ["wooden", "empty"] },
  quiet: { sense: /noise|silent|sound|calm/i, sentence: "Please stay _____ so we can hear the soft music.", others: ["round", "wooden"] },
  light: { sense: /bright|see|seeing|radiat|illumin/i, sentence: "We needed more _____ to see inside the dark room.", others: ["bread", "pride"] },
  dream: { sense: /sleep|image|thought|vision/i, sentence: "While asleep, I had a _____ about flying.", others: ["chair", "loaf"] },
  pride: { sense: /respect|satisfaction|achievement|pleas/i, sentence: "She felt _____ in the project she had worked hard to finish.", others: ["wood", "bread"] },
  prune: { sense: /plum|dried/i, sentence: "A dried plum is called a _____.", others: ["chair", "crane"] },
  clean: { sense: /dirt|mark|stain|pure/i, sentence: "After we washed away all the dirt, the window was _____.", others: ["hungry", "asleep"] },
  sound: { sense: /hear|heard|noise|vibrat|audib/i, sentence: "We heard the _____ of a bell ringing.", others: ["bread", "chair"] },
  earth: { sense: /planet|world|ground|soil/i, sentence: "The planet we live on is called _____.", others: ["bread", "chair"] },
  fresh: { sense: /new|recent|clean|made|stale/i, sentence: "The bread was still warm because it was _____ from the oven.", others: ["wooden", "asleep"] },
  infer: { sense: /conclu|evidence|reason|deduc/i, sentence: "From the wet pavement, we could _____ that it had rained.", others: ["slice", "decorate"] },
  mitigate: { sense: /less|severe|harm|pain|reduc/i, sentence: "The safety barriers helped _____ the risk of injury.", others: ["celebrate", "decorate"] },
  resilient: { sense: /recover|difficul|change|bounce/i, sentence: "Despite the setback, the _____ team recovered and tried again.", others: ["wooden", "triangular"] },
  photosynthesis: { sense: /plant|light|energy/i, sentence: "Plants use sunlight to make food through _____.", others: ["hibernation", "evaporation"] },
  stakeholder: { sense: /affect|decision|project|interest|group/i, sentence: "A person affected by a project's decisions is a _____.", others: ["lantern", "bicycle"] },
  planet: { sense: /orbit|world|celestial|earth|space|star/i, sentence: "Earth is the _____ we live on.", others: ["bottle", "garden"] },
  garden: { sense: /plant|grow|flower|vegetable|land|plot/i, sentence: "She planted carrots and tomatoes in her _____.", others: ["pillow", "bottle"] },
  bridge: { sense: /cross|river|span|road|valley/i, sentence: "We crossed the river using the _____.", others: ["blanket", "feather"] },
  library: { sense: /book|read|borrow|collection/i, sentence: "I borrowed three books from the _____.", others: ["kitchen", "orchard"] },
  blanket: { sense: /cover|warm|bed|cloth/i, sentence: "He pulled a warm _____ over himself in bed.", others: ["bicycle", "lantern"] },
  bicycle: { sense: /wheel|pedal|cycle|ride|vehicle/i, sentence: "She pedaled her _____ along the cycle path.", others: ["bottle", "castle"] },
  bottle: { sense: /container|liquid|neck|drink|glass/i, sentence: "He unscrewed the cap and poured water from the _____.", others: ["feather", "blanket"] },
  orchard: { sense: /fruit|tree|grow|land/i, sentence: "We picked apples from the trees in the _____.", others: ["library", "kitchen"] },
  feather: { sense: /bird|plumage|wing|quill/i, sentence: "A _____ fell from the bird's wing.", others: ["bottle", "castle"] },
  lantern: { sense: /light|lamp|portable/i, sentence: "We lit a _____ to see inside the dark tent.", others: ["blanket", "bicycle"] },
  kitchen: { sense: /cook|food|room|prepar/i, sentence: "The chef prepared dinner in the _____.", others: ["orchard", "library"] },
  rabbit: { sense: /animal|mammal|ear|hare/i, sentence: "The _____ twitched its long ears and hopped into its burrow.", others: ["dolphin", "feather"] },
  dolphin: { sense: /mammal|sea|marine|animal|aquatic/i, sentence: "A _____ surfaced beside our boat, then swam back into the sea.", others: ["rabbit", "lantern"] },
  thunder: { sense: /sound|noise|lightning|storm/i, sentence: "After the lightning flashed, we heard a loud clap of _____.", others: ["silver", "winter"] },
  winter: { sense: /season|cold|year|autumn|spring/i, sentence: "The coldest season of the year is _____.", others: ["summer", "morning"] },
  summer: { sense: /season|warm|hot|year|spring|autumn/i, sentence: "The warmest season of the year is _____.", others: ["winter", "morning"] },
  morning: { sense: /day|sunrise|noon|early|time/i, sentence: "The time between sunrise and noon is the _____.", others: ["winter", "summer"] },
  teacher: { sense: /teach|instruct|learn|school|educat/i, sentence: "The _____ explained the lesson to the students.", others: ["bicycle", "blanket"] },
  brain: { sense: /organ|thought|think|nervous|memory/i, sentence: "The _____ is the organ inside your skull that helps you think.", others: ["heart", "feather"] },
  heart: { sense: /organ|blood|pump|chest/i, sentence: "The _____ pumps blood around the body.", others: ["brain", "feather"] },
  cheese: { sense: /milk|food|dairy|curd/i, sentence: "Cheddar is a type of _____.", others: ["silver", "thunder"] },
  silver: { sense: /metal|element|argent|ag\b/i, sentence: "The chemical symbol Ag stands for the metal _____.", others: ["cheese", "feather"] },
  castle: { sense: /fort|building|defen|residen|medieval/i, sentence: "The medieval king lived in a fortified _____.", others: ["bottle", "blanket"] },
};

const distractors = [
  { words: /fridge|refrigera|icebox|cold|cool|food|cabinet/i, definition: "An appliance that keeps food cold." },
  { words: /key|lock|door|metal|open/i, definition: "A small shaped object used to unlock a door." },
  { words: /umbrella|rain|canopy|wet|cover/i, definition: "A folding cover held overhead to keep rain off." },
  { words: /mountain|hill|land|earth|high|elevat|peak/i, definition: "A very high natural rise in the land." },
  { words: /whisper|voice|quiet|speak|soft|sound/i, definition: "To speak very softly, without using a full voice." },
  { words: /compass|direct|north|magnet|navigat|instrument/i, definition: "An instrument with a needle that points north." },
  { words: /recipe|cook|food|instruct|prepar|dish/i, definition: "A set of instructions for preparing a dish." },
  { words: /island|water|sea|land|surround/i, definition: "An area of land surrounded by water." },
];

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function hasAuthoredChoices(entry: SavedWordEntry): boolean {
  return Boolean(contexts[entry.word.toLowerCase()]?.sense.test(entry.definition) && reviewChoices[entry.word.toLowerCase()]);
}

export function makeQuestion(entry: SavedWordEntry, kind: Kind, retry = false, random = Math.random, pack?: GeneratedQuizPack): ReviewQuestion {
  if (pack) {
    const sentence = kind === "sentence" ? pack.sentence : undefined;
    const alternatives = sentence?.alternatives ?? pack.alternatives;
    return { entry, kind: sentence ? "sentence" : "meaning", prompt: sentence?.text ?? "Which meaning did you save for this word?",
      answer: sentence ? entry.word.toLowerCase() : entry.definition,
      choices: shuffled([sentence ? entry.word.toLowerCase() : entry.definition, ...alternatives.map(item => sentence ? item.word : item.definition)], random),
      explanations: Object.fromEntries(alternatives.map(item => [sentence ? item.word : item.definition, sentence ? `${item.word}: ${item.definition}` : `That describes ${item.word}.`])),
      retry, generatedPack: pack, aiGenerated: true };
  }
  const context = contexts[entry.word.toLowerCase()];
  const authored = context?.sense.test(entry.definition) ? reviewChoices[entry.word.toLowerCase()] : undefined;
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const related = authored?.alternatives.filter(item => normalize(item.definition) !== normalize(entry.definition));
  if (kind === "sentence" && context && authored && related?.length === 2) {
    return { entry, kind, prompt: authored.sentence ?? context.sentence, answer: entry.word.toLowerCase(),
      choices: shuffled([entry.word.toLowerCase(), ...related.map(item => item.word)], random), retry,
      explanations: Object.fromEntries(related.map(item => [item.word, `${item.word}: ${item.definition}`])) };
  }
  if (related?.length === 2) {
    return { entry, kind: "meaning", prompt: "Which meaning did you save for this word?", answer: entry.definition,
      choices: shuffled([entry.definition, ...related.map(item => item.definition)], random), retry,
      explanations: Object.fromEntries(related.map(item => [item.definition, `That describes ${item.word}.`])) };
  }
  const otherMeanings = distractors.filter(item => !item.words.test(`${entry.word} ${entry.definition}`));
  // These are real meanings for other words, not invented definitions of the target.
  const choices = shuffled(otherMeanings, random).slice(0, 2).map(item => item.definition);
  return { entry, kind: "meaning", prompt: "Which meaning did you save for this word?", answer: entry.definition,
    choices: shuffled([entry.definition, ...choices], random), retry };
}

export function createReviewRound(entries: SavedWordEntry[], random = Math.random): ReviewQuestion[] {
  const unique = [...new Map(entries.filter(entry => entry.word && entry.definition).map(entry => [entry.word.toLowerCase(), entry])).values()];
  const offset = random() < 0.5 ? 0 : 1;
  return unique.map((entry, i) => {
    const requestedKind: Kind = (i + offset) % 2 ? "sentence" : "meaning";
    return { ...makeQuestion(entry, requestedKind, false, random), requestedKind };
  })
    .filter(question => question.choices.length === 3).slice(0, 5);
}

export function retryQuestion(question: ReviewQuestion, random = Math.random): ReviewQuestion {
  const next = makeQuestion(question.entry, question.kind === "meaning" ? "sentence" : "meaning", true, random, question.generatedPack);
  return next.choices.length === 3 ? next : { ...question, retry: true, choices: shuffled(question.choices, random) };
}
