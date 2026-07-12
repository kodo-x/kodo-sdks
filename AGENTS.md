# AGENTS.md

## Cursor Cloud specific instructions

This repo (`kodo-sdks`) is an **npm workspaces monorepo** of customer-facing client SDKs
(`packages/analytics-browser`, `analytics-node`, `analytics-react`, `analytics-react-native`).
There is **no server, database, or local backend** in this repo — the SDKs are libraries that
customers install into their own apps.

Dependencies are installed with `npm install` at the repo root (see `README.md`). `.npmrc` sets
`legacy-peer-deps=true`, so use `npm` (not pnpm/yarn).

### Build
- Only `analytics-react` has a build step: Babel `src/` → `dist/`.
  Run with `npm run build -w @kodo-x/analytics-react`. It also runs automatically on `npm install`
  via that package's `prepare` script. The other three packages ship prebuilt (no build).

### Lint / Test
- There is **no lint configuration** (no ESLint/Prettier config anywhere).
- There are **no real tests**. Every package's `test` script is a placeholder
  (`echo "Error: no test specified" && exit 1`), so `npm test` intentionally fails.

### Running / verifying the SDKs (non-obvious)
- All SDKs POST to the **hardcoded** production endpoint `https://integration.api.kodo.co`
  (e.g. `event/ingest`, `profile`) with an `Authorization: Bearer <apiKey>` header. The endpoint is
  **not configurable** via env var or option.
- Real end-to-end tracking therefore requires network egress to that host **plus a valid Kodo API
  key**. Without a valid key the SDK methods only `console.error` and return.
- To exercise the SDKs offline (no key/network), intercept HTTP at the transport layer with a tool
  like `nock` — because the URL is hardcoded, you cannot point the SDK at a local mock server by
  configuration. Example: instantiate `Kodo` from `packages/analytics-node`, set up a `nock`
  interceptor for `https://integration.api.kodo.co`, then call `track()` / `identify()` and assert
  on the captured request body + auth header.
