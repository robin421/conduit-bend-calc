#!/usr/bin/env python3
"""Generate 6 standalone SEO landing pages into the expo web export dist/.

Usage:
    python3 scripts/gen-seo-pages.py dist/ https://bendcalc.wattflow.net [--ga4-id G-XXXX]

The GA4 measurement ID can also come from the GA4_ID env var. When no ID is
given, no GA4 code is emitted (pages stay analytics-free).

Each page is written to dist/<slug>/index.html so Cloudflare Pages serves it
at /<slug> and /<slug>/. Run AFTER `npx expo export --platform web` (and after
scripts/inject-web-seo.py, order between the two doesn't matter).
"""
import html
import os
import re
import sys

PLAY_URL = "https://play.google.com/store/apps/details?id=com.robin421.conduitbendcalc"

BASE_CSS = """
body { font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.65; color: #1a1a1a; }
h1 { font-size: 1.6rem; line-height: 1.3; } h2 { font-size: 1.15rem; margin-top: 1.8rem; }
.muted { color: #666; font-size: .9rem; }
table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: .95rem; }
th, td { border: 1px solid #ddd; padding: .45rem .6rem; text-align: left; }
th { background: #f5f5f5; font-weight: 600; }
.cta { border: 1px solid #c9a227; border-radius: 8px; padding: 1rem 1.2rem; margin: 2rem 0; background: #fffdf5; }
.cta p { margin: .4rem 0; }
.related { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #e0e0e0; }
.related ul { padding-left: 1.2rem; }
footer { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #e0e0e0; color: #666; font-size: .85rem; }
a { color: #0b5cad; }
"""

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}" />
<link rel="canonical" href="{canonical}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Conduit Bend Calc" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:url" content="{canonical}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{desc}" />
<style>{css}</style>
{ga4}
</head>
<body>
<h1>{h1}</h1>
{body}
<div class="cta">
<p><strong>Try it free:</strong> <a href="{base}/">{cta_label}</a> &mdash; all six bend calculators, no sign-up.</p>
<p><a href="{play_url}" onclick="if(window.gtag)gtag('event','google_play_click',{{source:'seo_page'}})">Get Conduit Bend Calc on Google Play</a> for bender calibration and Pro tools.</p>
</div>
<nav class="related" aria-label="Related calculators">
<p><strong>Related:</strong></p>
<ul>
{related}
</ul>
</nav>
<footer>&copy; 2026 Conduit Bend Calc &middot; <a href="{base}/">bendcalc.wattflow.net</a> &middot; <a href="{base}/privacy.html">Privacy Policy</a></footer>
</body>
</html>
"""

GA4_TEMPLATE = """<script async src="https://www.googletagmanager.com/gtag/js?id={gid}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){{dataLayer.push(arguments);}}
gtag('js', new Date());
gtag('config', '{gid}');
</script>"""

# ---------------------------------------------------------------------------
# Page content. Titles <= 60 chars, descriptions <= 160 chars (asserted below).
# ---------------------------------------------------------------------------
PAGES = [
    dict(
        slug="conduit-bending-calculator",
        title="Conduit Bending Calculator \u2014 Free EMT Bending Tool",
        desc="Free conduit bending calculator for electricians: offsets, 90\u00b0 stubs, "
             "3-point and 4-point saddles, rolling offsets, kicked 90s, mark spacing and take-up.",
        h1="Conduit Bending Calculator",
        cta_label="Open the free conduit bending calculator",
        body="""
<p>Bending EMT conduit is one of the first skills an electrician learns &mdash; and one of
the last to truly master. Every bend is a small geometry problem: where to mark the
conduit, how much the bend shortens the run (<em>shrink</em>), and how far the bend
starts from the mark (<em>take-up</em>). Get any of these wrong and the conduit does not
land where the box is. This free calculator handles the math for the six bends you will
use every day on the job.</p>

<h2>The six bends every electrician uses</h2>
<ul>
<li><strong>Offset bend</strong> &mdash; two equal, opposite bends that shift the conduit
to clear an obstacle or enter a box at the right height. The workhorse of commercial rough-in.</li>
<li><strong>90&deg; stub-up</strong> &mdash; a single right-angle bend that brings conduit
up out of a slab or into a panel at an exact height.</li>
<li><strong>3-point saddle</strong> &mdash; jumps over a small obstacle, like a pipe or a
beam, with a center bend and two side bends.</li>
<li><strong>4-point saddle</strong> &mdash; two back-to-back offsets that box around a wide
obstruction such as a duct or pipe rack.</li>
<li><strong>Rolling offset</strong> &mdash; an offset that changes height and horizontal
position at the same time, bent in two planes.</li>
<li><strong>Kicked 90&deg;</strong> &mdash; a 90&deg; with a short kick at one end, common
for entering panels and boxes.</li>
</ul>

