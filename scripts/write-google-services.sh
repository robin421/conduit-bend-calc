#!/usr/bin/env bash
#
# T2: materialize google-services.json from an EAS Secret at build time.
#
# google-services.json must never be committed (see .gitignore). This script is
# invoked by the `eas-build-pre-install` lifecycle hook (package.json) so the
# file exists before `npx expo prebuild` runs and the @react-native-firebase/app
# config plugin can pick it up.
#
# The secret is base64-encoded so it survives env-var transport unchanged.
# The decoded content is never printed to stdout/stderr.
#
# Fail-closed: an empty/missing variable or a decode failure exits non-zero.

set -euo pipefail

if [[ -z "${GOOGLE_SERVICES_JSON_B64:-}" ]]; then
  echo "ERROR: GOOGLE_SERVICES_JSON_B64 is unset or empty." >&2
  echo "Create the EAS Secret for the preview and production profiles before building." >&2
  echo "Refusing to continue: google-services.json cannot be created." >&2
  exit 1
fi

target="$(pwd)/google-services.json"

# GNU coreutils (EAS Linux builders) uses --decode; BSD/macOS uses -D.
if ! printf '%s' "$GOOGLE_SERVICES_JSON_B64" | base64 --decode >"$target" 2>/dev/null; then
  if ! printf '%s' "$GOOGLE_SERVICES_JSON_B64" | base64 -D >"$target" 2>/dev/null; then
    rm -f "$target"
    echo "ERROR: failed to base64-decode GOOGLE_SERVICES_JSON_B64." >&2
    exit 1
  fi
fi

if [[ ! -s "$target" ]]; then
  rm -f "$target"
  echo "ERROR: decoded google-services.json is empty." >&2
  exit 1
fi

# A Firebase client for another applicationId must never reach prebuild.
if ! node <<'NODE'
const fs = require('node:fs');
try {
  const packageName = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo.android.package;
  if (packageName !== 'com.robin421.conduitbendcalc') throw new Error();
  const services = JSON.parse(fs.readFileSync('google-services.json', 'utf8'));
  if (!Array.isArray(services.client) || !services.client.some(client =>
    client?.client_info?.android_client_info?.package_name === packageName)) throw new Error();
} catch {
  console.error('ERROR: Play applicationId or Firebase Android client does not match com.robin421.conduitbendcalc.');
  process.exit(1);
}
NODE
then
  rm -f "$target"
  exit 1
fi

chmod 600 "$target"
echo "google-services.json written from GOOGLE_SERVICES_JSON_B64."
