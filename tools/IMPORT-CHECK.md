# Caffeine Import Preflight

From the repository root, install dependencies with `corepack pnpm install`,
then run `corepack pnpm check:import` before publishing.

The check compiles the native Motoko backend, checks stable compatibility,
regenerates frontend bindings from the compiled Candid, runs a fresh full
TypeScript check and the frontend Biome check, then builds the production UI.
Windows uses the installed Ubuntu WSL environment; Linux runs the same backend
build script directly. This is a local preflight, not a Caffeine deployment.

Keep `src/frontend/src/mocks/backend.ts` compatible with `backendInterface`
even though the live app uses the native backend. Caffeine typechecks the
preview fixtures too. For example, all mock `GameState` objects must include
`wordLength`; newly added backend methods must be represented explicitly.
Unsupported preview methods should fail clearly, not simulate persistence.

Do not validate against old checked-in bindings alone: Caffeine regenerates
them during import and can expose errors that a stale local contract hides.
The bindgen dependency is pinned so this check does not depend on a global CLI.

The preflight does not need or publish API keys. Private local state and
environment files must remain ignored. Production secrets belong in the
backend environment, never in frontend code or a public repository.