<h2>The three numbers behind every bend</h2>
<p><strong>Mark spacing</strong> is the distance between bend marks: obstacle height
&times; the <em>multiplier</em> for your bend angle (the multiplier is 1/sin of the angle;
at 30&deg; it is exactly 2.0, so a 6&quot; offset needs 12&quot; between marks).</p>
<p><strong>Shrink</strong> is the conduit length a bend &ldquo;eats.&rdquo; That same 6&quot;
offset at 30&deg; shrinks the run by 1.5&quot;. Forget shrink and your couplings land in
the wrong place &mdash; and shrink compounds when a run has more than one bend.</p>
<p><strong>Take-up</strong> is how far the bend starts before your mark. For a 90&deg;
stub with 1/2&quot; EMT, a standard hand bender takes up 5&quot;, so you mark 5&quot;
short of the target height. Take-up is a property of the bender head, not a formula.</p>

<h2>How to use the calculator</h2>
<p>Pick a bend, enter the height and angle (and your bender if you know it), and get mark
locations, remaining straight lengths, minimum conduit length, and a feasibility check
that warns you <em>before</em> a bend is physically too tight to make. Results display in
fractional inches &mdash; the way tape measures read &mdash; with decimal inches and
metric (mm) one tap away.</p>

<h2>Field tips that save conduit</h2>
<ul>
<li>Bend a test piece on scrap whenever you pick up an unfamiliar bender. No two benders
bend exactly alike.</li>
<li>Add up shrink for <em>every</em> bend in the run before you cut.</li>
<li>Keep all bends of a saddle in the same plane, or the run will dogleg.</li>
<li>When a bend feels wrong halfway through, stop &mdash; re-bending a kinked stick
wastes more conduit than starting over.</li>
</ul>
""",
    ),
    dict(
        slug="offset-calculator",
        title="Offset Bend Calculator \u2014 Multiplier & Shrink Chart",
        desc="Free offset bend calculator with multiplier chart (10\u00b0\u201360\u00b0), shrink per "
             "inch, and step-by-step marking for clean EMT offsets.",
        h1="Offset Bend Calculator",
        cta_label="Open the free offset bend calculator",
        body="""
<p>An offset moves conduit around an obstacle &mdash; or up to box height &mdash; using
two equal bends in opposite directions. The math is simple once you know the
<em>multiplier</em>: mark spacing equals offset height times the multiplier for your bend
angle.</p>

<h2>Multiplier and shrink chart</h2>
<p>The multiplier is the cosecant of the bend angle (1/sin&nbsp;&theta;). Shrink is given
per inch of offset height &mdash; multiply by your height to get total shrink.</p>
<table>
<tr><th>Bend angle</th><th>Multiplier</th><th>Shrink per inch</th></tr>
<tr><td>10&deg;</td><td>6.0</td><td>1/16&quot;</td></tr>
<tr><td>15&deg;</td><td>3.9</td><td>1/8&quot;</td></tr>
<tr><td>22.5&deg;</td><td>2.6</td><td>3/16&quot;</td></tr>
<tr><td>30&deg;</td><td>2.0</td><td>1/4&quot;</td></tr>
<tr><td>45&deg;</td><td>1.4</td><td>3/8&quot;</td></tr>
<tr><td>60&deg;</td><td>1.2</td><td>1/2&quot;</td></tr>
</table>
<p><strong>30&deg; is the everyday choice</strong> &mdash; the math is trivial (&times;2),
and shrink stays moderate. Use 22.5&deg; or 10&deg; in tight quarters where every
fraction of shrink matters; use 45&deg; or 60&deg; when you need to clear a tall obstacle
in a short distance.</p>

<h2>Worked example</h2>
<p>You need a 6&quot; offset at 30&deg;. Mark spacing = 6 &times; 2.0 = <strong>12&quot;</strong>.
Shrink = 6 &times; 1/4&quot; = <strong>1.5&quot;</strong> &mdash; the finished run comes up
1.5&quot; short, so add that to your total conduit length before cutting.</p>

<h2>How to bend an offset, step by step</h2>
<ol>
<li>Mark the location of the first bend on the conduit.</li>
<li>Measure the spacing from the chart and mark the second bend.</li>
<li>Put the bender's arrow on the first mark and bend to your angle (30&deg;).</li>
<li>Flip the bender 180&deg; so the handle points the opposite way, line the arrow up
with the second mark, and bend back to 30&deg;.</li>
<li>Sight down the conduit: both ends parallel, offset height correct.</li>
</ol>

