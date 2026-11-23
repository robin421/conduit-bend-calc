# Conduit Bend Calc — Field Case Studies, Community Distribution Playbook & 30-Day Funnel Scorecard (T32)

- **Document Owner**: Growth Lead
- **Created**: 2026-11-23
- **Scope**: Organic acquisition & activation playbook targeting US commercial/industrial electricians, IBEW/non-union apprentices, and US/Mexico bilingual jobsite installers.
- **Data Integrity Standard**:
  - Every bend calculation, multiplier, take-up, deduct, and centerline radius in this document is verified directly against `src/constants.ts`, `src/calculators/offset/offset.ts`, `src/calculators/saddle/saddle.ts`, `src/calculators/geometry/geometry.ts`, and `src/calculators/calibration/calibration.ts`.
  - Baseline numbers come strictly from the verified T29 audit (Play Console + GSC + Amplitude); all forward targets are explicitly labeled as **Growth Hypotheses / Targets**.

---

## 0. Canonical URLs & UTM Attribution Standard

All outbound links from articles, community replies (where permitted), and short-form video descriptions **must** follow this exact UTM taxonomy so traffic flows cleanly across **Amplitude Web** (`Conduit Bend Calc Web`) and **Google Play Console** (`Store analysis → Acquisition reports → UTM`).

### Canonical Web Calculator URLs (Post-T30)
| Tool | Canonical URL | Amplitude Usage Tier |
|---|---|---|
| Offset Calculator | `https://bendcalc.wattflow.net/offset/` | Top 4 (~78% combined) |
| 90° Stub-Up Calculator | `https://bendcalc.wattflow.net/stub-up/` | Top 4 (~78% combined) |
| 3-Point Saddle Calculator | `https://bendcalc.wattflow.net/3-point-saddle/` | Top 4 (~78% combined) |
| Conduit Fill Calculator | `https://bendcalc.wattflow.net/conduit-fill/` | Top 4 (~78% combined) |
| 4-Point Saddle Calculator | `https://bendcalc.wattflow.net/4-point-saddle/` | Core Web Tool |
| Conduit Shrink Calculator | `https://bendcalc.wattflow.net/shrink/` | Core Web Tool |

### Standard UTM Parameter Matrix
| Parameter | Allowed Values | Notes |
|---|---|---|
| `utm_source` | `field_guide`, `reddit`, `electriciantalk`, `mikeholt`, `youtube_shorts`, `tiktok` | Always lowercase `snake_case`. |
| `utm_medium` | `organic_article`, `community_post`, `community_comment`, `short_video` | Distinguishes long-form guides, forum threads, helpful replies, and Reels/Shorts. |
| `utm_campaign` | `t32_offset_6in_30deg`, `t32_stubup_14_3_8_half_emt`, `t32_saddle3_3in_pipe`, `t32_conduit_fill_nec`, `t32_community_cheatsheet` | Maps 1-to-1 to each asset for Day-15 / Day-30 attribution. |

### Google Play Referrer Format (URL-Encoded)
Google Play requires the `referrer` query parameter value to be URL-encoded (`=` → `%3D`, `&` → `%26`):
```text
https://play.google.com/store/apps/details?id=com.robin421.conduitbendcalc&referrer=utm_source%3D<source>%26utm_medium%3D<medium>%26utm_campaign%3D<campaign>
```

---

## 1. Three Ready-to-Publish Worked Electrician Field Case Studies (English)

> **Editorial Standard**: Written in plain jobsite English for commercial electricians and apprentices. Zero fluff, exact tape-measure fractions, explicit bender datum notes, and honest trade caveats. Ready to publish directly as web guides, Medium/Substack/LinkedIn trade articles, or downloadable toolbox PDFs.

---

### Guide 1 (Offset): How to Bend a 6" Offset in 3/4" EMT at 30° Without Coming Up Short (Tape-Measure Marks Step-by-Step)

#### Publication Metadata (Copy-Paste Ready)
- **Suggested Slug**: `/guides/6-inch-offset-3-4-emt-30-degrees/` (or external publication headline)
- **SEO Title** (58 chars): `6" Offset in 3/4" EMT at 30°: Exact Marks & Shrink Guide`
- **Meta Description** (153 chars): `Step-by-step tape-measure marks for a 6" offset in 3/4" EMT at 30°: 12" mark spacing, 1-1/2" shrink allowance, cut-length correction, and dogleg checks.`
- **Target Queries**: `6 inch offset 30 degrees`, `how to bend 6 inch offset 3/4 emt`, `30 degree offset shrink`, `conduit offset mark spacing`

#### Ready-to-Publish Article Copy

**Why most 6" offsets land short on the first stick**

You measure `36"` from the last coupling to the edge of a structural I-beam, make a `6"` offset at `30°`, carry the `3/4" EMT` up the scissor lift, and—sure enough—your second bend starts `1-1/2"` too early and kisses the flange.

You didn't read the tape wrong. You forgot **shrink**. Every time you bend conduit out of a straight line, the pipe takes a longer diagonal path to cover less horizontal distance. If you don't push your marks forward by the shrink amount before you pull the first bend, the finished offset always lands short of the obstacle—and your stick comes up short at the panel box.

Here is the exact tape-measure layout for a **6" offset in 3/4" EMT at 30°**, worked start to finish.

---

#### The Jobsite Setup
- **Conduit**: `3/4" EMT` (standard `3/4"` hand bender — e.g., Ideal `74-027` or Klein `51604`, both `6"` stub take-up)
- **Obstacle height (offset rise)**: `6"`
- **Bend angle**: `30°` (easiest math on site, keeps wire pulling smooth, stays comfortably under the NEC `360°` max between pull points)
- **Distance from fixed coupling/box to obstacle face**: `36"`
- **Total straight-line run (coupling to panel connector)**: `84"` (`7'-0"`)

---

#### The Two Numbers You Need (30° Offset Constants)

For a `30°` offset, both trade constants are dead simple:
1. **Multiplier** = **`2.0`** ($\csc 30^\circ = 2.0$)
   $$\text{Mark Spacing} = 6" \times 2.0 = \mathbf{12"}$$
2. **Shrink per inch of offset** = **`1/4"` per inch** (`0.25"/in`)
   $$\text{Total Shrink} = 6" \times \frac{1}{4}" = \mathbf{1\text{-}1/2"} \; (1.5")$$

| Offset Angle | Multiplier (Mark Spacing) | Shrink per Inch | Shrink for a 6" Offset |
|---|---|---|---|
| `10°` | `6.0` | `1/16"` | `3/8"` |
| `15°` | `3.9` | `1/8"` | `3/4"` |
| `22.5°` | `2.6` | `3/16"` | `1-1/8"` |
| **`30°`** | **`2.0`** | **`1/4"`** | **`1-1/2"`** |
| `45°` | `1.4` | `3/8"` | `2-1/4"` |
| `60°` | `1.2` | `1/2"` | `3"` |

---

#### Step-by-Step Tape-Measure Marks

Always hook your tape from the **fixed end** (the end landing in the existing coupling or box).

