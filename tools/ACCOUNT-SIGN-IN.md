# Caffeine Account Sign-In

Worduel uses Caffeine core-infrastructure 2.x directly for Google and Microsoft
sign-in. No separate auth service, OAuth client secret, or email database is used.
The plain passkey option stays under Other sign-in options. Identity provider
pages are hosted by Caffeine's identity infrastructure, not Worduel.

The app requests no identity attribute bundle (`withAttributes={false}`), so it
does not collect email/name claims. `_initialize_access_control` accepts signed
callers but grants no roles; administrators still require controller provisioning.
Account ownership is the verified delegated principal, not an entered email or
public username. Use the same provider/account on each device. Google and
Microsoft accounts are not automatically combined just because emails match.

`signInAndCarryGuest` validates a live guest token and the signed caller, then
atomically merges server words, unsynced local words, stats, history, active
rooms, and challenge runs into the identity's account. Existing accounts keep
their username. Guest claim markers make retries idempotent and prevent another
identity from reclaiming the guest. Disabled guest tokens cannot access data.
An expired guest token cannot prove ownership of its old stats; remaining local
words are retained, and the UI reports this limitation rather than inventing a
successful stats transfer.

Word Bank synchronization uses typed Candid endpoints with compare-and-swap
revisions. Large word arrays are decoded one record at a time using the existing
JSON parser to avoid its recursive wide-array limit. Limits are 1000 words,
500,000 characters total, 16,384 characters per record, and bounded nesting; nothing is silently
truncated. Account sign-in can recover after a 30-day application token expiry
by proving the identity again. Clearing browser storage does not delete the
backend account.

## Verification

- `corepack pnpm check:import`: compile, stable compatibility, fresh bindings,
  full TypeScript, Biome, production build.
- `wsl -d Ubuntu --exec node tools/native-backend/account-transfer-test.mjs`:
  real Wasm privacy, transfers, retry/concurrency, daily progress, capacity,
  1000-word bank, account restoration, and persistence across upgrade.
- `node tools/account-sign-in-test.cjs`: browser account lifecycle, cancellation,
  guest transfer, two browser contexts, synchronization, and sign-out isolation.
  Set `WORDUEL_PLAYWRIGHT_MODULE` to an installed Playwright module if needed.
  This test replaces the external provider UI, but calls the real local canister
  with a signed test identity. It does not verify a real Google/Microsoft login.

The actual SDK buttons were also checked without that substitute: Google opened
accounts.google.com and Microsoft opened login.microsoftonline.com. No account
credentials or consent were entered in that check.

After importing to Caffeine, test real Google and Microsoft sign-in on the live
HTTPS URL. That provider consent flow requires a human account and is not
claimed as verified by the automated tests. Caffeine supplies `II_URL` and
`II_CANISTER_ID`; no client ID/secret should be pasted into this repository.
Local OAuth testing should use `http://localhost:43992`, not an insecure LAN IP.
