# Changelog

## v1.7.2 — Electrician tool-brand theme + GA4 on the SEO tool pages

### UI redesign (light + dark)
- New palette in `src/theme.ts`: charcoal `#1A1A1A` primary, electric
  orange `#FF6B00` accent, `#F8F9FA` cards, `#1A1A1A` / `#6B7280` text,
  `#16A34A` success, `#DC2626` error, `#E5E7EB` border. The former navy
  and warning-gold are fully removed (adaptive icon background too).
- Dark mode adjusted: elevated charcoal `#2E2E2E` surface, lighter orange
  `#FF8533`, otherwise unchanged neutral greys.
- Derived accessibility tokens to keep WCAG AA on every surface:
  `primaryText` (dark-mode text/icon) and `accentText` (`#C2410C` on light
  backgrounds where `#FF6B00` text would only reach ~2.9:1).
- The 4 SEO tool pages and the home screen pick the new palette up through
  `theme.ts`; no per-screen hardcoded colors were added.

### GA4 coverage on the new tool pages
- `src/lib/analytics.ts`: adds `trackSeoToolCalculate` (`calculate`),
  `trackSeoToolUnitChange` (`unit_change` with `from`/`to`/`tool_name`),
  `trackSeoToolFaqExpand` (`faq_expand`) and `trackInternalLinkClick`
  (`internal_link_click`), all guarded by the existing no-throw `trackEvent`.
- Each of `/offset`, `/4-point-saddle`, `/shrink`, `/stub-up` now calls
  `useCalculatorAnalytics` (open + completed) and
  `useSeoToolCalculateAnalytics` (valid-result signature → `calculate`).
- FAQ is now an accordion; expanding a question fires `faq_expand`. The
  unit toggle fires `unit_change`. The "More free tools" links fire
  `internal_link_click` with `from`/`to`.
- Measurement ID stays build-time only: `G-Z6L51MPY1J` is injected by
  `scripts/inject-web-seo.py` (never hardcoded). The injector now also
  back-fills the gtag snippet into the 4 SPA tool shells so `/offset` etc.
  load GA4 regardless of the shell/inject build order.

## v1.7.1 — SEO tool pages (P0, web)

Four standalone, interactive SEO tool pages at `bendcalc.wattflow.net`,
built with the existing React Native + Expo web stack (no new UI deps beyond
Expo's required web packages).

### Routes
- `/offset` — conduit offset calculator (rise + angle → mark spacing, shrink,
  both mark locations).
- `/4-point-saddle` — 4-point saddle (height + width + angle → all four marks,
  total span, total shrink).
- `/shrink` — shrink calculator with offset / 4-point saddle mode.
- `/stub-up` — 90° stub-up (target height + EMT size → mark location + take-up
  chart).

### Implementation
- Root native-stack (`src/navigation/rootStack.tsx`) adds the four screens
  above `RootTabs`; web-only `linking` config (`src/navigation/rootLinking.ts`)
  parses the URL. Native behavior is unchanged (linking is disabled off web).
- Screen + content are one source of truth (`src/seo/toolPages.ts`), reused by
  `scripts/gen-seo-tool-shells.ts` to stamp per-route static HTML shells
  (`dist/<slug>/index.html`) with independent title/description/canonical,
  Open Graph/Twitter tags, and `WebApplication` + `FAQPage` JSON-LD.
- Design follows `theme.ts` / `DESIGN.md`: 8pt radius, no shadow/gradient,
  40pt tabular-nums navy result card, min 44–56pt touch targets. All math uses
  `src/constants.ts` and the existing calculators; inputs validate via the
  shared `ImperialInput` (fraction / decimal / metric).
- The fixed download banner is hidden on these four routes (MVP: validate
  organic traffic first, no "Get the App" pitch).
- Sitemap (`scripts/inject-web-seo.py`) now lists the four new URLs.

### Build pipeline (web deploy)
```
npm run web:export
node scripts/gen-seo-tool-shells.ts dist https://bendcalc.wattflow.net
python3 scripts/inject-web-seo.py dist https://bendcalc.wattflow.net [--ga4-id G-XXXX]
python3 scripts/gen-seo-pages.py  dist https://bendcalc.wattflow.net
```

## v1.6.0 — Free/Pro value redefinition

Free = a fast professional conduit bending calculator. Pro = a bending assistant
calibrated to the tool actually in your hand.

### P0-1 Free/Pro repartition + Metric
- All six bend types, fraction I/O, bend marks, shrink/multiplier, standard
  deducts, base diagrams and offline calculation are now Free. The only
  calculator paywall trigger on the home screen was removed.
- Basic Metric support: unit switch (Inches / Metric) persisted locally, mm/cm/m
  input parsing, mm result display; all math still runs in inches.
- Removed unused legacy `src/calculators/stub/stub.ts`; engine regression tests
  retained.

### P0-2 BenderProfile (multi-profile)
- New `BenderProfile` model: id, name, brand, model, conduitType, conduitSize,
  nominalDeduct, actualDeduct, bendRadius, gain, calibrationOffset,
  calibrationDate, source (`standard` | `custom` | `calibrated`).
- Built-in Standard presets (Free) plus multiple user "My Bender" profiles (Pro),
  stored in AsyncStorage (`bendcalc:bender-profiles:v1`). Selecting a profile
  applies its calibrated parameters automatically to every calculator.
- One-time migration from the old single spec (`@cbc:bender-spec-v1`) and custom
  spec list into a `source: 'custom'` "My Bender (migrated)" profile; old keys are
  kept for rollback.

### P0-3 Guided Calibration
- New field flow: pick conduit → mark 12 in from the end → bend a 90° stub →
  enter the measured stub height → reverse Actual Deduct (S − 12) and an
  estimated Actual Radius → [ Save Bender ].
- Users never touch deduct/radius/gain math. The previous 3-step parameter page
  is kept as "Advanced calibration". Pro feature.

### P0-4 Expected → Actual closed loop
- Result pages accept expected vs actual feedback and adjust the profile's
  calibration correction; the measured result then changes on later calculations.
  Undo and Reset Calibration supported.

### P0-5 Feasibility Engine
- Three-state check (✓ feasible / ⚠ tight / ✕ impossible) covering overlapping
  marks, tight straights, minimum stub, stock-length and remaining margin, plus
  suggestions (try a smaller angle / Minimum conduit required = developed
  length + 2 in). Pro sees the full panel; Free sees one risk hint and
  [ Check Bend Feasibility ].

### P0-6 Paywall rewrite + result hierarchy
- Paywall: "Bend It Right the First Time", calibration/accuracy/waste-reduction
  benefits, Pro Lifetime (`cbc_pro_lifetime`). "More calculators" messaging
  removed.
- Result pages show `Using My <name>` for a calibrated bender, or
  `Calculated using standard bender values.` + [ Calibrate My Bender ].
