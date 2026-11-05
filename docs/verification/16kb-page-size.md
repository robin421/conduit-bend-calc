# 16 KB page size verification (local box build)

- Date: 2026-11-05 America/Chicago
- APK: android/app/build/outputs/apk/release/app-release.apk (debug-signed, for alignment only)
- Expo 53.0.27 / RN 0.79.6 / AGP 8.8.2 / NDK 28.2.13676358

## zipalign
```
zipalign -c -P 16 -v 4 app-release.apk
Verification successful
```

## check_elf_alignment.sh
```
ELF Verification Successful
No UNALIGNED arm64-v8a / x86_64 libs
```

## llvm-readelf LOAD Align (sample)
```
All arm64-v8a and x86_64 .so LOAD Align = 0x4000 (16 KB)
Including: libreactnative.so, libhermes.so, libexpo-modules-core.so, librnscreens.so, ...
```

## Tests
- npm test: 235 passed / 0 failed
- npm run typecheck: clean

## Package id
Restored to `com.robin421.conduitbendcalc` to match Play Console (app id 4975842102456686420). Git history shows this repo originally shipped that id; `com.kaipu.conduitbendcalc` was introduced 2026-10-01 and caused EAS to mint a new keystore (`VVLMMJXcl4`), separate from the pre-rename credentials (`0oYi3dOSbt`).