<h2>Mistakes to avoid</h2>
<ul>
<li><strong>Forgetting shrink</strong> &mdash; the single most common offset error. The
calculator adds it for you.</li>
<li>Bending both bends the <em>same</em> direction, which makes a useless zigzag instead
of an offset.</li>
<li>Using the multiplier for 30&deg; but actually bending 45&deg; &mdash; check the angle
against the bender's degree marks, not by feel.</li>
</ul>
""",
    ),
]

PAGES += [
    dict(
        slug="rolling-offset-calculator",
        title="Rolling Offset Calculator \u2014 True Offset & Rotation",
        desc="Free rolling offset calculator: true offset = \u221a(rise\u00b2 + roll\u00b2), plus mark "
             "spacing and rotation angle for bending conduit in two planes.",
        h1="Rolling Offset Calculator",
        cta_label="Open the free rolling offset calculator",
        body="""
<p>A rolling offset changes elevation <em>and</em> horizontal position at the same time
&mdash; for example, running conduit up a wall while also shifting sideways around a
column, all in one fitting-free run. It is an offset bent in two planes at once, which
is why flat offset math alone will not get you there.</p>

<h2>The true offset formula</h2>
<p>First combine the vertical rise and the horizontal roll into a single number, the
<em>true offset</em>:</p>
<p style="text-align:center"><strong>True offset = &radic;(rise&sup2; + roll&sup2;)</strong></p>
<p>Example: 6&quot; of rise with 8&quot; of roll gives &radic;(36 + 64) = <strong>10&quot;</strong>
of true offset. From here it works like a regular offset: mark spacing = true offset
&times; multiplier. At 30&deg;: 10 &times; 2.0 = <strong>20&quot;</strong> between marks.</p>

<h2>The rotation angle</h2>
<p>After the first bend, you roll the bender (and the conduit) before making the second
bend, so it lands in the correct plane. The rotation angle is:</p>
<p style="text-align:center"><strong>Rotation = arctan(roll / rise)</strong></p>
<p>For 6&quot; rise and 8&quot; roll: arctan(8/6) &asymp; <strong>53.1&deg;</strong>. Mark the
rotation line on the conduit so the second bend goes in exactly the right plane &mdash;
this is the step most people get wrong on their first rolling offset.</p>

<h2>Shrink on a rolling offset</h2>
<p>Shrink applies to the <em>true</em> offset, not the rise or roll alone. A 10&quot; true
offset at 30&deg; loses 10 &times; 1/4&quot; = <strong>2.5&quot;</strong> of run length.
Add it to your total before cutting.</p>

<h2>Field tips</h2>
<ul>
<li>Sketch the rise-vs-roll triangle on the conduit or a scrap of drywall before you
bend. Seeing the triangle keeps the two dimensions honest.</li>
<li>Rolling offsets magnify small angle errors &mdash; verify the first bend's angle
before committing to the second.</li>
<li>Sanity check: when rise equals roll, the rotation angle is exactly 45&deg;.</li>
<li>If the rotation feels awkward to hold, bend the offset in the flat plane first and
rotate the whole assembly into place only if the run allows it &mdash; but the math
above is what keeps both ends where the plan says they go.</li>
</ul>
""",
    ),
    dict(
        slug="stub-up-calculator",
        title="90\u00b0 Stub-Up Calculator \u2014 Take-Up Chart for EMT",
        desc="Free 90\u00b0 stub-up calculator with take-up chart: 1/2\u2033 EMT = 5\u2033, "
             "3/4\u2033 = 6\u2033, 1\u2033 = 8\u2033. Mark at target height minus take-up.",
        h1="90\u00b0 Stub-Up Calculator",
        cta_label="Open the free 90\u00b0 stub-up calculator",
        body="""
<p>A stub-up is a single 90&deg; bend that brings conduit to an exact height &mdash; out
of a concrete slab, into the bottom of a panel, up to a box. The whole trick is one
number: <em>take-up</em>.</p>

<h2>What take-up is</h2>
<p>Every bender head starts the bend a fixed distance <em>before</em> the arrow mark. That
distance is the take-up, and it depends on the bender and the conduit size &mdash; there
is no universal formula, which is why manufacturers stamp it right on the bender head.
The rule is simple:</p>
<p style="text-align:center"><strong>Mark location = target height &minus; take-up</strong></p>