1. **Add shrink to the obstacle distance to place Mark 1 (the front / obstacle-side bend):**
   $$36" + 1\text{-}1/2" = \mathbf{37\text{-}1/2"}$$
   Make a clean, full-circumference pencil mark around the pipe at **`37-1/2"`**. Wrapping the mark all the way around makes it easy to spot after you rotate the pipe `180°`.
2. **Subtract mark spacing (`12"`) back toward the fixed end to place Mark 2:**
   $$37\text{-}1/2" - 12" = \mathbf{25\text{-}1/2"}$$
   Wrap your second pencil mark at **`25-1/2"`**.
3. **Double-check the gap between your marks:**
   $$37\text{-}1/2" - 25\text{-}1/2" = \mathbf{12"}$$
4. **Apply the cut-length correction (if pre-cutting the stick):**
   Because the `6"` offset consumes `1-1/2"` of pipe length, add `1-1/2"` to your `84"` straight-line run:
   $$\text{Pre-Bend Cut Length} = 84" + 1\text{-}1/2" = \mathbf{85\text{-}1/2"}$$
   *(Pro habit: If you're bending off a full `10'-0"` stick of `3/4" EMT`, leave the far tail uncut until both bends are complete, then measure and trim the finished run to `84"`. That way any `1/8"` of springback gets trimmed clean instead of leaving you short.)*

---

#### Bending Sequence (Zero Dogleg)

1. **First bend (`30°`):** Slide the `3/4"` hand bender onto the pipe from the fixed end (or orient the hook consistently toward the same end for both bends). Line the **bender arrow** directly on your **`25-1/2"`** mark (or start on `37-1/2"` and pull toward the back—just keep the hook pointing the same direction for both marks). Apply steady foot pressure on the heel so the pipe doesn't creep, and pull until the pipe aligns with the **`30°` rim line** on the shoe.
2. **Rotate `180°` and line up the second mark:** Keep the bender facing the **same direction** along the conduit. Slide the shoe to **`37-1/2"`** and roll the pipe **`180°`** so the first bend points opposite.
3. **Sight for dogleg before you pull:** Stand behind the bender handle and sight straight down the stick—the centerline of the bent leg must line up dead-center with the bender handle. Even a `2°` twist will throw the far end off the wall by an inch.
4. **Second bend (`30°`):** Line the **arrow** on **`37-1/2"`** and pull back to `30°` until both straight legs sit parallel.
5. **Floor verification:** Lay the stick on a flat concrete slab. Both outer legs should lie completely flat with zero rock, and the rise from the floor to the bottom of the upper leg should read **`6"`** dead on.

---

#### 4-Point Rookie Mistake Check
- **Forgot shrink?** Marking at `36"` and `24"` leaves the offset landing at `34-1/2"` — `1-1/2"` into the beam.
- **Used the star or rim notch instead of the arrow?** Standard offsets use the **arrow** on both marks (and the same reference mark on both bends so spacing stays exact).
- **Flipped the bender direction between bends?** If you reverse which way the hook faces between Mark 1 and Mark 2, you change the spacing between tangent points and miss your `6"` rise.
- **Over-bent past `30°` on `3/4" EMT`?** `3/4" EMT` has less springback than you expect if you yank the handle; ease into the `30°` mark and check with a digital torpedo level or flat floor.

---

#### Check Any Offset Height or Angle in 3 Seconds

Need marks for an oddball height like `4-5/8"` at `22.5°` or `7-3/8"` in Rigid conduit? Plug it straight into the free browser calculator (no signup, works on your phone):

- **Interactive Offset Calculator (Free Web Tool)**: [Open Conduit Offset Calculator](https://bendcalc.wattflow.net/offset/?utm_source=field_guide&utm_medium=organic_article&utm_campaign=t32_offset_6in_30deg)
- **Offline Android App (No Signal Needed in Mechanical Rooms)**: [Get Conduit Bend Calc on Google Play](https://play.google.com/store/apps/details?id=com.robin421.conduitbendcalc&referrer=utm_source%3Dfield_guide%26utm_medium%3Dorganic_article%26utm_campaign%3Dt32_offset_6in_30deg)

---

### Guide 2 (90° Stub-Up): Why Your 1/2" EMT 90° Stub Lands Short (Take-Up Deduction + Back-of-90 Check)

#### Publication Metadata (Copy-Paste Ready)
- **Suggested Slug**: `/guides/1-2-emt-90-stub-up-lands-short-take-up-check/`
- **SEO Title** (57 chars): `Why Your 1/2" EMT 90° Stub Lands Short (+ Take-Up Fix)`
- **Meta Description** (155 chars): `Worked 14-3/8" stub-up on 1/2" EMT (5" take-up = 9-3/8" mark), Ideal vs Klein vs Greenlee shoe differences, back-of-90 check, and 12" scrap calibration.`
- **Target Queries**: `1/2 emt 90 degree stub up take up`, `why is my 90 bend too short`, `conduit bender take up chart`, `how to calibrate conduit bender deduct`

#### Ready-to-Publish Article Copy

**Subtracting 5" is only half the battle**

Every first-year apprentice learns the rule on day one: *"For a `1/2" EMT` 90° stub-up, subtract `5"` take-up from your target height."*

So you need a **`14-3/8"`** stub into the bottom of a disconnect. You subtract `5"`, mark at **`9-3/8"`**, pull the `90°`, stand it up on the floor—and your tape reads **`14-1/8"`** or **`14-3/4"`**. You didn't miss the subtraction. Something in your bender shoe, your datum, or your foot pressure shifted the bend.

Here is the exact worked layout for a `14-3/8"` stub in `1/2" EMT`, why different benders disagree even when they claim the same take-up, and the 60-second scrap-pipe check that nails every stub to `1/16"`.

---

#### Worked Example: 14-3/8" Stub-Up in 1/2" EMT

- **Target finished stub height ($H$)**: `14-3/8"` (`14.375"`) — measured from the **outside back of the 90°** to the cut end of the vertical leg.
- **Standard `1/2" EMT` hand-bender take-up**: **`5"`**
- **Formula**:
  $$\text{Mark from End} = H - \text{Take-Up} = 14\text{-}3/8" - 5" = \mathbf{9\text{-}3/8"}$$

| EMT Trade Size | Standard Hand-Bender Take-Up | Example: 14-3/8" Stub Mark |
|---|---|---|
| **`1/2" EMT`** | **`5"`** | **`9-3/8"`** |
| `3/4" EMT` | `6"` | `8-3/8"` |
| `1" EMT` | `8"` | `6-3/8"` |

**How to pull it clean:**
1. Hook your tape on the square-cut end of the `1/2" EMT` and mark **`9-3/8"`**.
2. Insert the conduit into the bender so the **measured `9-3/8"` tail passes through the hook** (pointing forward past the hook, NOT back toward the handle).
3. Line the **arrow** on the bender head directly onto the **`9-3/8"`** mark.
4. Keep **heavy, steady foot pressure on the heel pedal** the entire pull—don't just yank the handle with your arms—and bring the vertical leg up to a true `90°` verified with a torpedo level.

---

#### The Back-of-90 Check (Where Most People Misread the Tape)

A `90°` stub height is ALWAYS measured to the **back of the 90°** (the outside heel of the horizontal leg), NOT the inside edge and NOT the pipe centerline.

- **Best field check**: Stand the bent conduit upright on a flat, clean concrete slab so the horizontal leg rests flush on the floor. Butt the end of your tape measure flat against the slab right beside the vertical leg and read straight up to the top cut edge.
- If the stub is truly `90°` (check with a magnetic torpedo level on the vertical leg), that floor-to-top reading **is** your finished back-of-90 stub height (`14-3/8"`).
- **If it's under-bent at `87°–88°`**: The horizontal leg rocks off the floor and your stub will sit crooked in the connector and read wrong against the wall. Always slightly over-pull (`~91°–92°`) and let EMT springback settle at a dead `90°`.

---

#### Why Ideal, Klein, and Greenlee Don't Always Match

Even when two benders both stamp "`5"` Take-Up" on the head, their shoe geometry is NOT identical—and once you step onto mechanical or electric benders, even the **measurement datum** changes:

| Bender Brand & Model | Conduit | Centerline Radius ($R$) | Stamped Take-Up / Deduct | Reference Datum |
|---|---|---|---|---|
| **Ideal `74-026`** | `1/2" EMT` | `4-5/16"` (`4.3125"`) | `5"` | **Arrow** |
| **Klein `51603`** | `1/2" EMT` | `4-5/8"` (`4.625"`) | `5"` | **Arrow** |
| **Greenlee `555`** (electric) | `1/2" EMT` | `4-5/16"` (`4.3125"`) | `7"` | **Hook front edge** |
| **Greenlee `1800`** (mechanical) | `1/2" Rigid` | `2-5/8"` (`2.625"`) | `5-1/2"` *(min stub `6-1/2"`)* | **Hook front edge** |

Look closely at two traps in that table:
1. **Ideal `74-026` vs. Klein `51603`**: Both use a `5"` arrow take-up, yet Klein's centerline radius (`4-5/8"`) is **`5/16"` larger** than Ideal's (`4-5/16"`). Each manufacturer places its arrow differently relative to its shoe radius, so gain and back-to-back behavior differ—and a worn gang-box shoe that's been dropped off a lift ten times won't hold factory specs anyway.
2. **Arrow vs. Hook datum (Greenlee `555` / `1800`)**: On a Greenlee `555` or `1800`, the deduct (`7"` for `1/2" EMT` on a `555`; `5-1/2"` for `1/2" Rigid` on an `1800`) is measured from the **hook front edge**, not a hand-bender arrow. Mixing up a hand-bender deduct with a mechanical-bender hook deduct will put you `2"` off immediately.

---

#### The 60-Second Scrap-Pipe Calibration Check

Whenever you pick up an unfamiliar gang-box bender—or notice your stubs drifting `1/8"` to `3/8"` off—run one test bend on scrap before touching production sticks:

1. Grab a scrap piece of `1/2" EMT` (at least `24"` long).
2. Measure **`12"`** from the cut end and mark it cleanly.
3. Put the **arrow** on `12"` and bend a dead-square **`90°`** (verify with a torpedo level).
4. Stand it on the floor and measure the actual back-of-90 stub height ($S$).
5. Compute your bender's **Actual Take-Up (Deduct)**:
   $$\text{Actual Take-Up} = S - 12"$$

**Worked calibration example:**
- Suppose your `12"` test bend stands **`17-3/8"`** tall instead of `17"`.
- Your bender's real take-up is:
  $$17\text{-}3/8" - 12" = \mathbf{5\text{-}3/8"}$$
- Now when you need that **`14-3/8"`** finished stub on THAT bender, subtract your calibrated `5-3/8"`:
  $$14\text{-}3/8" - 5\text{-}3/8" = \mathbf{9"}$$
- Every single stub for the rest of the day lands dead on `14-3/8"`—zero rework, zero scrap pile.

*(Bonus check for gain / centerline radius: Cut a scrap stick to exactly `24"`, bend a `90°` in the middle, and measure both legs $A$ and $B$ from the back of the 90° to each end. Your exact `90°` gain is $G = A + B - 24"$, and your real centerline radius is $R = G \div 0.4292$.)*

---

#### Run Your Numbers or Calibrate Your Exact Bender

- **Interactive 90° Stub-Up Calculator (EMT & Rigid/IMC)**: [Open 90° Stub-Up Calculator](https://bendcalc.wattflow.net/stub-up/?utm_source=field_guide&utm_medium=organic_article&utm_campaign=t32_stubup_14_3_8_half_emt)
- **Guided Bender Calibration on Android (Try the 12" Scrap Test Free)**: [Get Conduit Bend Calc on Google Play](https://play.google.com/store/apps/details?id=com.robin421.conduitbendcalc&referrer=utm_source%3Dfield_guide%26utm_medium%3Dorganic_article%26utm_campaign%3Dt32_stubup_14_3_8_half_emt) — enter your `12"` test stub once to preview your bender's exact deduct & radius, and optionally unlock saved custom bender profiles with Pro.

---

### Guide 3 (3-Point Saddle): Laying Out a 3-Point Saddle Over a 3" Pipe in 60 Seconds (45°/22.5° Marks & Shrink)

#### Publication Metadata (Copy-Paste Ready)
- **Suggested Slug**: `/guides/3-point-saddle-3-inch-pipe-45-22-5-marks/`
- **SEO Title** (59 chars): `3-Point Saddle Over a 3" Pipe: 45°/22.5° Marks & Shrink`
- **Meta Description** (155 chars): `Lay out a 3-point saddle over a 3" obstacle in 60 seconds: 2.5 spacing multiplier (7-1/2" side marks), 3/16"/in shrink (9/16"), and rim-notch/arrow steps.`
- **Target Queries**: `3 point saddle over 3 inch pipe`, `3 point saddle multiplier 2.5`, `3 point saddle shrink 3/16`, `how to bend 3 point saddle emt`

#### Ready-to-Publish Article Copy

**Two numbers. Three marks. One clean hop over an existing pipe.**

A 3-point saddle looks intimidating until you realize it is just **one `45°` center bend** flanked by **two `22.5°` return bends** (`22.5° + 22.5° = 45°`, which brings your conduit right back inline with the rack).

If you memorize just two trade numbers—**`2.5`** for side spacing and **`3/16"` per inch** for center shrink—you can lay out any standard `45°/22.5°` 3-point saddle on `1/2"` or `3/4" EMT` in under a minute.

---

#### The Jobsite Setup
- **Obstacle height / required saddle clearance ($H$)**: **`3"`** *(for example, clearing a `3"` OD tube or a `2-1/2"` EMT/pipe at `2.875"` OD with `1/8"` breathing room — see the **Nominal 3" Pipe OD Callout** below if you are crossing a nominal 3" trade-size pipe!)*
- **Distance from fixed coupling/box to the center of the obstacle**: **`36"`**
- **Bend angles**: **`45°` center**, **`22.5°` on both sides**

---

#### The Exact Math (45° / 22.5° 3-Point Saddle)

1. **Side Mark Spacing Multiplier** = **`2.5`** *(standard trade value used by Ideal, Klein, and IBEW handbooks; exact geometric $\csc 22.5^\circ \approx 2.613$, rounded to `2.5` for clean field layout and shoe-radius fit)*
   $$\text{Side Mark Spacing from Center} = 3" \times 2.5 = \mathbf{7\text{-}1/2"} \; (7.5")$$
   $$\text{Total Span (Mark 1 to Mark 3)} = 7\text{-}1/2" \times 2 = \mathbf{15"}$$
2. **Center Mark Shrink** = **`3/16"` per inch of obstacle height** (`0.1875"/in` — matching the `22.5°` side-bend shrink factor)
   $$\text{Center Shrink} = 3" \times \frac{3}{16}" = \mathbf{9/16"} \; (0.5625")$$

---

#### Step-by-Step Tape-Measure Marks (Fixed Start Point = 0")

1. **Add center shrink to the obstacle centerline (`36"`) to get Mark 2 (Center, `45°`):**
   $$\text{Mark 2 (Center)} = 36" + \frac{9}{16}" = \mathbf{36\text{-}9/16"}$$
   Label this mark with a **`C`** or **`45`** so you never mix it up with the outer marks.
2. **Measure `7-1/2"` back toward the start end for Mark 1 (Left Side, `22.5°`):**
   $$\text{Mark 1} = 36\text{-}9/16" - 7\text{-}1/2" = \mathbf{29\text{-}1/16"}$$
3. **Measure `7-1/2"` past center toward the far end for Mark 3 (Right Side, `22.5°`):**
   $$\text{Mark 3} = 36\text{-}9/16" + 7\text{-}1/2" = \mathbf{44\text{-}1/16"}$$
4. **Sanity check your tape before touching the bender:**
   - Mark 1 to Mark 2 = `36-9/16" − 29-1/16"` = **`7-1/2"`**
   - Mark 2 to Mark 3 = `44-1/16" − 36-9/16"` = **`7-1/2"`**
   - Total span Mark 1 to Mark 3 = `44-1/16" − 29-1/16"` = **`15"`**

> **Jobsite Sanity Check — Nominal 3" Trade Pipe Is `3-1/2"` OD!**
> Never enter a pipe's *trade name* without putting your tape on it. Nominal `3"` EMT, Rigid, and Schedule 40 steel pipe all measure **`3-1/2"` (`3.5"`) outside diameter**. If you are saddling over a nominal `3"` pipe (and want it to clear cleanly without rubbing), enter **`3-1/2"`** (or `3-3/4"` with an air gap) as your obstacle height:
> - At `H = 3-1/2"`: Side spacing = `3.5" × 2.5` = **`8-3/4"`** (`17-1/2"` total span)
> - Center shrink = `3.5" × 3/16"` = **`21/32"`** (`≈ 5/8"` on a standard jobsite tape)

---

#### Bending Sequence: Rim Notch First, Then Arrows

Follow this exact order so the bends stay symmetrical and flat:

1. **Bend 1 — Center Bend (`45°` on the Rim Notch):**
   - Slide the bender onto the conduit and align **Mark 2 (`36-9/16"`)** dead-center on the **rim notch** (the teardrop notch on the curved rim of an Ideal or Klein hand bender).
   - Pull a clean **`45°`** bend.
2. **Bend 2 — First Side Bend (`22.5°` on the Arrow, Hook Facing Center):**
   - Keep the conduit in plane and **rotate the pipe `180°`** (so the center peak points opposite your pull).
   - Slide the bender to **Mark 1 (`29-1/16"`)** with the **bender hook/mouth facing inward toward the `45°` center bend**.
   - Line the **arrow** on **`29-1/16"`**, sight down the stick to eliminate any dogleg, and pull to **`22.5°`** (the `22°` mark on most hand bender shoes).
3. **Bend 3 — Second Side Bend (`22.5°` on the Arrow, Hook Facing Center):**
   - Flip the conduit end-for-end so the **bender hook/mouth again faces inward toward the `45°` center bend**.
   - Line the **arrow** on **Mark 3 (`44-1/16"`)**, sight down the pipe to ensure both outer legs lie dead flat in the same plane, and pull the final **`22.5°`** return bend.
4. **Flat-Floor Check:**
   - Lay the finished saddle on a flat floor. Both outer legs should touch the floor straight and collinear with zero twist, and the underside of the peak should clear **`3"`**.

---

#### When NOT to Use a 3-Point Saddle
If the obstacle is wider than roughly **`6"`** (such as a rectangular HVAC duct, cable tray, or multi-pipe rack), a 3-point saddle gets awkwardly tall and wide. Switch to a **[4-Point Saddle](https://bendcalc.wattflow.net/4-point-saddle/?utm_source=field_guide&utm_medium=organic_article&utm_campaign=t32_saddle3_3in_pipe)** (two matching offsets back-to-back with a flat run across the top — remember shrink applies twice!).

---

#### Verify Any 3-Point Saddle Marks Instantly

- **Interactive 3-Point Saddle Calculator (with Visual Bend Diagram)**: [Open 3-Point Saddle Calculator](https://bendcalc.wattflow.net/3-point-saddle/?utm_source=field_guide&utm_medium=organic_article&utm_campaign=t32_saddle3_3in_pipe)
- **Offline Android App (All 9 Bend + NEC Electrical Calculators)**: [Get Conduit Bend Calc on Google Play](https://play.google.com/store/apps/details?id=com.robin421.conduitbendcalc&referrer=utm_source%3Dfield_guide%26utm_medium%3Dorganic_article%26utm_campaign%3Dt32_saddle3_3in_pipe)

---

## 2. Community-Safe Distribution Plan (Zero Spam, High Trust)

### Core Community Rules of Engagement
1. **Value-First, Zero Bare-Link Drops**: Never post "Check out my conduit app!" on Reddit or trade forums. Trade communities have a hair-trigger spam detector and will ban the domain permanently.
2. **9:1 Contribution Ratio**: For every 1 post or reply that mentions `bendcalc.wattflow.net`, make at least 9 pure-value technical comments (helping apprentices with offset math, NEC Chapter 9 conduit fill, bender doglegs, or stub calibration) with **no link at all**.
3. **Radical Builder Transparency**: Whenever you do link the web calculator, state openly *"Full disclosure: I helped build this free browser calculator (no signup/no ads)"*. Electricians respect honest builders; they despise astroturfing.
4. **Web Tool First, Play Store Second**: Link the zero-friction browser calculator (`bendcalc.wattflow.net/...`) in discussions where people want to double-check math; let the in-page `SeoAppCtaCard` convert mobile visitors to Google Play naturally. Only share a direct Play Store link when someone explicitly asks *"Is there an Android app that works offline?"*.

---

### Channel A: Reddit (`r/electricians` & `r/IBEW`)

#### Subreddit Guardrails
- **`r/electricians`**: Strictly bans self-promotion posts and bare app plugs. High-upvote formats are **worked field cheat sheets**, **scrap-pipe calibration experiments**, and **"mistakes I stopped making" troubleshooting breakdowns**. Keep the main post 100% self-contained with zero links; only share the free web tool if commenters explicitly ask *"What calculator/chart do you use?"* (or via a single low-key transparent note ONLY if subreddit rules at posting time permit non-commercial free web tools).
- **`r/IBEW`**: Apprentice-heavy (1st–3rd year NJATC/JATC conduit bending labs) and union-proud. Never sound corporate or salesy. Frame content around **craftsmanship, zero-waste bending, and JATC lab prep**. Do NOT put promo links in the OP.

#### Native Post Draft 1 — `r/electricians` (Pure Value, Zero Link in OP)
- **Post Title**: `The 3 math/datum traps that kept making my EMT bends land short (with exact tape numbers for apprentices)`
- **Post Body**:
```markdown
Seen a bunch of posts lately from 1st/2nd years asking why their bends still miss by 1/4" to 1-1/2" even when they do the chart math right. Figured I'd drop the 3 exact traps I run through with new apprentices on commercial jobs:

**1. 30° Offset Shrink (The 1-1/2" Surprise on a 6" Offset)**
- Multiplier = 2.0 → 6" offset = **12"** between marks.
- Shrink = 1/4" per inch → 6" × 1/4" = **1-1/2"**.
- If your beam/obstacle is 36" from the coupling, don't mark at 36" and 24". Add shrink first: **Mark 1 = 37-1/2"**, **Mark 2 = 25-1/2"**. If you're pre-cutting an 84" run, cut at **85-1/2"** (or better, bend first and trim the tail).

**2. Bender Shoe & Datum Drift on 90° Stubs**
- Standard 1/2" EMT hand benders stamp 5" take-up, so a 14-3/8" stub marks at **9-3/8"**.
- Even when two benders both say 5", an Ideal 74-026 has a 4-5/16" centerline radius while a Klein 51603 is 4-5/8" — and a worn gang-box shoe often pulls 5-1/4" or 5-3/8".
- Worse: switch to a Greenlee 555 (1/2" EMT = 7" deduct) or 1800 (1/2" Rigid = 5-1/2" deduct) and you're measuring from the **hook front edge**, not an arrow.
- **60-second fix on any unfamiliar bender**: Mark **12"** on scrap, arrow on 12", pull a dead-level 90°, stand it on the slab and measure floor-to-top ($S$). Your real deduct is $S - 12"$. (If it stands 17-3/8", your real deduct is 5-3/8", not 5".)

**3. 3-Point Saddle: Trade Size vs. Actual Pipe OD**
- Standard 45° center / 22.5° sides = **2.5** spacing multiplier and **3/16"/in** center shrink.
- For a **3"** obstacle centered at 36": Center mark = 36" + 9/16" = **36-9/16"** (rim notch, 45°), side marks ±7-1/2" at **29-1/16"** and **44-1/16"** (arrow with hook facing center, 22.5° each).
- **The trap**: Nominal 3" EMT/Rigid/Sch 40 is actually **3-1/2" OD** — not 3"! If you're crossing nominal 3" pipe, run 3-1/2" height (8-3/4" side marks, ~5/8" shrink) or you'll rub the pipe.

What's the #1 bending mistake you still see guys make on site?
```

#### Native Post Draft 2 — `r/IBEW` (JATC Bending Lab Prep Angle, Zero Link in OP)
- **Post Title**: `Quick scrap-pipe calibration trick for JATC bending lab (and gang-box benders that don't match the stamped 5"/6")`
- **Post Body**:
```markdown
For any 1st or 2nd year heading into bending lab (or grabbing a beat-up gang-box bender on a commercial job): don't trust the stamped 5" / 6" / 8" take-up blindly until you pull one test 90 on scrap.

1. Cut/grab ~24" of scrap EMT.
2. Mark exactly **12"** from the end.
3. Arrow on 12", steady foot pressure, bend a dead-level 90° (torpedo level check).
4. Stand it on the slab and measure floor-to-top ($S$).
5. **Actual deduct = $S - 12"$**.

Example: On a 1/2" EMT bender where your 12" test stub measures 17-3/8", your real deduct is **5-3/8"** — so for a 14-3/8" stub, you mark at **9"** instead of 9-3/8". Takes 60 seconds and saves you from burning three sticks in front of your JW.

If you also need true centerline radius ($R$) for back-to-back or multi-bend gain math: cut a stick to an exact **24"**, bend 90° in the middle, measure both legs $A$ and $B$ from the back of the 90 to the ends. Gain $G = A + B - 24"$, and $R = G / 0.4292$.

Stay safe out there brothers and sisters.
```

#### High-Trust Comment-Reply Templates (Use ONLY When Relevant / Asked)
1. **When a commenter asks for an offset or saddle double-check:**
   > At `30°`, multiplier is `2.0` (`6" × 2 = 12"` between marks) and shrink is `1/4"/in` (`1-1/2"`). So add `1-1/2"` to your obstacle measurement before laying back `12"`. If you ever want a quick sanity check on oddball fractions (full disclosure: I helped build a free browser tool with no login), here's the offset page: `https://bendcalc.wattflow.net/offset/?utm_source=reddit&utm_medium=community_comment&utm_campaign=t32_offset_6in_30deg`
2. **When someone asks *"What free/offline Android conduit app do you use?"*:**
   > Full disclosure: I'm on the team behind **Conduit Bend Calc** — we built it specifically to work 100% offline in basements/mechanical rooms with fraction-inch & metric toggle, bender-aware take-up/calibration, and NEC Ch. 9 conduit fill. Core bend + NEC calculators are free; custom saved bender profiles are Pro. Play Store link if you want to try it: `https://play.google.com/store/apps/details?id=com.robin421.conduitbendcalc&referrer=utm_source%3Dreddit%26utm_medium%3Dcommunity_comment%26utm_campaign%3Dt32_community_cheatsheet`
3. **When someone asks about NEC Conduit Fill (e.g., how many `#12 THHN` in `3/4" EMT`):**
   > Per NEC 2023 Chapter 9 Table 4 (`3/4" EMT` = `0.533 sq in`, 40% limit = `0.2132 sq in`) and Table 5 (`12 AWG THHN` = `0.0133 sq in`), `0.2132 / 0.0133 = 16.03` → **16 conductors** max (don't forget Table 310.15(C)(1) bundling derating above 3 current-carrying conductors!). If you want to mix wire sizes quickly in a browser, we made a free NEC fill calculator here (disclosure: my project): `https://bendcalc.wattflow.net/conduit-fill/?utm_source=reddit&utm_medium=community_comment&utm_campaign=t32_conduit_fill_nec`

---

### Channel B: ElectricianTalk & Mike Holt Forum

#### 1. ElectricianTalk (Commercial & Industrial Electrical sub-forum)
- **Angle**: Practical jobsite bender geometry comparison (**Ideal 74-026 vs. Klein 51603 vs. Greenlee 555/1800**). ElectricianTalk members love tool comparisons and real-world measurements.
- **Suggested Thread Title**: `Measuring actual take-up & centerline radius across Ideal 74-026, Klein 51603, and Greenlee 555 — what are you seeing in the field?`
- **Core Thread Body (Summary + Discussion Prompt)**:
  - Share the verified `BENDER_SPECS` table (Ideal `74-026` `R = 4-5/16"`, Klein `51603` `R = 4-5/8"`, Greenlee `555` `7"` hook deduct, Greenlee `1800` `5-1/2"` hook deduct).
  - Share the `12"` scrap-pipe test bend formula (`Actual Deduct = S − 12"`) and the `24"` gain test (`G = A + B − 24"`, `R = G / 0.4292`).
  - Ask seasoned members what real-world deduct drift they measure on older aluminum vs. iron heads.
  - **Link Policy**: Put the web link in your forum profile signature (if allowed) or share only if a member asks for the calculator: `https://bendcalc.wattflow.net/stub-up/?utm_source=electriciantalk&utm_medium=community_post&utm_campaign=t32_stubup_14_3_8_half_emt`.

#### 2. Mike Holt Forum (NEC / Electrical Calculations sub-forum)
- **Angle**: NEC 2023 Chapter 9 Table 1 / Table 4 / Table 5 & **Note 7 (`≥ 0.8` round-up rule)** + Conduit Bending Gain math verification. Mike Holt moderators strictly remove commercial ads, so keep the post 100% educational and code-referenced.
- **Suggested Thread Title**: `Quick verification: NEC Chapter 9 Note 7 (0.8 round-up) vs. exact Table 4/5 area math for mixed vs. same-size THHN conductors`
- **Core Thread Body**:
  - Walk through how Annex C applies Chapter 9 Note 7 (rounding up to the next whole conductor when the decimal remainder is `≥ 0.8` for identical conductors at 40% fill) versus mixed-conductor pulls where you must sum individual Table 5 areas and stay `≤ 40%` of Table 4 area (`53%` for 1 wire, `31%` for 2 wires).
  - Mention openly as a software/electrical contributor that you're cross-checking edge cases for a free browser NEC fill tool, and invite peer review ONLY if permitted by sub-forum rules (`https://bendcalc.wattflow.net/conduit-fill/?utm_source=mikeholt&utm_medium=community_post&utm_campaign=t32_conduit_fill_nec`).

---

### Channel C: 3 YouTube Shorts / TikTok 30-Second Shooting Scripts

> **Production Guidelines**: Shoot vertical (`9:16`), raw jobsite/shop lighting (concrete floor, yellow Stanley/Milwaukee tape, sharpie/pencil, real `1/2"` or `3/4" EMT`, Ideal or Klein hand bender). High-contrast bold captions centered in the safe zone (`y = 35%–70%`). Never use corporate stock footage.
> **Bilingual Multiplier (37.8% ES User Share)**: After filming the 3 English takes, film 3 matching **Spanish (`es-US` / `es-MX`)** takes using the exact same pipe setup and tape marks—calling out *"desplazamiento"*, *"subida de 90°"*, *"silla de 3 puntos"*, and *"contracción"* (never *"tubería"* — match our app's `conducto` terminology).

---

#### Short 1 (Offset): *"Why Your 6" EMT Offset Is Always 1-1/2" Short"* (30s)
- **0–3s (Hook — Visual + VO)**:
  - *Visual*: Hold a bent `3/4" EMT` stick up to a beam/box mark — clearly `1-1/2"` short. Red "X" flashes on screen.
  - *VO*: "If your 6-inch EMT offset keeps landing an inch and a half short, stop blaming your tape."
- **3–22s (Tape-Measure Mark Demo)**:
  - *Visual*: Overhead close-up on `3/4" EMT` on concrete floor with tape hooked at `0"`. Bold text overlays pop as you mark with pencil.
  - *VO*: "At 30 degrees, your multiplier is 2.0 — so a 6-inch offset needs **12 inches** between marks. Here's the part guys skip: 30 degrees shrinks **a quarter-inch per inch**. 6 times a quarter is **1-1/2 inches**. If your obstacle is at 36 inches, add 1-1/2 — put **Mark 1 at 37-1/2"**, then come back 12 inches for **Mark 2 at 25-1/2"**. Arrow on the mark, pull 30, flip 180, pull 30 back."
  - *Visual*: Quick 2-second cut of laying the bent pipe flat on the slab, tape showing exact `6"` rise and hitting the `36"` chalk line dead on.
- **22–30s (App/Web Verification Payoff)**:
  - *Visual*: Hold phone over the pipe showing **Conduit Bend Calc** Offset screen (`6"`, `30°` → `12"` spacing, `1-1/2"` shrink + visual Bend Diagram).
  - *VO*: "For ugly fractions like 4-5/8 at 22.5, I double-check it in this free offline bend calc — link's in the pinned comment."
- **Exact Caption**:
  `Why your 6" 30° EMT offset lands 1-1/2" short (and the exact tape marks to fix it). 30° = 2.0 multiplier + 1/4"/in shrink. Save this for the jobsite. #electrician #conduitbending #emt #ibew #apprenticeelectrician #sparky`
- **Pinned Comment (with UTM)**:
  `Free browser Offset Calculator (no signup, shows bend diagram + shrink): https://bendcalc.wattflow.net/offset/?utm_source=youtube_shorts&utm_medium=short_video&utm_campaign=t32_offset_6in_30deg — Offline Android app for basements/mech rooms: https://play.google.com/store/apps/details?id=com.robin421.conduitbendcalc&referrer=utm_source%3Dyoutube_shorts%26utm_medium%3Dshort_video%26utm_campaign%3Dt32_offset_6in_30deg`
  *(For TikTok: swap `youtube_shorts` → `tiktok` in both URLs and place the web link in bio + call out "link in bio" in VO/pinned comment.)*

---

#### Short 2 (90° Stub-Up): *"Your 1/2" Bender's 5" Take-Up Might Be Lying to You"* (30s)
- **0–3s (Hook — Visual + VO)**:
  - *Visual*: Stand a freshly bent `1/2" EMT` 90° stub on the floor; tape shows `14-3/4"` instead of `14-3/8"`.
  - *VO*: "Did the 5-inch subtract right and your 1/2-inch stub STILL came out wrong? Test your bender like this."
- **3–22s (Tape-Measure Mark Demo)**:
  - *Visual*: Show pencil mark at `9-3/8"` (`14-3/8" − 5"`), then quick cut to a scrap stick marked at **`12"`**.
  - *VO*: "Normally a 14-3/8 stub minus 5 inches marks at **9-3/8**. But beat-up gang-box shoes drift — and Klein vs. Ideal don't even share the same radius. Grab scrap, mark **12 inches**, arrow on 12, bend a dead-level 90, and measure floor to top. Mine hit **17-3/8**. Subtract 12 — my bender's real take-up is **5-3/8**, not 5. So for 14-3/8, I mark at **9 inches flat**."
  - *Visual*: Stand the calibrated stub on the slab; torpedo level centered, tape reads **`14-3/8"`** dead on the back of the 90.
- **22–30s (App/Web Verification Payoff)**:
  - *Visual*: Show **Conduit Bend Calc** 90° Stub-Up & Guided Calibration preview (`12"` test → `17-3/8"` → `5-3/8"` deduct).
  - *VO*: "Plug your 12-inch test bend into Conduit Bend Calc once and stop burning pipe. Free calculator in the pinned comment."
- **Exact Caption**:
  `60-second scrap-pipe check to find your bender's REAL take-up (Ideal vs Klein vs worn gang-box shoes). Mark 12", pull 90°, Actual Deduct = Height − 12". #electrician #conduit #emt #electricalapprentice #handbender #trades`
- **Pinned Comment (with UTM)**:
  `Free 90° Stub-Up Calculator (EMT & Rigid/IMC take-up chart): https://bendcalc.wattflow.net/stub-up/?utm_source=youtube_shorts&utm_medium=short_video&utm_campaign=t32_stubup_14_3_8_half_emt — Try Guided Bender Calibration free on Android: https://play.google.com/store/apps/details?id=com.robin421.conduitbendcalc&referrer=utm_source%3Dyoutube_shorts%26utm_medium%3Dshort_video%26utm_campaign%3Dt32_stubup_14_3_8_half_emt`
  *(For TikTok: swap `youtube_shorts` → `tiktok`.)*

---

#### Short 3 (3-Point Saddle): *"3-Point Saddle Over a 3" Obstacle in 60 Seconds"* (30s)
- **0–3s (Hook — Visual + VO)**:
  - *Visual*: Hold a sharp, dead-flat 3-point saddle dropping cleanly over a 3" pipe on the shop floor.
  - *VO*: "Only two numbers to remember for a 45/22.5 three-point saddle: **2.5** and **3/16**."
- **3–22s (Tape-Measure Mark Demo)**:
  - *Visual*: Tape stretched along `1/2" EMT`, marking three crisp rings as numbers pop on screen.
  - *VO*: "Crossing a 3-inch obstacle centered at 36 inches? First add shrink: 3 times **3/16** is **9/16** — put your center mark at **36-9/16**. Now side marks: 3 times **2.5** is **7-1/2 inches** each side — **29-1/16** and **44-1/16**. Center mark goes on the **rim notch** for 45. Flip 180, hook facing center, **arrow** on each side mark for 22.5. *(Quick text pop: Nominal 3" pipe = 3-1/2" OD!)*"
  - *Visual*: Quick 2-second snap of the finished saddle lying dead flat on the concrete floor with zero dogleg.
- **22–30s (App/Web Verification Payoff)**:
  - *Visual*: Show **Conduit Bend Calc** 3-Point Saddle screen (`3"`, `45°` → `7-1/2"` spacing, `15"` span, `9/16"` shrink + Bend Diagram).
  - *VO*: "And if it's nominal 3-inch pipe, enter 3-1/2 OD in the calculator so you don't rub. Free tool linked below."
- **Exact Caption**:
  `3-point saddle math made dead simple: 2.5 spacing multiplier + 3/16"/in center shrink (45° center on rim notch, 22.5° sides on arrow). Pro tip: nominal 3" pipe is 3-1/2" OD! #electrician #conduitbending #3pointsaddle #ibew #sparkylife`
- **Pinned Comment (with UTM)**:
  `Free 3-Point Saddle Calculator (with visual mark diagram): https://bendcalc.wattflow.net/3-point-saddle/?utm_source=youtube_shorts&utm_medium=short_video&utm_campaign=t32_saddle3_3in_pipe — Offline Android app: https://play.google.com/store/apps/details?id=com.robin421.conduitbendcalc&referrer=utm_source%3Dyoutube_shorts%26utm_medium%3Dshort_video%26utm_campaign%3Dt32_saddle3_3in_pipe`
  *(For TikTok: swap `youtube_shorts` → `tiktok`.)*

---

### 4-Week Community Distribution Cadence (Zero Flooding)

| Week | Web / Long-Form Publish | Community (Pure Value First) | Short-Form Video (EN + ES) | Attribution Check |
|---|---|---|---|---|
| **Week 1** | Publish Guide 1 (6" Offset 30°); submit URL via GSC + IndexNow | Account warm-up: 5 pure-value comments in `r/electricians` & `r/IBEW` (zero links) | Post Short 1 (EN) on YouTube Shorts + TikTok | Verify `utm_source=youtube_shorts` fires in Amplitude Web + Play referrer |
| **Week 2** | Publish Guide 2 (90° Stub-Up & Calibration); submit via GSC + IndexNow | Post `r/electricians` Draft 1 (zero link in OP) + ElectricianTalk bender thread | Post Short 2 (EN) + Short 1 (ES) | Check Day-15 Scorecard mid-flight |
| **Week 3** | Publish Guide 3 (3-Point Saddle 3" Pipe); submit via GSC + IndexNow | Post `r/IBEW` Draft 2 (zero link in OP) + 5 pure-value comments across forums | Post Short 3 (EN) + Short 2 (ES) | Audit Play Console UTM rows & GSC impressions for `/3-point-saddle/` & `/conduit-fill/` |
| **Week 4** | Cross-link Guides 1–3 to `/offset/`, `/stub-up/`, `/3-point-saddle/`, `/conduit-fill/` | Post Mike Holt NEC Chapter 9 Note 7 discussion thread | Post Short 3 (ES) + reply to top comment questions with follow-up Shorts | Complete **Day-30 Funnel Review Scorecard** & Go/No-Go decision |

---

## 3. Day-15 & Day-30 Funnel Review Scorecard Template

> **How to Use This Scorecard**:
> - **Baseline (T29 Audited Facts)** = verified pre-launch measurements from Play Console, GSC, and Amplitude prior to T30/T31/T32 rollout.
> - **Day-0 Snapshot** = fill immediately after T30 (Web SEO + Attribution) and T31 (Play Store ASO) go live in production.
> - **Day-15 Review** = diagnostic checkpoint to catch broken tracking, indexing delays, or low CTR early.
> - **Day-30 Review** = formal Go / Iterate / No-Go gate for the next 60-day growth sprint.

### Verified Baseline Summary (Facts from T29 Audit — Pre-T30/T31/T32)
| Platform | Metric | Verified Baseline (28d) | Known Bottleneck Addressed by T30–T32 |
|---|---|---|---|
| **Google Play Console** | Store Listing Impressions | `3,430` | Search terms below Play visibility threshold |
| **Google Play Console** | Organic Acquisitions (Installs) | `117` | Outdated store screenshots (`en-US` / `es-US`) |
| **Google Play Console** | Store Listing Conversion Rate (CVR) | `38.2%` | Protect high CVR while lifting store impressions & `es-US` relevance |
| **Google Search Console** | Web Property Impressions | `629` | 5 static duplicate pages cannibalizing interactive tools; missing `/3-point-saddle/` & `/conduit-fill/` |
| **Amplitude App** | Top-4 Tool Concentration | `~78%` of calcs | Offset, 90° Stub-Up, 3-Point Saddle, Conduit Fill |
| **Amplitude App** | Spanish-Language User Share | `37.8%` | Newly localized in T20/T27; ready for `es-US` ASO + ES video/guides |

---

### Table 3.1 — Google Search Console (Organic Search Layer)

*Capture exact 28-day window at Day 0, rolling 14-day window at Day 15, and 28-day post-launch window at Day 30.*

| Page / Asset | Category | Baseline Impr / Clicks / CTR / Pos | Day-15 Impr / Clicks / CTR / Pos | Day-30 Impr / Clicks / CTR / Pos | Day-30 Target *(Hypothesis)* |
|---|---|---|---|---|---|
| `/` (Home — All Calculators) | Core Hub | `[Day-0]` | `[ ]` | `[ ]` | CTR `≥ 4.0%`, Avg Pos improves |
| `/offset/` | Interactive Tool (1/6) | `[Day-0]` | `[ ]` | `[ ]` | `+40%` clicks post-301 dedup |
| `/stub-up/` | Interactive Tool (2/6) | `[Day-0]` | `[ ]` | `[ ]` | `+40%` clicks post-301 dedup |
| `/3-point-saddle/` | Interactive Tool (3/6, **New T30**) | `0` (new) | `[ ]` | `[ ]` | Indexed by Day 7; `≥ 150` impr by Day 30 |
| `/conduit-fill/` | Interactive Tool (4/6, **New T30**) | `0` (new) | `[ ]` | `[ ]` | Indexed by Day 7; `≥ 150` impr by Day 30 |
| `/4-point-saddle/` | Interactive Tool (5/6) | `[Day-0]` | `[ ]` | `[ ]` | Stable/growing CTR `≥ 3.5%` |
| `/shrink/` | Interactive Tool (6/6) | `[Day-0]` | `[ ]` | `[ ]` | Stable/growing CTR `≥ 3.5%` |
| **High-Impression Guide #1** *(verify top GSC static guide at Day-0, e.g. `/conduit-bending-chart/`)* | High-Impr Guide (1/3) | `[Day-0]` | `[ ]` | `[ ]` | Zero cannibalization w/ tools; CTA click tracking live |
| **High-Impression Guide #2** *(e.g. `/hand-bender-markings/`)* | High-Impr Guide (2/3) | `[Day-0]` | `[ ]` | `[ ]` | CTR `≥ 2.5%` |
| **High-Impression Guide #3** *(e.g. `/offset-multiplier-guide/`)* | High-Impr Guide (3/3) | `[Day-0]` | `[ ]` | `[ ]` | CTR `≥ 2.5%` |
| **T32 Field Guides (Guides 1–3)** *(if hosted on `bendcalc.wattflow.net`)* | New Case Studies | `0` (new) | `[ ]` | `[ ]` | Indexed + driving `/offset/`, `/stub-up/`, `/3-point-saddle/` clicks |
| **Total Property (`bendcalc.wattflow.net`)** | **Roll-Up** | **`629` impr** *(T29)* | `[ ]` | `[ ]` | **`≥ 1,200` impr / `≥ 45` clicks (28d)** |

---

### Table 3.2 — Amplitude Web (Engagement & Play Handoff Layer — Project `909538`)

*Verify post-T30 dev/bot filter is active (`localhost` and crawler noise excluded).*

| Metric / Event | Breakdown | Baseline (Pre-T30) | Day-15 Actual | Day-30 Actual | Day-30 Target *(Hypothesis)* |
|---|---|---|---|---|---|
| `calculation_completed` (Unique Web Users) | Total (excl. dev/bot) | `[Broken pre-T30]` | `[ ]` | `[ ]` | `≥ 200` unique web calculators / 28d |
| `calculation_completed` by Top-4 Tool | Offset / Stub / 3-Pt / Fill | `—` | `[ ]` | `[ ]` | Top-4 accounts for `≥ 70%` of web calcs |
| `calculation_completed` by `utm_source` | `organic_search` / `field_guide` / `reddit` / `youtube_shorts` / `tiktok` / `forums` | `—` | `[ ]` | `[ ]` | `≥ 30%` attributed to non-search T32 channels |
| `google_play_cta_clicked` (Total & Unique) | All Web Pages (`SeoAppCtaCard` + banner) | `[Day-0]` | `[ ]` | `[ ]` | `≥ 40` CTA clicks / 28d |
| **Web Calc → Play CTA Click Rate** | `google_play_cta_clicked` / `calculation_completed` users | `[Day-0]` | `[ ]` | `[ ]` | **`≥ 12%`** on mobile web sessions |

---

### Table 3.3 — Google Play Console (Acquisition, UTM & ASO Layer)

| Metric | Segment / Source | Baseline (T29 28d) | Day-15 Actual (14d) | Day-30 Actual (28d) | Day-30 Target *(Hypothesis)* |
|---|---|---|---|---|---|
| Total Store Listing Impressions | All Organic | `3,430` | `[ ]` | `[ ]` | `≥ 4,200` (`+22%`) |
| Total Organic Acquisitions (Installs) | All Organic | `117` | `[ ]` | `[ ]` | `≥ 160` (`+37%`) |
| Store Listing CVR — Overall | All Languages | `38.2%` | `[ ]` | `[ ]` | **`≥ 38.0%`** (maintain or beat post-T31) |
| Store Listing CVR — `en-US` | Post-T31 Screenshots | `[Day-0]` | `[ ]` | `[ ]` | `+2–4 pp` vs. Day-0 `en-US` baseline |
| Store Listing CVR — `es-US` / `es-419` | Post-T31 Localized Screenshots | `[Day-0]` | `[ ]` | `[ ]` | `+3–6 pp` vs. Day-0 `es` baseline |
| UTM Acquisitions: `utm_source=web_cta` | Web-to-App Handoff | `0` (untracked) | `[ ]` | `[ ]` | `≥ 15` tracked installs |
| UTM Acquisitions: `utm_source=field_guide` | Guides 1–3 | `0` | `[ ]` | `[ ]` | `≥ 10` tracked installs |
| UTM Acquisitions: `reddit` + `electriciantalk` + `mikeholt` | Community Distribution | `0` | `[ ]` | `[ ]` | `≥ 15` tracked installs |
| UTM Acquisitions: `youtube_shorts` + `tiktok` | Short-Form Video | `0` | `[ ]` | `[ ]` | `≥ 20` tracked installs |
| **Play Console Search Terms Threshold** | Visibility Status (`Locked` / `Unlocked`) | `Below threshold` | `[ ]` | `[ ]` | **Unlocked** (top organic keywords visible for ASO v2) |

---

### Table 3.4 — Amplitude App (North Star, Activation, Retention & Monetization)

| Metric / Event | Definition | Baseline (Pre-T30) | Day-15 Actual | Day-30 Actual | Day-30 Target *(Hypothesis)* |
|---|---|---|---|---|---|
| **NORTH STAR: Weekly Organic New Users Completing `activation_completed`** | Distinct organic new devices firing `activation_completed` per week | `[Day-0]` *(est. ~20–25/wk from 117/28d)* | `[ ]` | `[ ]` | **`≥ 35` activated organic users / week** by Week 4 (`+40–50%`) |
| **Activation Rate** | `activation_completed` / New Organic App Installs | `[Day-0]` | `[ ]` | `[ ]` | **`≥ 65%`** (guards against low-intent traffic) |
| **D7 Retention (Overall)** | % of `activation_completed` cohort returning on Day 7 | `[Day-0]` | `[ ]` | `[ ]` | Maintain or beat baseline (`±2 pp` guardrail) |
| **D7 Retention (`en` vs. `es`)** | Split by `app_lang` user property | `[Day-0]` | `[ ]` | `[ ]` | Narrow `es` vs. `en` gap to `≤ 3 pp` |
| **Calibration Try Rate** | `calibration_try_started` / Activated Users | `[Day-0]` | `[ ]` | `[ ]` | `≥ 12%` (boosted by Guide 2 + Short 2) |
| **Paywall Demo Engagement** | `pro_paywall_demo_interacted` / Paywall Views | `[Day-0]` | `[ ]` | `[ ]` | Track directional lift from higher-intent field traffic |
| **Pro Purchases (`pro_entitlement_granted`)** | Total organic Pro conversions (28d) | `[Day-0]` | `[ ]` | `[ ]` | First repeatable organic Pro conversions confirmed |

---

### Day-15 Mid-Flight Diagnostic Checkpoints (Fix Early, Don't Wait for Day 30)

1. **Indexing & 301 Health (GSC)**: Are `/3-point-saddle/` and `/conduit-fill/` indexed? Have the 5 legacy duplicate URLs stopped receiving impressions in favor of canonical interactive tools? *Action if NO*: Re-inspect in GSC, verify `301` headers on Cloudflare Pages, and ping IndexNow.
2. **Attribution Plumbing (Amplitude Web + Play Console)**: Do test clicks from `utm_source=field_guide` and `utm_source=youtube_shorts` appear cleanly in Amplitude Web and Play Console Acquisition Reports? *Action if NO*: Fix URL-encoding on Play `referrer` or Web UTM capture immediately before Week 3 distribution.
3. **Store CVR Guardrail (Play Console)**: Did the new T31 screenshots drop Store Listing CVR below `34%` (`>4 pp` drop vs. `38.2%` baseline)? *Action if YES*: Run a Play Store Listing Experiment A/B testing the previous Hero Screenshot #1 against the T31 Hero Screenshot #1.
4. **Community Sentiment Check**: Did any Reddit/forum post trigger negative feedback or mod removal? *Action if YES*: Strip all links, audit tone for accidental sales language, and shift exclusively to pure-value comments for 14 days.

---

### Day-30 Go / Iterate / No-Go Decision Thresholds

| Initiative | **GO (Scale Up)** | **ITERATE (Fix Bottleneck)** | **NO-GO / PAUSE** |
|---|---|---|---|
| **1. Web SEO & Interactive Tool Expansion** *(e.g. Rolling Offset, Kicked 90°, Voltage Drop web pages)* | GSC 28d impressions `≥ 1,200` AND Web `calculation_completed` `≥ 200` users AND Web→Play CTA CTR `≥ 10%` → **Build next 3 interactive web tools + 5 field guides (EN + ES).** | GSC impressions `≥ 1,000` but CTR `< 2.5%` OR Web→Play CTA CTR `< 8%` → **Rewrite meta titles/descriptions and A/B test `SeoAppCtaCard` placement before adding new pages.** | GSC impressions `< 750` after clean indexing & 301s → **Audit technical crawlability, internal links, and search intent mismatch before investing more dev cycles.** |
| **2. Short-Form Video (YouTube Shorts / TikTok)** | Any single Short hits `≥ 2,000` organic views OR combined video channels drive `≥ 20` UTM Play installs with `≥ 60%` app activation → **Produce a 12-video series (6 EN + 6 ES) covering NEC fill, rolling offsets, kicked 90s, and 4-point saddles.** | Views `500–1,999` with high watch-through (`>65%`) but `< 10` installs → **Strengthen 22–30s visual app payoff & pinned-comment CTA hook.** | All 6 videos `< 300` views AND `< 5` total installs after 30 days → **Pause short-form production; reallocate hours to high-intent SEO guides & community answers.** |
| **3. Community Distribution (Reddit / Forums)** | Zero mod removals, positive upvote ratio (`≥ 80%`), AND `≥ 15` tracked visits/installs → **Maintain 2 high-value posts/month + ongoing apprentice Q&A cadence.** | High upvotes (`≥ 80%`) but `< 5` visits → **Keep for brand trust/SEO mentions; add deeper worked diagrams that naturally prompt "what tool is that?" replies.** | Negative reception or mod warnings → **Halt link sharing completely; stay pure-value Q&A only.** |
| **4. Spanish (`es-US` / `es-MX`) Growth Push** | `es-US` Play Store CVR increases `≥ +3 pp` AND Spanish D7 retention matches `en` within `3 pp` → **Translate Guides 1–3 into native Mexican/US electrician Spanish (`conducto`, `desplazamiento`, `silla de 3 puntos`) and expand ES Shorts.** | `es-US` installs rise but activation `< 55%` or D7 trails `en` by `> 6 pp` → **Audit remaining untranslated screens & metric/imperial defaults before scaling ES acquisition.** | `es-US` CVR drops vs. baseline → **Re-test Spanish Play Store copy & screenshot headlines with native US/MX electricians.** |
| **5. Overall North Star Gate (Next Sprint Focus)** | Weekly activated organic users **`≥ 35/wk`** (`+40%+` vs. baseline) AND Play Search Terms threshold unlocked → **Double down on organic engine + run first Play Store A/B experiment using real unlocked search terms.** | Weekly activated organic users **`26–34/wk`** → **Keep highest-performing channel (top UTM source by activated user) and cut lowest-performing channel.** | Weekly activated organic users **`≤ 25/wk`** (flat vs. baseline) → **Hold new acquisition experiments; investigate Play Store keyword ranking drop or onboarding activation friction first.** |
