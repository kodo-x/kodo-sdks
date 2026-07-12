#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PACKAGE_DIR_NAME="${1:-analytics-browser}"
PACKAGE_DIR="$ROOT_DIR/packages/$PACKAGE_DIR_NAME"

if [[ ! -d "$PACKAGE_DIR" ]]; then
	echo "error: package directory not found: packages/$PACKAGE_DIR_NAME" >&2
	echo "usage: $0 [package-dir-name]" >&2
	echo "example: $0 analytics-browser" >&2
	exit 1
fi

PACKAGE_NAME="$(node -p "require('./packages/$PACKAGE_DIR_NAME/package.json').name")"
PACKAGE_VERSION="$(node -p "require('./packages/$PACKAGE_DIR_NAME/package.json').version")"

if ! npm whoami >/dev/null 2>&1; then
	echo "error: not logged in to npm. Run: npm login" >&2
	echo "       ensure your account can publish to the @kodo-x org." >&2
	exit 1
fi

NPM_USER="$(npm whoami)"
echo "Publishing $PACKAGE_NAME@$PACKAGE_VERSION as $NPM_USER"
echo "Access: public"
echo

read -r -p "Continue? [y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
	echo "Aborted."
	exit 0
fi

npm publish -w "$PACKAGE_NAME" --access public

echo
echo "Published $PACKAGE_NAME@$PACKAGE_VERSION"
echo "https://www.npmjs.com/package/$PACKAGE_NAME"