<h2>Take-up chart (hand benders, EMT)</h2>
<table>
<tr><th>Conduit size</th><th>Take-up</th></tr>
<tr><td>1/2&quot; EMT</td><td>5&quot;</td></tr>
<tr><td>3/4&quot; EMT</td><td>6&quot;</td></tr>
<tr><td>1&quot; EMT</td><td>8&quot;</td></tr>
</table>
<p>Ideal and Klein hand benders agree on these values. Still, always check your own
bender's markings &mdash; some heads stamp the take-up on the shoe, and shared job-site
benders get mixed up.</p>

<h2>Worked example</h2>
<p>You need a 12&quot; stub with 1/2&quot; EMT: mark at 12 &minus; 5 = <strong>7&quot;</strong>
from the end of the conduit. Put the arrow on the mark, bend to 90&deg;, and the back of
the bend lands at exactly 12&quot;.</p>

<h2>How to bend a stub-up, step by step</h2>
<ol>
<li>Measure from the end and mark at (target height &minus; take-up).</li>
<li>Line the bender's arrow up with the mark. Keep steady foot pressure so the conduit
does not walk.</li>
<li>Bend with smooth strokes to 90&deg;, using the bender's degree marks &mdash; not
guesswork.</li>
<li>Check the result against a square or the floor.</li>
</ol>

<h2>When the height is consistently off</h2>
<p>If every stub comes out, say, 1/4&quot; short on <em>your</em> bender, that is not a
math problem &mdash; it is a calibration problem. Bend one test stub on scrap, measure
the error, and apply that correction to every future mark. That single test bend is also
how you verify a bender you have never used before.</p>

<h2>Mistakes to avoid</h2>
<ul>
<li>Measuring the mark from the wrong end of the conduit.</li>
<li>Letting the conduit slip so the arrow drifts off the mark mid-bend.</li>
<li>Mixing up take-up values between bender brands on a shared job site.</li>
</ul>
""",
    ),
]

PAGES += [
    dict(
        slug="3-point-saddle-calculator",
        title="3-Point Saddle Calculator \u2014 Bend Over Obstacles",
        desc="Free 3-point saddle calculator: center bend 45\u00b0, two 22.5\u00b0 bends at 2.5\u00d7 "
             "obstruction height. Jump pipes and conduit cleanly.",
        h1="3-Point Saddle Calculator",
        cta_label="Open the free 3-point saddle calculator",
        body="""
<p>A 3-point saddle jumps conduit over a small obstacle &mdash; another pipe, a piece of
all-thread, a shallow beam &mdash; using three bends: one in the center and two on the
sides. It is the fastest way to clear something in your path without cutting in a
fitting.</p>

<h2>The layout</h2>
<p>Mark the center of the obstacle on the conduit &mdash; that is where the center bend
goes. Bend <strong>45&deg;</strong> at the center mark. The two side bends are each
<strong>22.5&deg;</strong>, bent in the <em>opposite</em> direction, placed at
<strong>2.5 &times; the obstruction height</strong> from the center mark on each
side.</p>
<p>The 2.5H rule is the trade convention every journeyman learns; the pure geometry
works out to about 2.61H. In practice, 2.5H lands saddles dead on, because the small
difference hides inside normal bending tolerance.</p>

<h2>Worked example</h2>
<p>Obstacle 4&quot; tall &mdash; measure the <em>full</em> height, including the pipe's
own diameter. Center bend 45&deg; at the middle. Side bends 22.5&deg; at 4 &times; 2.5 =
<strong>10&quot;</strong> on each side of center. Total span: <strong>20&quot;</strong>.</p>

<h2>How to bend a 3-point saddle, step by step</h2>
<ol>
<li>Mark the center at the obstacle's middle.</li>
<li>Measure 2.5H each way from center and mark the two side bends.</li>
<li>Bend the center mark to 45&deg;.</li>
<li>Flip the bender and bend each side mark to 22.5&deg; in the opposite direction.</li>
<li>Lay the saddle over the obstacle: the conduit should clear it with both ends back in
line.</li>
</ol>

<h2>Tips</h2>
<ul>
<li>The center bend takes most of the shrink &mdash; the calculator accounts for it, so
check the total length before cutting.</li>
<li>Keep all three bends in the same plane, or the saddle will twist and the run will
dogleg past the obstacle.</li>
<li>Measure the obstruction height generously. A saddle that is 1/4&quot; too tall still
fits; one that is 1/4&quot; too short does not.</li>
<li>For obstacles wider than about 6&quot;, switch to a 4-point saddle instead &mdash;
three bends cannot span that cleanly.</li>
</ul>
""",
    ),
    dict(
        slug="4-point-saddle-calculator",
        title="4-Point Saddle Calculator \u2014 Two Offset Bends",
        desc="Free 4-point saddle calculator: two matching offsets box around wide "
             "obstructions. Spacing, shrink and tight-bend check included.",
        h1="4-Point Saddle Calculator",
        cta_label="Open the free 4-point saddle calculator",
        body="""
