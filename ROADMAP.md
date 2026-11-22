# WORDUEL Roadmap

## Account Sign-In: November 21, 2026

Google and Microsoft sign-in now use Caffeine core-infrastructure 2.x, with a
passkey fallback under Other sign-in options. Guest play remains available.
The backend validates identity ownership and atomically transfers guest words,
review metadata, stats, history, active rooms, and daily/replay runs. Existing
accounts combine guest progress without counting the same transfer twice.
Word Bank syncing uses private typed endpoints with revision conflict detection.
No external auth service or email database was added; emails are not collected.

Native Wasm tests cover account isolation, retries, concurrent transfers, daily
progress, 1000-word banks, token expiry, and persistent upgrades. Browser tests
cover cancellation, transfer, reload, two-browser restoration/sync and sign-out
isolation, using a signed test identity with the external consent UI replaced.
Actual Google/Microsoft consent must still be checked on the imported live HTTPS
app. See `tools/ACCOUNT-SIGN-IN.md`. Word packs remain deferred.

## Earlier Guest Continuity Findings: November 21, 2026

The app now uses the native Caffeine backend (the older local-only snapshot
below predates that port). Returning visitors reuse a browser-stored guest
session token. Guest records have separate backend data, but tokens expire
after 30 days. Clearing storage, changing devices/browsers, or an isolated
home-screen installation can create a new guest identity. Ordinary refreshes
were tested to preserve the same guest. This is not permanent account recovery.

Login was on hold at that point. The account work above now prioritizes recovering and
merging guest Word Bank, stats, and history into a verified identity without
silently losing progress. Also plan guest-record retention/cleanup; anonymous
record creation must not be presented as durable cross-device account storage.

## Local Status: November 20, 2026

This snapshot describes the unpushed local preview, not a verified public release.
The historical "Progress Shipped" section below records earlier UI iterations;
an entry point or preset is not proof of a complete server-backed feature.

Working locally: login-free solo testing, live same-Wi-Fi versus/co-op with
5/6/7-letter boards, private invitations with QR codes, rematches, hidden opponent
letters, responsive match layout, submitted-word lookup, device-local Word Bank,
review scheduling, flashcards, mixed quizzes, selection counts, and sample words.

### Next To Finish

1. Private server-side AI is now configured. Live definition simplification and
   repeat-lookup caching passed. Live quiz drafts exposed ambiguity, so a separate
   reviewer now screens the choices; rejected drafts fall back rather than mark a
   reasonable answer wrong. Both generation and review share request limits and
   caching. More real generated-question quality testing remains necessary; an AI
   reviewer is still not a guarantee of semantic correctness.
2. Make real multiplayer reachable outside the local Wi-Fi. The current Node/Vite
   game service is for local testing; production backend parity, upgrades, durable
   hosting, and deployment tests remain release work, including longer-word play.
3. Add proper accounts/email verification, username editing, and cloud syncing
   for Word Bank/progress/stats. Login remains on hold. Current Word Bank data is
   browser-local, not an account-backed cloud collection.
4. Shared Daily Duel and asynchronous replay challenges now work locally for
   5/6/7 letters. They persist independent player boards, reveal comparison scores
   only after finishing, keep recent challenges, and support UTC daily streaks.
   Links last 30 days and still require this local server. Production hosting,
   account-linked history, and public leaderboards remain pending.
5. Add player-chosen valid dictionary words for opponents.
6. Add custom word packs, persistent private group/classroom rooms, host controls,
   leaderboards, and tournaments. Word packs and hosting remain deferred.
7. Validate a paid offering, then implement subscriptions, entitlements, and group
   reporting. Nothing here is a live paid service.
8. Complete physical-device/browser testing and public-release checks. Prepare an
   updated Mac local setup and LinkedIn portfolio walkthrough when requested.

### Optional Ideas Preserved, Not Required For The Next Release

- Friend challenges built from shared saved-word quizzes.
- A genuinely separate bluff-definition social mode; ordinary multiple choice
  is not that multiplayer mode.
- An optional teacher-style opponent, not the removed cosmetic computer pace.
- Cosmetics, themed packs, branded events, and richer host/group learning reports.
- Portfolio framing: a competitive word game with optional word discovery and
  review, rather than claiming a Wordle win alone demonstrates vocabulary mastery.

## Product Direction

WORDUEL should grow as a competitive and social word game, not as a cash-prize wagering product. Real-money head-to-head payouts would create strong cheating incentives because players can screenshot boards and use AI or solver apps. Paid value should come from hosting, personalization, education, custom content, and polished group experiences.

## First Six Priorities

1. Fix broken fundamentals: gameplay submission, validation, build scripts, deploy configuration, formatting, and basic auth/security hygiene.
2. Add async challenge links so one player can complete a board and send a replayable challenge to another player.
3. Add Daily Duel with shared daily puzzles, friend leaderboards, streaks, and recurring return reasons.
4. Improve end screens with definitions, share cards, rematch prompts, result comparisons, and clean "what happened" summaries.
5. Add custom rooms with room-specific word packs, friend/family/class groups, room leaderboards, and recurring challenges.
6. Test paid Pro Rooms or Tournament Host features after the game has repeat usage.

## Progress Shipped

- Fundamentals: restored backend dictionary validation, preserved frontend/backend checks, and reveal answers once the player has reached a finished outcome.
- Async challenge links: private invite links are now surfaced as a first-class "Send Challenge" entry point.
- Daily Duel: added a Daily Duel quick-start entry point for same-day challenge framing.
- End screens: added answer reveal fallback, word notes, and share-result copy.
- Custom rooms: added room presets for classic, daily, family, classroom, and tournament framing.
- Paid path: added Pro Rooms / Tournament Host preview cards for custom packs, leaderboards, and host controls without real-money winner payouts.

## Features To Preserve For Later

- Player-chosen words: each player picks a valid dictionary word for the opponent to guess.
- Custom word packs: couples, office, school vocabulary, sports, book clubs, faith/community, and private user-created packs.
- Definitions: show the answer definition after a game, especially for obscure words.
- Education mode: teachers or tutors can create vocabulary packs, classroom rooms, student leaderboards, and practice assignments.
- Tournament mode: bracket or league play, invite links, daily rounds, host controls, and room branding.
- Cosmetics: themes, tile animations, badges, victory effects, and profile flair without pay-to-win mechanics.
- Anti-cheat posture: avoid monetizing direct winner payouts unless there is a real anti-cheat system. Prefer trust-light mechanics such as paid hosting, paid packs, and paid analytics.

