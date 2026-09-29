# Changelog

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
