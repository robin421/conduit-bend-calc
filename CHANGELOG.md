# Changelog

## v1.7.4 — WattFlow brand unification + information hierarchy (T64)

### Brand chrome (home + the 4 SEO tool pages)
- New `src/seo/brand.ts` is the single source for the brand name `WattFlow`,
  the `⚡` glyph, product name `Conduit Bend Calc`, the footer line
  `Built by WattFlow for field crews.`, the electric-orange brand color and the
  ` | WattFlow` title suffix (`withBrandTitle`, idempotent).
- New `WattFlowBrandBar` (`⚡ WattFlow | Conduit Bend Calc`) is rendered as
  content on every SEO tool page and as the native-stack `headerTitle` for the
  home screen (`calcStack.tsx`), so both share the same brand elements. The
  previous `BendCalc` home header title is gone.
- Every SEO page now has a horizontally scrollable calculator switcher
  (`CalculatorSwitcher`) driven by `src/seo/calculatorNav.ts` (single source:
  paths/screens come from `toolPages.ts` + `seoRoutes.ts`). Narrow screens
  scroll; ≥600pt they wrap. The active tool gets an orange underline + orange
  text; the rest are grey. Web renders real `<a href>` links (crawlable +
  unit selection preserved through the shared `unitStore`).
- `<title>` suffix unified: `Conduit Offset Calculator — Spacing & Shrink |
  WattFlow`, all four now ≤ 60 chars; home title and `og:site_name`/`WattFlow`
  updated in `gen-seo-tool-shells.ts` and `inject-web-seo.py`.

### Information hierarchy (L1–L4)
- **L1** input + result now live inside one `SeoWorkspace` block (white panel,
  hairline border); the result card is the page anchor with a **40pt** white
  number on charcoal.
- **L2** unit toggle / angle or size presets / recent history stay right under
  L1; the redundant `Bend angle` / `Conduit size` text labels were removed (the
  chips carry their own hints + `accessibilityLabel`s).
- **L3** explanation paragraphs and multiplier/take-up charts moved below the
  result into `SeoCollapsibleSection`: light-grey background, smaller grey
  heading, **collapsed by default**.
- **L4** FAQ is a grey accordion with 14pt grey questions and grey 14pt answers.
- Decorative text removed; separators use the lightest border token.
- First-screen (390px) budget re-documented in each screen file: brand chrome
  ≈132pt + workspace ≈506–554pt ≈ **646–694pt**, under the ~700pt Safari
  viewport; L3/L4 never appear above the fold.

### Tests
- `src/seo/brand.test.ts` (constants, `withBrandTitle` idempotence, branded
  titles ≤ 60) and `src/seo/calculatorNav.test.ts` (switcher covers the four
  tools + home, paths/screens match the single source). 274 tests pass.

> Scope note: the switcher intentionally lists only routes that exist in the
> frozen URL structure (the four interactive tools + `All calculators` → `/`).
> Kick / Rolling / native-only calculators are reachable through home; no new
> URLs were added (brief III).

## v1.7.3 — Mobile hard metrics + field-use conveniences on the SEO tool pages

### First-screen (390px) golden path
- The 4 tool pages (`/offset`, `/4-point-saddle`, `/shrink`, `/stub-up`) now
  show **input → Calculate → result** without scrolling: compact spacing
  (`SeoPage` 12pt padding/gap), 24pt h1, 48pt unit toggle/inputs, a single
  row of angle buttons (30°/45° as larger presets), an explicit orange
  **Calculate** button, and a compact result card (32pt headline, merged mark
  rows). The offset page's optional start position is collapsed by default.
  Layout math is documented at the top of each screen file.
- `SeoCalcLayout` switches input/result to two columns in landscape
  (`width ≥ 600 && width > height`) so the calculator does not cram.
- Every interactive element is ≥ 48pt (input, unit segments, angle chips,
  size presets, history rows, copy, FAQ questions, Calculate).
- `ImperialInput` now sets `inputMode` (`numeric` for metric, `decimal` for
  fractional/decimal inches) so phones raise a number pad, not a full keyboard.

### Field-use conveniences
- **Angle / size presets** — `SeoQuickPreset` config (`// v2: preset 接口`)
  drives one-tap 30°/45° angle buttons and the EMT size presets; no dropdown.
- **Recent calculations** — `src/lib/seoHistory.ts` keeps the last 5 per tool
  (AsyncStorage ⇒ localStorage on web, injectable for tests). One tap refills
  every input and re-runs the calculation.
- **Copy result** — `src/lib/copyResult.ts` builds a natural sentence per tool;
  `SeoCopyButton` copies it (`navigator.clipboard` → execCommand → RN
  Clipboard, no new deps) and shows a 2s `aria-live` toast.
- **New GA4 events** — `preset_apply`, `copy_result`, `history_refill`.

### First-screen performance (code splitting)
- Web now lazy-loads `RootTabs` and each tool screen via platform-specific
  `src/navigation/rootStack.web.tsx` (`React.lazy` + Metro async chunks) and
  moves Pro IAP init behind `src/lib/proInit.web.ts` (no-op), so
  `react-native-svg` / `react-native-iap` / the internal calculator screens no
  longer load on the SEO pages.
- Brotli transfer for a tool page: entry ~175KB + screen chunk ~2KB < 200KB
  (was a single ~275KB bundle). Chunks are served by Cloudflare Pages with br.

### Offline
- `src/lib/serviceWorker.ts` registers `/sw.js` on Web (HTTPS/localhost only).
  `scripts/inject-web-seo.py` writes `sw.js` with an **entry-only precache**
  (`/`, `/index.html`, the hashed entry bundle); split chunks are cache-first
  with runtime fill; navigations are network-first with a cached shell fallback.

### Extensibility
- `// v2: preset 接口` and `// v2: 示意图插槽` markers are in place; every
  result card reserves a diagram slot (`SeoResultCard` `diagram` prop).

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