<p>A 4-point saddle is two offset bends placed back to back &mdash; four bends total
&mdash; that box conduit around a <em>wide</em> obstruction like a duct or a pipe rack.
Think of it as an offset up, a straight section across the obstacle, and an offset back
down.</p>

<h2>The layout</h2>
<p>Each half is a standard offset: pick one angle (30&deg; is typical) and one height
(the clearance you need over the obstruction). Mark spacing inside each offset is height
&times; multiplier &mdash; at 30&deg;, that is simply height &times; 2. The distance
between the two offset centers must clear the obstruction's width plus a little
breathing room. And remember: shrink applies <strong>twice</strong>, once per offset, so
a pair of 4&quot; offsets at 30&deg; eats 2&quot; of run length.</p>

<h2>Feasibility: the tight-bend check</h2>
<p>The classic failure of 4-point saddles is spacing the two offsets too close together:
the bends overlap, the conduit kinks, or the second bend lands on top of the first. If
the calculator flags a bend as too tight, widen the saddle, drop to a shallower angle,
or find clearance another way. Never force a tight bend &mdash; kinked EMT is scrap,
and a kinked run has to come out.</p>

<h2>How to bend a 4-point saddle, step by step</h2>
<ol>
<li>Measure the obstruction's width and the clearance height you need.</li>
<li>Mark offset #1's two bend points (height &times; multiplier apart).</li>
<li>Mark offset #2 as a mirror image, leaving enough straight conduit between the two
offset centers to clear the width.</li>
<li>Bend offset #1, then bend offset #2 as its mirror.</li>
<li>Test-fit over the obstruction <em>before</em> cutting to final length &mdash; shrink
has already shortened the run.</li>
</ol>

<h2>Tips</h2>
<ul>
<li>Mark all four points before bending anything. It is easy to mirror-image the second
offset the wrong way once you are holding the bender.</li>
<li>Keep the same angle on all four bends &mdash; that is what keeps both ends of the
run parallel.</li>
<li>When the obstruction is both tall <em>and</em> wide, do the math first: the combined
shrink of two tall offsets surprises a lot of people on their first 4-point saddle.</li>
</ul>
""",
    ),
]


def word_count(html_body: str) -> int:
    text = re.sub(r"<[^>]+>", " ", html_body)
    text = html.unescape(text)
    return len([w for w in text.split() if w.strip()])


def render_page(page: dict, base_url: str, ga4_id: str | None) -> str:
    canonical = f"{base_url}/{page['slug']}/"
    related = "\n".join(
        f'  <li><a href="{base_url}/{p["slug"]}/">{html.escape(p["h1"])}</a></li>'
        for p in PAGES
        if p["slug"] != page["slug"]
    )
    ga4 = GA4_TEMPLATE.format(gid=html.escape(ga4_id)) if ga4_id else ""
    return PAGE_TEMPLATE.format(
        title=html.escape(page["title"]),
        desc=html.escape(page["desc"]),
        canonical=canonical,
        h1=html.escape(page["h1"]),
        body=page["body"],
        cta_label=html.escape(page["cta_label"]),
        base=base_url,
        play_url=PLAY_URL,
        related=related,
        css=BASE_CSS.strip(),
        ga4=ga4,
    )


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--ga4-id")]
    ga4_flag = next(
        (sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--ga4-id"
         and i + 1 < len(sys.argv)),
        None,
    )
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    export_dir = args[0].rstrip("/")
    base_url = args[1].rstrip("/")
    ga4_id = ga4_flag or os.environ.get("GA4_ID") or None

    # Sanity checks: title/description lengths and body word counts.
    for page in PAGES:
        assert len(page["title"]) <= 60, f"title too long ({len(page['title'])}): {page['slug']}"
        assert len(page["desc"]) <= 160, f"desc too long ({len(page['desc'])}): {page['slug']}"
        wc = word_count(page["body"])
        assert 250 <= wc <= 650, f"word count {wc} out of range: {page['slug']}"

    for page in PAGES:
        out_dir = os.path.join(export_dir, page["slug"])
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, "index.html")
        with open(out_path, "w") as f:
            f.write(render_page(page, base_url, ga4_id))
        print(f"wrote {out_path} ({word_count(page['body'])} words, ga4={'on' if ga4_id else 'off'})")


if __name__ == "__main__":
    main()
