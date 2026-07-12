# kodo-sdks

Public customer-facing SDKs for the [Kodo](https://kodo.co) platform.

## Packages

| Package | Description |
| --- | --- |
| [`@kodo-x/analytics-browser`](packages/analytics-browser) | Browser JavaScript SDK for analytics event tracking and profile identification |
| [`@kodo-x/analytics-node`](packages/analytics-node) | Node.js SDK for backend analytics event tracking and profile identification |
| [`@kodo-x/analytics-react`](packages/analytics-react) | React SDK (Provider + hook) wrapping `@kodo-x/analytics-browser` |
| [`@kodo-x/analytics-react-native`](packages/analytics-react-native) | React Native SDK for mobile analytics event tracking and profile identification |

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
npm run publish:analytics-node
npm run publish:analytics-react
npm run publish:analytics-react-native
# or
./scripts/publish.sh analytics-browser
./scripts/publish.sh analytics-node
./scripts/publish.sh analytics-react
./scripts/publish.sh analytics-react-native
```

Scoped packages are published with `--access public`.
