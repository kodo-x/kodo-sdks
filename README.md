# kodo-sdks

Public customer-facing SDKs for the [Kodo](https://kodo.co) platform.

## Packages

| Package | Description |
| --- | --- |
| [`@kodo-x/analytics-browser`](packages/analytics-browser) | Browser JavaScript SDK for analytics event tracking and profile identification |

## Development

This is an npm workspaces monorepo. From the repo root:

```bash
npm install
```

Each package lives under `packages/` and can be published independently to the `@kodo-x` npm org.

## Publishing

1. Log in to npm with an account that can publish to `@kodo-x`:

```bash
npm login
```

2. Bump the package version in its `package.json` if needed.

3. Publish:

```bash
npm run publish:analytics-browser
# or
./scripts/publish.sh analytics-browser
```

Scoped packages are published with `--access public`.
