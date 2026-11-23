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
from __future__ import annotations

import html
import os
import re
import sys
from urllib.parse import quote, urlparse

PLAY_URL = "https://play.google.com/store/apps/details?id=com.robin421.conduitbendcalc"

# Legacy static calculator slugs superseded by interactive SPA tool pages (301 in _redirects).
REDIRECTED_SLUGS = {
    "offset-calculator",
    "stub-up-calculator",
    "3-point-saddle-calculator",
    "4-point-saddle-calculator",
    "conduit-shrink-calculator",
    "rolling-offset-calculator",
    "kick-90-calculator",
}

CANONICAL_TOOLS = [
    ("offset", "Offset Bend Calculator"),
    ("stub-up", "90° Stub-Up Calculator"),
    ("3-point-saddle", "3-Point Saddle Calculator"),
    ("conduit-fill", "NEC Conduit Fill Calculator"),
    ("4-point-saddle", "4-Point Saddle Calculator"),
    ("shrink", "Conduit Shrink Calculator"),
    ("rolling-offset", "Rolling Offset Calculator"),
    ("kicked-90", "Kicked 90° Calculator"),
    ("wire-size", "NEC Wire Size Calculator"),
    ("voltage-drop", "NEC Voltage Drop Calculator"),
]


def build_play_url(slug: str, placement: str) -> str:
    clean_slug = re.sub(r"[^a-z0-9_-]", "", slug.lower())
    clean_placement = re.sub(r"[^a-z0-9_-]", "", placement.lower())
    referrer = (
        f"utm_source=web_seo&utm_medium=article_cta"
        f"&utm_campaign={clean_slug}&utm_content={clean_placement}"
    )
    return f"{PLAY_URL}&referrer={quote(referrer, safe='')}"

BASE_CSS = """
*, *::before, *::after { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  margin: 0;
  padding: 0;
  background: #F5F8FB;
  color: #0F2B46;
  line-height: 1.65;
}
.topbar {
  background: #0F2B46;
  color: #FFFFFF;
}
.topbar-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 8px 16px;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.brand-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #FFFFFF;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  min-height: 44px;
}
.topbar-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 14px;
  background: #F4C317;
  color: #0F2B46;
  font-weight: 700;
  font-size: .9rem;
  border-radius: 8px;
  text-decoration: none;
  white-space: nowrap;
}
.topbar-cta:focus-visible, .hero-cta:focus-visible, .related a:focus-visible, a:focus-visible {
  outline: 2px solid #806000;
  outline-offset: 2px;
}
.topbar-cta:focus-visible {
  outline-color: #F4C317;
}
.page-shell {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px 16px 40px;
}
.main-col {
  min-width: 0;
}
.side-col {
  margin-top: 24px;
}
h1 { font-size: 1.6rem; line-height: 1.3; margin: 0 0 12px; color: #0F2B46; }
h2 { font-size: 1.15rem; margin-top: 1.8rem; color: #0F2B46; }
h3 { font-size: 1rem; margin-top: 1.2rem; color: #0F2B46; }
.muted { color: #52677B; font-size: .9rem; }
.hero-cta-bar {
  margin: 16px 0 20px;
  padding: 12px;
  background: #FFFFFF;
  border: 1px solid #D9E2EB;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.hero-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 18px;
  background: #F4C317;
  color: #0F2B46;
  font-weight: 700;
  font-size: .95rem;
  border-radius: 8px;
  text-decoration: none;
}
.hero-cta:hover, .topbar-cta:hover {
  background: #E2B410;
}
.quick-tools {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #D9E2EB;
}
.quick-tool-link {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 6px 12px;
  background: #F5F8FB;
  border: 1px solid #D9E2EB;
  border-radius: 8px;
  color: #0F2B46;
  font-size: .88rem;
  font-weight: 600;
  text-decoration: none;
}
.quick-tool-link:hover {
  border-color: #806000;
  background: #FFFFFF;
}
.table-wrap {
  overflow-x: auto;
  margin: 1rem 0;
  border: 1px solid #D9E2EB;
  border-radius: 8px;
  background: #FFFFFF;
}
table { border-collapse: collapse; width: 100%; font-size: .95rem; }
th, td { border-bottom: 1px solid #D9E2EB; padding: .55rem .7rem; text-align: left; }
tr:last-child td { border-bottom: none; }
th { background: #F5F8FB; font-weight: 600; color: #0F2B46; }
.table-wrap td { font-variant-numeric: tabular-nums; white-space: nowrap; }
.diagram-card {
  margin: 1rem 0;
  padding: 12px;
  background: #FFFFFF;
  border: 1px solid #D9E2EB;
  border-radius: 8px;
}
.diagram-card svg {
  width: 100%;
  height: auto;
  display: block;
}
.diagram-caption {
  margin: 8px 0 0;
  font-size: .85rem;
  color: #52677B;
}
.callout-box {
  margin: 1rem 0;
  padding: 12px 14px;
  background: #FFFFFF;
  border: 1px solid #D9E2EB;
  border-left: 4px solid #F4C317;
  border-radius: 8px;
}
.callout-box p { margin: .4rem 0; }
.callout-box p:first-child { margin-top: 0; }
.callout-box p:last-child { margin-bottom: 0; }
.inline-cta-box {
  margin: 1.4rem 0;
  padding: 14px 16px;
  background: #FFFFFF;
  border: 1px solid #D9E2EB;
  border-radius: 8px;
}
.inline-cta-box p { margin: .4rem 0; }
.inline-cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.inline-cta-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 16px;
  background: #F5F8FB;
  color: #0F2B46;
  border: 1px solid #D9E2EB;
  font-weight: 700;
  font-size: .92rem;
  border-radius: 8px;
  text-decoration: none;
}
.inline-cta-secondary:hover {
  border-color: #806000;
  background: #FFFFFF;
}
.cta {
  border: 1px solid #D9E2EB;
  border-radius: 8px;
  padding: 1rem 1.2rem;
  margin: 0 0 16px;
  background: #FFFFFF;
}
.cta p { margin: .4rem 0; }
.related {
  margin-top: 16px;
  padding: 1rem 1.2rem;
  background: #FFFFFF;
  border: 1px solid #D9E2EB;
  border-radius: 8px;
}
.related p { margin: 0 0 10px; }
.related ul { list-style: none; padding: 0; margin: 0; }
.related a {
  display: block;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid #D9E2EB;
  border-radius: 8px;
  margin-bottom: 8px;
  background: #F5F8FB;
  color: #0F2B46;
  font-weight: 600;
  text-decoration: none;
}
.related li:last-child a { margin-bottom: 0; }
.related a:hover { border-color: #806000; background: #FFFFFF; }
footer {
  max-width: 1080px;
  margin: 0 auto;
  padding: 16px 16px 32px;
  border-top: 1px solid #D9E2EB;
  color: #52677B;
  font-size: .85rem;
}
a { color: #0F2B46; }
@media (min-width: 1024px) {
  .topbar-inner { padding: 8px 24px; }
  .page-shell {
    max-width: 1080px;
    padding: 28px 24px 48px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 28px;
    align-items: start;
  }
  .side-col {
    margin-top: 0;
    position: sticky;
    top: 24px;
  }
  footer { padding: 20px 24px 40px; }
}
"""

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}" />
<link rel="canonical" href="{canonical}" />
<link rel="alternate" href="android-app://com.robin421.conduitbendcalc/https/{host}/{slug}/" />
<meta property="al:android:package" content="com.robin421.conduitbendcalc" />
<meta property="al:android:url" content="{canonical}" />
<meta property="al:android:app_name" content="Conduit Bend Calc" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Conduit Bend Calc" />
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{desc}" />
<meta property="og:url" content="{canonical}" />
<meta property="og:image" content="{base}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="{base}/og-image.png" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{desc}" />
<style>{css}</style>
{ga4}
{amp_script}
{faq_jsonld}
</head>
<body>
<header class="topbar">
  <div class="topbar-inner">
    <a class="brand-link" href="{base}/">Conduit Bend Calc</a>
    <a class="topbar-cta" href="{tool_url}" onclick="if(window.__ampTrack)window.__ampTrack('seo_landing_cta_clicked','topbar_cta')">Open Calculator &rarr;</a>
  </div>
</header>
<div class="page-shell">
<main class="main-col">
<h1>{h1}</h1>
{body}
</main>
<aside class="side-col">
<div class="cta">
<p><strong>Try it free:</strong> <a href="{tool_url}" onclick="if(window.__ampTrack)window.__ampTrack('seo_landing_cta_clicked','sidebar_cta')">{cta_label}</a> &mdash; instant mark spacing &amp; shrink, no sign-up.</p>
<p><a href="{play_url}" target="_blank" rel="noopener noreferrer" onclick="if(window.gtag)gtag('event','google_play_click',{{source:'seo_page'}});if(window.__ampTrack)window.__ampTrack('google_play_cta_clicked','sidebar_play_cta')">Get Conduit Bend Calc on Google Play</a> for 100% offline use and custom bender calibration.</p>
</div>
<nav class="related" aria-label="Related calculators">
<p><strong>Related:</strong></p>
<ul>
{related}
</ul>
</nav>
</aside>
</div>
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

AMPLITUDE_WEB_API_KEY = "8e0f0f58b4e02e2a2583aae77b8c8d9b"
AMPLITUDE_TEMPLATE = """<script>
(function(){{
  var KEY={api_key};
  var SLUG={page_slug};
  var LS_KEY='@conduit_amplitude_device_id';
  var UTM_KEY='@conduit_amplitude_utm';
  function isExcluded(){{
    try{{
      var h=(window.location&&window.location.hostname||'').toLowerCase();
      if(h==='localhost'||h==='127.0.0.1'||h==='0.0.0.0'||h.endsWith('.local')||h.endsWith('.pages.dev'))return true;
      if(navigator.webdriver)return true;
      if(/Googlebot|Bingbot|HeadlessChrome|Playwright|Puppeteer/i.test(navigator.userAgent||''))return true;
    }}catch(_){{}}
    return false;
  }}
  function cleanUtm(v){{
    if(typeof v!=='string')return '';
    return v.trim().toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,40);
  }}
  function getSessionUtm(){{
    var keys=['utm_source','utm_medium','utm_campaign'];
    var out={{}};
    var hasUrl=false;
    try{{
      if(window.location&&window.location.search&&typeof URLSearchParams==='function'){{
        var sp=new URLSearchParams(window.location.search);
        for(var i=0;i<keys.length;i++){{
          var k=keys[i];
          var c=cleanUtm(sp.get(k)||'');
          if(c){{out[k]=c;hasUrl=true;}}
        }}
      }}
    }}catch(_){{}}
    if(hasUrl){{
      try{{if(window.sessionStorage)window.sessionStorage.setItem(UTM_KEY,JSON.stringify(out));}}catch(_){{}}
      return out;
    }}
    try{{
      var raw=window.sessionStorage&&window.sessionStorage.getItem(UTM_KEY);
      if(raw){{
        var parsed=JSON.parse(raw);
        if(parsed&&typeof parsed==='object'){{
          for(var j=0;j<keys.length;j++){{
            var kk=keys[j];
            var cc=cleanUtm(parsed[kk]||'');
            if(cc)out[kk]=cc;
          }}
        }}
      }}
    }}catch(_){{}}
    return out;
  }}
  var sessionUtm=getSessionUtm();
  if(isExcluded()){{window.__ampTrack=function(){{}};return;}}
  function getDeviceId(){{
    try{{
      var id=window.localStorage&&window.localStorage.getItem(LS_KEY);
      if(id&&id.length>=8)return id;
      id=(window.crypto&&window.crypto.randomUUID)?window.crypto.randomUUID():('web-'+Math.random().toString(16).slice(2)+Date.now().toString(16));
      if(window.localStorage)window.localStorage.setItem(LS_KEY,id);
      return id;
    }}catch(_){{return 'web-anon-'+Date.now().toString(16);}}
  }}
  var sid=Date.now();
  function send(ev,src){{
    try{{
      if(!navigator.sendBeacon)return;
      var now=Date.now();
      var props={{page_slug:SLUG,source:src}};
      if(ev==='google_play_cta_clicked'){{
        props.utm_source='web_seo';
        props.utm_medium='article_cta';
        props.utm_campaign=SLUG;
        props.cta_placement=src;
      }}else{{
        if(sessionUtm.utm_source)props.utm_source=sessionUtm.utm_source;
        if(sessionUtm.utm_medium)props.utm_medium=sessionUtm.utm_medium;
        if(sessionUtm.utm_campaign)props.utm_campaign=sessionUtm.utm_campaign;
      }}
      var body=JSON.stringify({{
        api_key:KEY,
        events:[{{
          device_id:getDeviceId(),
          session_id:sid,
          event_type:ev,
          time:now,
          platform:'web',
          language:navigator.language||'en',
          event_properties:props
        }}]
      }});
      navigator.sendBeacon('https://api2.amplitude.com/2/httpapi',body);
    }}catch(_){{}}
  }}
  window.__ampTrack=send;
  send('seo_landing_viewed','seo_landing');
}})();
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
position at the same time, bent in two planes (<a href="/rolling-offset/">Rolling Offset Calculator</a>).</li>
<li><strong>Kicked 90&deg;</strong> &mdash; a 90&deg; with a short kick at one end, common
for entering panels and boxes (<a href="/kicked-90/">Kicked 90&deg; Calculator</a>).</li>
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

<h2>Watch: an offset bend calculated in 30 seconds</h2>
<p>See the offset math in action &mdash; a 4&quot; offset at 30&deg;, with mark spacing
and shrink computed in fractions, exactly as the free calculator does it:
<a href="https://www.youtube.com/watch?v=wwvxuB244Hc">watch the 38-second demo on
YouTube</a>.</p>
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


# ---------------------------------------------------------------------------
# Batch 2 (2026-09-29): kick-90, 90-degree bend, bending chart, shrink,
# parallel offset (honest guide — no standalone calculator in the app),
# beginner EMT guide.
# ---------------------------------------------------------------------------
PAGES += [
    dict(
        slug="kick-90-calculator",
        title="90\u00b0 Kick Multiplier Chart & Free Kick 90 Calculator",
        desc="Free 90\u00b0 kick calculator & multiplier chart: find mark spacing, developed "
             "length, kick angle, and total gain for EMT panel entries.",
        h1="90\u00b0 Kick Calculator & Multiplier Chart",
        cta_label="Open the free 90\u00b0 stub & kick calculator",
        quick_links=[
            ("/stub-up/", "90° Stub-Up Calculator"),
            ("/offset/", "Offset Multiplier Calculator"),
            ("/", "Kicked 90° Calculator (Full App)"),
        ],
        body="""
<p>A kicked 90\u00b0 is a 90\u00b0 bend with a short angled <em>kick</em> at one end &mdash;
the bend you reach for when a stub has to enter a panel or box whose knockout is not
directly above the run. It is one compound bend: a full 90\u00b0 plus a second bend at a
small kick angle &kappa;, with a short straight section between them.</p>

<h2>How the layout works</h2>
<p>The calculator lays out two marks, measured as <em>developed length</em> along the
conduit &mdash; the distance the tape actually travels, following the metal:</p>
<ul>
<li><strong>Mark 1</strong> &mdash; the tangent start of the 90\u00b0 bend. This is your
reference point: everything is measured from here.</li>
<li><strong>Mark 2</strong> &mdash; the tangent start of the kick bend, located at
<strong>Mark 1 + the 90\u00b0 arc length + the straight section</strong> between the
bends.</li>
</ul>
<p>The 90\u00b0 arc length is &pi;/2 &times; the bender's centerline radius R. For a
standard 1/2&quot; EMT hand bender (R &asymp; 4.31&quot;), the arc is about 6.77&quot;.</p>

<h2>Worked example</h2>
<p>Kick angle &kappa; = 15\u00b0, straight section 6&quot;, 1/2&quot; EMT on a standard
hand bender: Mark 2 sits at 6.77&quot; + 6&quot; = <strong>12.77&quot;</strong> (about
12-3/4&quot;) of developed length from Mark 1. The bend also <em>gains</em> conduit &mdash;
the two bends together consume about <strong>1-7/8&quot;</strong> of developed length
(total gain = G(90\u00b0) + G(&kappa;)), so add that to your stick length before
cutting.</p>

<h2>Bending order</h2>
<ol>
<li>Mark both points on the straight conduit first, measuring developed length.</li>
<li>Bend the 90\u00b0 at Mark 1, using the bender's degree scale &mdash; not feel.</li>
<li>Bend the kick at Mark 2 to angle &kappa;, in the <em>same plane</em> as the 90\u00b0.</li>
<li>Test-fit against the panel before cutting the run to final length.</li>
</ol>

<h2>Mistakes to avoid</h2>
<ul>
<li><strong>Kicking out of plane.</strong> If the kick leaves the plane of the 90\u00b0,
the run doglegs and the knockout will not line up. Sight down the conduit after the
first bend.</li>
<li><strong>Forgetting gain.</strong> A kicked 90\u00b0 eats nearly 2&quot; of developed
length on 1/2&quot; EMT. The calculator reports total gain &mdash; use it.</li>
<li><strong>Measuring Mark 2 as straight-line distance.</strong> Marks are developed
length along the conduit, which follows the 90\u00b0 arc. A tape laid straight across
the bend will read short.</li>
<li>Picking a kick angle too steep for the knockout offset &mdash; 10\u00b0 to 30\u00b0
covers almost every panel entry.</li>
</ul>
""",
    ),
    dict(
        slug="90-degree-bend-calculator",
        title="90\u00b0 Bend Calculator \u2014 Stub-Ups & Back-to-Back",
        desc="Free 90\u00b0 bend calculator: stub-up layout with take-up, back-to-back 90s "
             "mark spacing, and gain explained for EMT and rigid conduit.",
        h1="90\u00b0 Bend Calculator",
        cta_label="Open the free 90\u00b0 bend calculator",
        body="""
<p>The 90\u00b0 bend is the foundation everything else is built on: stub-ups, kicked 90s,
offsets that turn corners, back-to-back U-bends. Understand what a 90\u00b0 does to a
stick of conduit and every other bend gets easier.</p>

<h2>Anatomy of a 90\u00b0 bend</h2>
<p>A 90\u00b0 has two <em>tangent points</em> &mdash; where the straight conduit meets the
curve &mdash; an <em>arc</em> between them (arc length = &pi;/2 &times; centerline
radius R), and the <em>back of the bend</em>, the outside corner your measurements
reference. For a stub-up, you mark at <strong>target height &minus; take-up</strong>
(5&quot; for 1/2&quot; EMT on a standard hand bender), put the arrow on the mark, and
bend: the back of the bend lands exactly at target height.</p>

<h2>Gain: the hidden number</h2>
<p>Bending 90\u00b0 does not just redirect the conduit &mdash; it <em>uses up</em> some of
it. The arc is shorter than the two straight legs it replaces, by an amount called
<em>gain</em>: roughly <strong>0.43 &times; R</strong> for a 90\u00b0. On 1/2&quot; EMT
(R &asymp; 4.31&quot;) that is about 1-7/8&quot; per bend. Gain matters whenever you cut
a stick to an exact developed length with 90s in it &mdash; ignore it and the run comes
up short.</p>

<h2>Back-to-back 90s</h2>
<p>Two 90s facing each other make a U that jumps between two parallel runs &mdash; up
and over a doorway header, for example. Layout is simple: mark the first 90 at
(H1 &minus; take-up) from the end, then mark the second 90 exactly <strong>W</strong>
farther along, where W is the desired distance between the backs of the bends. With
H1 = 18&quot;, H2 = 24&quot;, W = 36&quot; and 3/4&quot; EMT (take-up 6&quot;): Mark 1 at
12&quot; from the end, Mark 2 at <strong>48&quot;</strong> from the end. Both bends keep
the same take-up, so the marks land W apart and the backs land W apart.</p>

<h2>Checking your 90\u00b0</h2>
<ul>
<li>Hold a square against the inside of the bend &mdash; both legs should touch.</li>
<li>Measure the stub height to the <em>back</em> of the bend, not the inside corner.</li>
<li>If the angle is under 90\u00b0, the stub comes out tall; over 90\u00b0, it comes out
short. Small errors here become big ones at the box.</li>
<li>A kinked 90\u00b0 is scrap. If the conduit starts to flatten, stop &mdash; you are
past what that bender and size can do.</li>
</ul>

<h2>When 90s stack up</h2>
<p>Runs with several 90s accumulate both gain and small angle errors. Add up the gain
for <em>every</em> bend before cutting, bend the 90s before any offsets in the same
stick when you can, and verify each bend with the square before moving to the next.
The calculator's feasibility check warns you before a bend is too tight to make.</p>
""",
    ),
    dict(
        slug="conduit-bending-chart",
        title="EMT Conduit Bending Chart: Multipliers, Shrink & Take-Up",
        desc="Free EMT conduit bending chart: 10\u00b0\u201360\u00b0 offset multipliers, shrink "
             "per inch, and 90\u00b0 stub take-up table, plus instant interactive calculators.",
        h1="EMT Conduit Bending Chart: Multipliers, Shrink & Take-Up",
        cta_label="Open the free offset bend calculator",
        quick_links=[
            ("/offset/", "Offset Bend Calculator"),
            ("/stub-up/", "90° Stub-Up Calculator"),
            ("/3-point-saddle/", "3-Point Saddle Calculator"),
            ("/conduit-fill/", "NEC Conduit Fill Calculator"),
        ],
        related=[
            ("/6-inch-offset-3-4-emt-30-degrees/", '6" Offset in 3/4" EMT at 30°: Exact Marks & Shrink'),
            ("/1-2-emt-90-stub-up-take-up-fix/", 'Why Your 1/2" EMT 90° Stub Lands Short (+ Take-Up Fix)'),
            ("/3-point-saddle-3-inch-pipe-marks/", '3-Point Saddle Over a 3" Pipe: 45°/22.5° Marks & Shrink'),
        ],
        body="""
<p>This is the chart electricians tape inside their gang box lid: every multiplier and
shrink factor for the bend angles you will actually use, on one page. Bookmark it.</p>

<h2>Multiplier &amp; shrink chart</h2>
<p><strong>Mark spacing = obstacle height &times; multiplier.</strong>
<strong>Total shrink = height &times; shrink per inch.</strong></p>
<table>
<tr><th>Bend angle</th><th>Multiplier</th><th>Shrink per inch of height</th><th>Best for</th></tr>
<tr><td>10\u00b0</td><td>6.0</td><td>1/16&quot;</td><td>Long runs, minimal shrink</td></tr>
<tr><td>15\u00b0</td><td>3.9</td><td>1/8&quot;</td><td>Shallow, low-profile offsets</td></tr>
<tr><td>22.5\u00b0</td><td>2.6</td><td>3/16&quot;</td><td>Tight quarters</td></tr>
<tr><td>30\u00b0</td><td>2.0</td><td>1/4&quot;</td><td>Everyday offsets</td></tr>
<tr><td>45\u00b0</td><td>1.4</td><td>3/8&quot;</td><td>Tall obstacles, short distance</td></tr>
<tr><td>60\u00b0</td><td>1.2</td><td>1/2&quot;</td><td>Maximum rise, minimum run</td></tr>
</table>

<h2>Why the multiplier works</h2>
<p>The multiplier is the cosecant of the bend angle &mdash; 1/sin&nbsp;&theta;. At
30\u00b0, sin&nbsp;30\u00b0 = 0.5, so the multiplier is exactly 2.0: a 6&quot; obstacle
needs 12&quot; between marks, no calculator required. The numbers above are rounded to
what fits on a tape measure; the calculator on this site uses the full-precision values.</p>

<h2>How to pick the angle</h2>
<ul>
<li><strong>Default to 30\u00b0.</strong> The math is trivial (&times;2) and shrink stays
moderate. Most journeymen bend 30\u00b0 unless there is a reason not to.</li>
<li><strong>Go shallow (22.5\u00b0, 15\u00b0, 10\u00b0)</strong> when shrink is the enemy
&mdash; long runs with multiple bends, or couplings that must land exactly.</li>
<li><strong>Go steep (45\u00b0, 60\u00b0)</strong> when you must clear a tall obstacle in
a short horizontal distance. Accept the extra shrink and add it to your cut length.</li>
</ul>

<h2>Take-up reference (hand benders, EMT)</h2>
<table>
<tr><th>Conduit size</th><th>Take-up (deduct)</th></tr>
<tr><td>1/2&quot; EMT</td><td>5&quot;</td></tr>
<tr><td>3/4&quot; EMT</td><td>6&quot;</td></tr>
<tr><td>1&quot; EMT</td><td>8&quot;</td></tr>
</table>
<p>Take-up is a property of the bender head, not a formula &mdash; always confirm against
the markings on the bender in your hands.</p>

<h2>Chart vs. calculator</h2>
<p>The chart gives you spacing and shrink in seconds. The calculator adds what the chart
cannot: exact mark locations from your bender's actual radius, remaining straight
lengths, minimum stick length, and a warning before a bend is physically impossible.
Use the chart for quick layout, the calculator before you cut.</p>
""",
    ),
    dict(
        slug="conduit-shrink-calculator",
        title="Conduit Shrink Calculator \u2014 What Bends Eat",
        desc="Free conduit shrink guide: shrink per inch chart, worked examples for offsets "
             "and saddles, and why forgetting shrink ruins conduit runs.",
        h1="Conduit Shrink Calculator",
        cta_label="Open the free offset bend calculator",
        body="""
<p><em>Shrink</em> is the length a bend &ldquo;eats&rdquo; from your conduit run. Bend an
offset and the finished run comes up shorter than the straight stick you started with
&mdash; by a predictable amount. Every coupling that lands in the wrong place on a
rough-in can usually be traced back to shrink nobody accounted for.</p>

<h2>What shrink actually is</h2>
<p>The bent path between two marks is longer than the straight-line distance the bend
covers. The difference is shrink. It is <strong>not</strong> the same as take-up
(where the bend starts relative to your mark) or gain (developed-length consumed by
the arc) &mdash; though all three shorten the <em>finished run</em> compared to the raw
stick, which is why beginners mix them up.</p>

<h2>Shrink per inch of offset height</h2>
<table>
<tr><th>Bend angle</th><th>Shrink per inch</th></tr>
<tr><td>10\u00b0</td><td>1/16&quot;</td></tr>
<tr><td>15\u00b0</td><td>1/8&quot;</td></tr>
<tr><td>22.5\u00b0</td><td>3/16&quot;</td></tr>
<tr><td>30\u00b0</td><td>1/4&quot;</td></tr>
<tr><td>45\u00b0</td><td>3/8&quot;</td></tr>
<tr><td>60\u00b0</td><td>1/2&quot;</td></tr>
</table>
<p>Multiply by your offset height for total shrink.</p>

<h2>Worked examples</h2>
<p><strong>Example 1 &mdash; simple offset.</strong> 6&quot; offset at 30\u00b0:
6 &times; 1/4&quot; = <strong>1.5&quot;</strong> of shrink. Cut the stick 1.5&quot; long
or the far coupling lands 1.5&quot; off the box.</p>
<p><strong>Example 2 &mdash; 4-point saddle.</strong> Two 4&quot; offsets at 30\u00b0
around a duct: shrink applies <em>twice</em>, once per offset &mdash;
2 &times; (4 &times; 1/4&quot;) = <strong>2&quot;</strong> total. Saddles surprise people
because the doubling is easy to forget.</p>
<p><strong>Example 3 &mdash; rolling offset.</strong> 6&quot; rise, 8&quot; roll at
30\u00b0: shrink applies to the <em>true</em> offset (&radic;(36+64) = 10&quot;), so
10 &times; 1/4&quot; = <strong>2.5&quot;</strong> &mdash; not the 1.5&quot; you would get
from the rise alone.</p>

<h2>The golden rule</h2>
<p><strong>Add up the shrink for every bend in the stick before you cut.</strong> One
offset's 1.5&quot; is a nuisance; three bends' worth across a long run is a miscut.
The calculator totals shrink for you &mdash; including the doubled shrink on saddles
and the true-offset shrink on rolling offsets &mdash; so the number you cut to is the
number that lands.</p>

<h2>Signs you forgot shrink</h2>
<ul>
<li>Couplings consistently land short of boxes by a similar amount on every run.</li>
<li>A run with two offsets is off by roughly double the single-offset error.</li>
<li>The math &ldquo;worked on paper&rdquo; but the stick is short &mdash; the paper math
probably never included shrink.</li>
</ul>
""",
    ),
    dict(
        slug="parallel-offset-calculator",
        title="Parallel Offsets \u2014 Keep Runs Even & Aligned",
        desc="How to bend parallel offsets that stay evenly spaced: same angle, same "
             "reference, identical shrink. Step-by-step method with the offset calculator.",
        h1="Parallel Offsets: Keeping Runs Even",
        cta_label="Open the free offset calculator",
        body="""
<p>An honest note first: there is no separate &ldquo;parallel offset&rdquo; button in
the app, because there does not need to be one. Parallel offsets are just two (or more)
<em>identical</em> offsets bent in matching sticks of conduit. Run the offset calculator
once per conduit, follow the discipline below, and the runs come out parallel and
evenly spaced.</p>

<h2>The method: same angle, same reference</h2>
<ol>
<li><strong>Pick one angle for every conduit</strong> &mdash; 30\u00b0 is the standard.
Different angles on the two sticks means different shrink, and the runs will converge
or diverge down the wall.</li>
<li><strong>Measure both sticks from the same reference point</strong> &mdash; the same
box, the same slab edge. If stick A is measured from the panel and stick B from a
column three feet away, the bends will not line up.</li>
<li><strong>Keep the center-to-center spacing constant</strong> through the whole offset.
If the runs are 6&quot; apart on center before the obstacle, they must be 6&quot; apart
on center after it.</li>
<li><strong>Cut both sticks to the same length.</strong> Identical offsets have identical
shrink, so identical sticks stay aligned end to end.</li>
</ol>

<h2>Worked example</h2>
<p>Two 3/4&quot; EMT runs, 6&quot; apart on center, both need a 4&quot; offset at
30\u00b0 to clear the same beam. Each offset: mark spacing = 4 &times; 2.0 =
<strong>8&quot;</strong>, shrink = 4 &times; 1/4&quot; = <strong>1&quot;</strong>. Bend
both sticks with marks measured from the same end and the same reference, and both
offsets land in the same place &mdash; runs still 6&quot; apart, couplings aligned.</p>

<h2>Why parallel offsets go wrong</h2>
<ul>
<li><strong>Mixed angles.</strong> One stick at 30\u00b0 and the other at 45\u00b0 gives
different spacing <em>and</em> different shrink. The runs will never look right.</li>
<li><strong>Different references.</strong> Even a 1&quot; difference in where you start
measuring shows up as staggered bends.</li>
<li><strong>Bending one stick, then &ldquo;eyeballing&rdquo; the second.</strong> Mark
the second stick with the tape, from the numbers &mdash; not by holding it next to the
first.</li>
<li><strong>Forgetting that shrink is identical.</strong> That is actually the good news:
because both offsets shrink the same amount, you cut both sticks the same and move on.</li>
</ul>

<h2>Three or more runs</h2>
<p>The same discipline scales: one angle, one reference, constant spacing, identical
cuts. For racks of three-plus conduits, mark all the sticks before bending any of them
&mdash; it is the only reliable way to keep a whole rack honest.</p>
""",
    ),
    dict(
        slug="how-to-bend-emt-conduit",
        title="How to Bend EMT Conduit \u2014 Beginner's Guide",
        desc="Learn to bend EMT conduit: tools, reading bender marks, your first 90\u00b0 "
             "stub-up, and the safety habits that prevent kinks and miscuts.",
        h1="How to Bend EMT Conduit: A Beginner's Guide",
        cta_label="Open the free conduit bending calculator",
        related=[
            ("/6-inch-offset-3-4-emt-30-degrees/", '6" Offset in 3/4" EMT at 30°: Exact Marks & Shrink'),
            ("/1-2-emt-90-stub-up-take-up-fix/", 'Why Your 1/2" EMT 90° Stub Lands Short (+ Take-Up Fix)'),
            ("/3-point-saddle-3-inch-pipe-marks/", '3-Point Saddle Over a 3" Pipe: 45°/22.5° Marks & Shrink'),
        ],
        body="""
<p>Bending EMT is the first hands-on skill most electrical apprentices learn, and it is
almost entirely about <em>marking correctly</em>. The bender does the bending; your
job is the tape measure. Get the marks right and the bend takes care of itself.</p>

<h2>What you need</h2>
<ul>
<li><strong>A hand bender matched to your conduit size.</strong> A 1/2&quot; bender for
1/2&quot; EMT &mdash; the size is stamped on the bender head. The wrong size kinks the
conduit.</li>
<li>Tape measure, permanent marker, and a level.</li>
<li>A way to cut: hacksaw or tubing cutter &mdash; plus a reamer or file to deburr the
cut end. A sharp inside edge will slice wire insulation during the pull.</li>
<li>Gloves and eye protection for cutting.</li>
</ul>

<h2>Reading your bender</h2>
<p>Every hand bender head carries the same vocabulary: the <strong>arrow</strong> (where
you line up offset and stub marks), the <strong>degree scale</strong> (bend to the
number, not to feel), and the <strong>take-up</strong> stamped on the head &mdash; how
far the bend starts before your mark. For 1/2&quot; EMT the standard take-up is 5&quot;,
3/4&quot; is 6&quot;, 1&quot; is 8&quot;. Always confirm against your own bender.</p>

<h2>Your first bend: a 90\u00b0 stub-up</h2>
<ol>
<li>Decide the stub height &mdash; say 12&quot; with 1/2&quot; EMT.</li>
<li>Mark at <strong>12&quot; &minus; 5&quot; (take-up) = 7&quot;</strong> from the end of
the conduit.</li>
<li>Line the bender's arrow up with the mark. Keep firm, steady foot pressure so the
conduit cannot walk.</li>
<li>Bend with smooth strokes to 90\u00b0 on the degree scale.</li>
<li>Check with a square: the back of the bend should sit at exactly 12&quot;.</li>
</ol>
<p>That is the whole skill in miniature &mdash; every fancier bend is this same idea
with more marks.</p>

<h2>Safety habits that save conduit (and fingers)</h2>
<ul>
<li><strong>Practice on scrap first.</strong> Every bender bends a little differently;
one test bend on waste conduit is cheaper than one miscut stick.</li>
<li><strong>Never force a bend.</strong> If the conduit starts to flatten or kink, stop.
A kinked stick is scrap &mdash; and kinked conduit has to come back out of the wall.</li>
<li><strong>Keep your footing.</strong> Bending is a whole-body motion; a slipping foot
means a slipping mark.</li>
<li><strong>Ream every cut.</strong> It takes ten seconds and protects every wire you
will ever pull through that conduit.</li>
<li><strong>Bend before you cut to final length</strong> when a stick has multiple bends
&mdash; shrink and gain are easier to account for on a long stick than a short one.</li>
</ul>

<h2>What to learn next</h2>
<p>Once the 90\u00b0 feels natural: offsets (the everyday bend), then 3-point saddles,
then stub-ups to exact heights on the first try. Each has a dedicated calculator and
guide on this site &mdash; start with the offset, since it teaches multipliers and
shrink, the two ideas behind everything else.</p>
""",
    ),
    # Batch 3 (2026-09-29): long-tail formula / markings / sizing / technique pages.
    dict(
        slug="conduit-bending-formula",
        title="Conduit Bending Formula: Multipliers, Shrink & Spacing",
        desc="Every conduit bending formula in one place: multiplier, offset spacing, "
             "shrink, and 90\u00b0 gain \u2014 with tables and a worked field example.",
        h1="Conduit Bending Formulas, Explained",
        cta_label="Open the free conduit bending calculator",
        body="""
<p>Conduit bending is field trigonometry, but you do not need to solve triangles on a
roof at 6 a.m. Four formulas cover nearly every bend you will ever make: multiplier,
offset spacing, shrink, and the gain of a 90\u00b0. Learn what each one means and
when to trust it, and the bender starts doing exactly what you told it to.</p>

<h2>The multiplier: 1 \u00f7 sin(angle)</h2>
<p>The multiplier tells you how far apart to put your marks for an offset. It is the
cosecant of the bend angle \u2014 1 divided by the sine \u2014 and it is why
<em>spacing = offset height \u00d7 multiplier</em> works:</p>
<table>
<tr><th>Bend angle</th><th>Multiplier</th><th>Shrink per inch of offset</th></tr>
<tr><td>10\u00b0</td><td>6.0</td><td>1/16&quot;</td></tr>
<tr><td>22.5\u00b0</td><td>2.6</td><td>3/16&quot;</td></tr>
<tr><td>30\u00b0</td><td>2.0</td><td>1/4&quot;</td></tr>
<tr><td>45\u00b0</td><td>1.4</td><td>3/8&quot;</td></tr>
<tr><td>60\u00b0</td><td>1.2</td><td>1/2&quot;</td></tr>
</table>
<p>Electricians memorize the left two columns and stamp the table inside their hard hat.
The third column \u2014 shrink \u2014 is where most layout mistakes come from.</p>

<h2>Shrink: height \u00d7 tan(angle \u00f7 2)</h2>
<p>An offset does not just move the conduit sideways; it also shortens the run. The
geometric formula is <em>shrink = offset height \u00d7 tan(angle/2)</em>. At 30\u00b0
that works out to exactly 1/4&quot; of shrink per inch of offset \u2014 which is why
the trade rule &quot;subtract a quarter inch per inch of offset&quot; exists. The table
above rounds the other angles to the nearest shop-friendly fraction.</p>

<h2>The 90\u00b0 gain: 0.43 \u00d7 radius</h2>
<p>A 90\u00b0 bend uses less conduit than the two straight legs it replaces. The gain
is <em>G = 2R \u00d7 tan(45\u00b0) \u2212 R \u00d7 \u03c0/2</em>, which simplifies to
about <strong>0.43 \u00d7 the bend's centerline radius</strong>. You need it when a
run has a tight overall length budget; for most field work the bender's take-up
marking absorbs it for you.</p>

<h2>Worked example</h2>
<p>You need a 3&quot; offset at 30\u00b0. Mark spacing: 3&quot; \u00d7 2.0 = <strong>6&quot;</strong>
between marks. Shrink: 3&quot; \u00d7 1/4&quot; = <strong>3/4&quot;</strong> \u2014 subtract
that from your measured run length before you mark. Two marks, two opposite 30\u00b0
bends, and the conduit steps over 3&quot; while losing 3/4&quot; of length.</p>

<h2>What formulas cannot tell you</h2>
<p><strong>Take-up is not a formula.</strong> It is a per-bender number stamped on the
head (5&quot; for 1/2&quot; EMT, 6&quot; for 3/4&quot;, 8&quot; for 1&quot;) that describes
where that particular bender starts its 90\u00b0. Always measure and verify on your
own bender \u2014 the app's calibration tool exists for exactly this.</p>
""",
    ),
    dict(
        slug="hand-bender-markings",
        title="Hand Bender Marks: Arrow, Star & Rim Notch Cheat Sheet",
        desc="Master hand bender markings: arrow, star, rim notch & degree scale "
             "cheat sheet for EMT. Includes free 90\u00b0 stub-up & 3-point saddle calculators.",
        h1="Hand Bender Markings: Arrow, Star & Rim Notch Cheat Sheet",
        cta_label="Open the free 90\u00b0 stub-up calculator",
        quick_links=[
            ("/stub-up/", "90° Stub-Up Calculator"),
            ("/3-point-saddle/", "3-Point Saddle Calculator"),
            ("/offset/", "Offset Bend Calculator"),
        ],
        related=[
            ("/1-2-emt-90-stub-up-take-up-fix/", 'Why Your 1/2" EMT 90° Stub Lands Short (+ Take-Up Fix)'),
            ("/3-point-saddle-3-inch-pipe-marks/", '3-Point Saddle Over a 3" Pipe: 45°/22.5° Marks & Shrink'),
            ("/6-inch-offset-3-4-emt-30-degrees/", '6" Offset in 3/4" EMT at 30°: Exact Marks & Shrink'),
        ],
        body="""
<p>A hand bender head is covered in marks that look like decoration until someone tells
you the system. There are four: the arrow, the star, the rim notch, and the degree
scale. Each one answers a different question, and mixing them up is the most common
reason a bend lands in the wrong place.</p>

<h2>The arrow: offsets and stub-ups</h2>
<p>The arrow \u2014 usually cast right at the tip of the hook \u2014 is your default
reference. Line your conduit mark up with the arrow for <strong>stub-ups</strong>
(mark = stub height minus take-up) and for <strong>offset marks</strong>. If you only
remember one mark, remember this one: most bends in a normal day start at the arrow.</p>

<h2>The star: back of 90 and back-to-back bends</h2>
<p>The star marks the <strong>back of a 90\u00b0 bend</strong> \u2014 where the bend
<em>ends</em>, not where it starts. It is the tool for back-to-back 90s: bend your
first 90 at the arrow, measure the distance between the two bends <em>from the back
of the first bend</em>, mark that point, then line the star up with the mark and
reverse the bender. Your second 90 now starts exactly the right distance away.</p>

<h2>The rim notch: 3-point saddle center</h2>
<p>The rim notch sits at the center of the bender's curvature. For a <strong>3-point
saddle</strong>, you center the saddle's middle mark on the rim notch and bend to
45\u00b0, then flip the conduit and place the arrow (or the specified outer mark) at
the two outer marks for the 22.5\u00b0 return bends. Saddles are the one bend where
the center mark matters \u2014 and the notch is how you find it.</p>

<h2>The degree scale: bend to the number, not the feel</h2>
<p>The curved scale on the head shows common angles \u2014 usually 10, 22.5, 30, 45,
and 60 degrees. Watch the scale, not your arms: stop when the conduit reaches the
number. This is also the cheapest way to diagnose a wandering multiplier \u2014 if
your offsets keep coming out wrong, check whether you are actually hitting the angle
you think you are.</p>

<h2>Worked example: back-to-back 90s</h2>
<p>With 1/2&quot; EMT you need two parallel stubs 24&quot; apart. Bend the first 90 at the
arrow. Measure 24&quot; from the <strong>back of that bend</strong>, mark, line the
<strong>star</strong> up with the mark, flip the bender, and bend the second 90. The
stubs come out 24&quot; apart on center. Do the same job at the arrow and you will be
short by the take-up \u2014 5&quot; on a 1/2&quot; bender \u2014 every time.</p>

<h2>Field tips</h2>
<ul>
<li>Marks are cast, not printed \u2014 fill them with a paint pen once; you will read
them three times faster in dim basements.</li>
<li>The star and rim notch sit close together on some heads. Double-check you are on
the right one before a saddle.</li>
<li>Every bender's marks are its own \u2014 a borrowed bender means a fresh round of
take-up and radius checks. The app's calibration screen walks you through it.</li>
</ul>
""",
    ),
    dict(
        slug="emt-sizes-chart",
        title="EMT Conduit Sizes Chart: Trade Size, OD & ID",
        desc="EMT conduit sizes chart: trade size vs. actual outside and inside diameter "
             "for 1/2 to 2 inch, plus why trade size is not the real OD.",
        h1="EMT Conduit Sizes Chart",
        cta_label="Open the free conduit bending calculator",
        body="""
<p>The first surprise of EMT sizing: <strong>trade size is not the actual diameter.</strong>
&quot;1/2-inch EMT&quot; is neither 1/2&quot; outside nor 1/2&quot; inside \u2014 it is a
nominal name, and the real dimensions are bigger. Keep this chart on the truck and
stop guessing which bender fits which stick.</p>

<h2>EMT dimensions, 1/2&quot; through 2&quot;</h2>
<table>
<tr><th>Trade size</th><th>Outside diameter</th><th>Inside diameter</th><th>Wall thickness</th></tr>
<tr><td>1/2&quot;</td><td>0.706&quot;</td><td>0.622&quot;</td><td>0.042&quot;</td></tr>
<tr><td>3/4&quot;</td><td>0.922&quot;</td><td>0.824&quot;</td><td>0.049&quot;</td></tr>
<tr><td>1&quot;</td><td>1.163&quot;</td><td>1.049&quot;</td><td>0.057&quot;</td></tr>
<tr><td>1-1/4&quot;</td><td>1.510&quot;</td><td>1.380&quot;</td><td>0.065&quot;</td></tr>
<tr><td>1-1/2&quot;</td><td>1.740&quot;</td><td>1.610&quot;</td><td>0.065&quot;</td></tr>
<tr><td>2&quot;</td><td>2.197&quot;</td><td>2.067&quot;</td><td>0.065&quot;</td></tr>
</table>
<p>EMT is also made in 2-1/2&quot; through 4&quot; trade sizes; confirm exact diameters
against the manufacturer's spec sheet before laying out large runs, since tolerances
and coatings vary.</p>

<h2>Why it matters for bending</h2>
<ul>
<li><strong>Bender size must match the trade size.</strong> A 3/4&quot; stick in a
1/2&quot; bender kinks; a 1/2&quot; stick in a 3/4&quot; bender bends a sloppy, wide
radius. The size is stamped on every bender head.</li>
<li><strong>Take-up grows with size:</strong> 5&quot; for 1/2&quot; EMT, 6&quot; for 3/4&quot;,
8&quot; for 1&quot; \u2014 always confirm against your own bender.</li>
<li><strong>Hand benders top out at 1&quot; EMT</strong> (and 3/4&quot; rigid). Larger
conduit needs a hydraulic or electric bender \u2014 or factory elbows.</li>
</ul>

<h2>Worked example: picking the right bender</h2>
<p>You pull a stick marked &quot;3/4&quot; off the rack and measure 0.922&quot; across it
with calipers \u2014 that confirms the chart: trade size is nominal. Grab the bender
head stamped 3/4&quot;, check its 6&quot; take-up stamp, and your stub-up math becomes
<em>mark = desired height \u2212 6&quot;</em>. Want an 18&quot; stub? Mark at 12&quot;
from the end, arrow on the mark, bend to 90\u00b0.</p>

<h2>A note on conduit fill</h2>
<p>Sizing conduit for how many THHN conductors it can legally carry follows NEC Chapter 9
Tables 1, 4, and 5 (40% fill for 3 or more wires). Use our free
<a href="/conduit-fill/">NEC Conduit Fill Calculator</a>,
<a href="/wire-size/">NEC Wire Size Calculator</a>, and
<a href="/voltage-drop/">NEC Voltage Drop Calculator</a> to verify conductor sizing
and voltage drop right alongside your bending marks.</p>
""",
    ),
    dict(
        slug="box-offset-bend",
        title="Box Offset Bend: How to Make a 10\u00b0 Mini Offset",
        desc="Box offset bend explained: two 10\u00b0 bends that seat conduit flush in a "
             "box knockout. Marks, spacing math, and field tips.",
        h1="Box Offset Bend: The 10\u00b0 Mini Offset",
        cta_label="Open the free conduit bending calculator",
        related=[
            ("/6-inch-offset-3-4-emt-30-degrees/", '6" Offset in 3/4" EMT at 30°: Exact Marks & Shrink'),
            ("/1-2-emt-90-stub-up-take-up-fix/", 'Why Your 1/2" EMT 90° Stub Lands Short (+ Take-Up Fix)'),
            ("/3-point-saddle-3-inch-pipe-marks/", '3-Point Saddle Over a 3" Pipe: 45°/22.5° Marks & Shrink'),
        ],
        body="""
<p>A box offset is a tiny, two-bend offset \u2014 usually just two 10\u00b0 bends \u2014
that kicks the conduit sideways by the depth of a box knockout or surface-mounted
raceway so the run sits flush. It is the most common bend nobody practices, and the
easiest one to overthink.</p>

<h2>The geometry in one line</h2>
<p>A box offset is a standard offset with a 10\u00b0 angle, so the 10\u00b0 multiplier
(6.0) applies: <strong>mark spacing = offset depth \u00d7 6</strong>. For a typical
1/2&quot;-deep seating, the marks land about 3&quot; apart. Shrink at 10\u00b0 is
about 1/16&quot; per inch of offset \u2014 small enough to ignore on a short stub,
but real on long runs.</p>

<h2>How to bend one</h2>
<ol>
<li>Measure how deep the conduit must step \u2014 the knockout depth, say 1/2&quot;.</li>
<li>Compute spacing: 1/2&quot; \u00d7 6 = <strong>3&quot;</strong> between marks.</li>
<li>Make the first mark near the conduit end (a couple of inches in gives the bender
room to grip), the second mark 3&quot; farther along.</li>
<li>Arrow on the first mark, bend to 10\u00b0. Flip the conduit, arrow on the second
mark, bend 10\u00b0 the opposite way.</li>
<li>Sight down the conduit: both straight sections should be parallel, in the same
plane, with no twist \u2014 a twisted box offset will not sit flat against the box.</li>
</ol>

<h2>Why 10\u00b0?</h2>
<p>Ten degrees is the sweet spot: shallow enough that the offset is compact and the
conduit still pulls wire easily, steep enough that the marks stay a workable distance
apart. Steeper angles make the box offset taller and harder to keep planar; shallower
angles push the marks so far apart the &quot;mini&quot; offset stops being mini.</p>

<h2>Field tips</h2>
<ul>
<li><strong>Bend both bends in the same plane.</strong> Roll the conduit between bends
and you get a dogleg that rocks against the box \u2014 the classic box-offset
failure.</li>
<li><strong>Check with a level</strong> before you cut: lay the offset against a flat
surface and confirm both straight sections touch.</li>
<li><strong>Bend slightly past 10\u00b0</strong> and let springback settle it; checking
the degree scale beats guessing.</li>
<li>On long conduit, subtract the shrink (about 1/16&quot; per inch of offset depth) from
your measured run before marking.</li>
</ul>

<h2>What the app does for you</h2>
<p>The offset calculator in Conduit Bend Calc runs this same math \u2014 enter the depth
and 10\u00b0, and it returns the mark spacing and shrink so you can skip the mental
arithmetic. Box offsets, full-size offsets, and kicks all use the same engine.</p>
""",
    ),
    dict(
        slug="how-to-bend-3-4-emt",
        title="How to Bend 3/4 EMT Conduit: Take-Up & Bend Guide",
        desc="How to bend 3/4 EMT conduit: the 6-inch take-up, minimum bend radius, "
             "stub-ups and offsets \u2014 with worked examples for the most common size.",
        h1="How to Bend 3/4\u2033 EMT Conduit",
        cta_label="Open the free conduit bending calculator",
        body="""
<p>Three-quarter-inch EMT is the workhorse size on most commercial jobs \u2014 big
enough for real branch circuits, small enough to bend by hand all day. Everything
here is the same bending you already know, with the numbers that belong to 3/4&quot;:
take-up 6&quot;, minimum bend radius about 4-1/2&quot;, and a bender head stamped
3/4&quot;.</p>

<h2>The three numbers that matter</h2>
<ul>
<li><strong>Take-up: 6&quot;.</strong> Every 90\u00b0 stub-up mark goes at <em>desired
height \u2212 6&quot;</em>. It is stamped on the bender head \u2014 verify it, because
a worn or borrowed bender can differ.</li>
<li><strong>Minimum bend radius: ~4-1/2&quot;.</strong> Hand benders are built to meet
it; a tighter bend kinks the conduit and fails inspection.</li>
<li><strong>Matching bender required.</strong> 3/4&quot; EMT (0.922&quot; actual OD) in a
1/2&quot; bender kinks; in a 1&quot; bender it bends a loose, oversized radius.</li>
</ul>

<h2>Worked example 1: 18&quot; stub-up</h2>
<p>Mark at 18&quot; \u2212 6&quot; = <strong>12&quot;</strong> from the end of the conduit.
Arrow on the mark, firm foot pressure, bend to 90\u00b0 on the degree scale \u2014
bend a hair past and let springback settle it. Check: the back of the bend should sit
at 18&quot;. If it lands at 17-3/4&quot;, your bender's real take-up is 6-1/4&quot; \u2014
note it and move on.</p>

<h2>Worked example 2: 2&quot; offset at 30\u00b0</h2>
<p>Mark spacing: 2&quot; \u00d7 2.0 (30\u00b0 multiplier) = <strong>4&quot;</strong> between
marks. Shrink: 2&quot; \u00d7 1/4&quot; = <strong>1/2&quot;</strong> \u2014 subtract it
from the measured run length first. Arrow on the first mark, 30\u00b0; flip, arrow on
the second mark, 30\u00b0 the other way. The conduit steps over 2&quot;.</p>

<h2>Back-to-back 90s with the star</h2>
<p>For parallel stubs: bend the first 90 at the arrow, measure the stub spacing from the
<strong>back of the first bend</strong>, mark, line the <strong>star</strong> up with
the mark, and reverse the bender for the second 90. Measuring from the arrow instead
of the star is the classic 6&quot; error on 3/4&quot; conduit.</p>

<h2>Field tips for 3/4&quot;</h2>
<ul>
<li>3/4&quot; takes noticeably more force than 1/2&quot; \u2014 keep the conduit flat on
the ground and your weight over the bender foot, or the stick will walk and take
your mark with it.</li>
<li>Cut and ream before bending when you can; a sharp inside edge will shave wire
insulation on the pull.</li>
<li>When a stick carries several bends, bend first and cut to final length last \u2014
shrink accounting is easier on a long stick.</li>
<li>If your offsets keep landing shallow, you are probably under-bending: watch the
degree scale, not your arms.</li>
</ul>
""",
    ),
    dict(
        slug="emt-vs-rigid-bending",
        title="EMT vs Rigid Conduit Bending: Key Differences",
        desc="EMT vs rigid conduit bending: what changes at the bender \u2014 take-up, "
             "tools, force, and springback \u2014 and when to choose each.",
        h1="EMT vs Rigid Conduit Bending",
        cta_label="Open the free conduit bending calculator",
        body="""
<p>EMT and rigid conduit both bend by the same geometry \u2014 offsets are still
<em>height \u00d7 multiplier</em> \u2014 but everything around the geometry changes:
the tool, the force, the take-up number, and how much the material forgives you.
Here is what actually differs at the bender.</p>

<h2>Wall thickness is the whole story</h2>
<p>EMT (&quot;thin-wall&quot;) bends easily because there is less steel to move. Rigid
metal conduit has walls roughly twice as thick, so the same bend needs far more
force \u2014 and gives you almost no second chances. A miscut EMT stick is scrap;
a miscut rigid stick is <em>expensive</em> scrap.</p>

<h2>Tools: hand bender vs. power</h2>
<ul>
<li><strong>EMT up to 1&quot;</strong> bends on an ordinary hand bender, one size per
head.</li>
<li><strong>Rigid 1/2&quot; and 3/4&quot;</strong> can be hand-bent with a rigid-rated
bender, but it is heavy work \u2014 many electricians reach for a hickey or a
mechanical bender instead.</li>
<li><strong>Anything larger</strong> \u2014 rigid over 3/4&quot;, EMT over 1&quot; \u2014
belongs on a hydraulic or electric bender, or gets replaced by factory elbows.</li>
</ul>

<h2>Take-up is not interchangeable</h2>
<p>Take-up is a per-bender, per-material number. The common field values differ: about
5&quot; for 1/2&quot; EMT vs. 6&quot; for 1/2&quot; rigid, and 6&quot; for 3/4&quot; EMT
vs. 8&quot; for 3/4&quot; rigid. Never carry a take-up number across materials \u2014
measure and verify on the bender in your hands, ideally with the app's calibration
tool.</p>

<h2>Springback and forgiveness</h2>
<p>Rigid springs back more than EMT, so you bend a touch further past the target angle
and let it settle. EMT is the forgiving student: small corrections with the bender
handle are usually fine. Rigid punishes re-bending \u2014 work a rigid bend back
and forth and it flattens or cracks instead of improving.</p>

<h2>When to choose which</h2>
<table>
<tr><th></th><th>EMT</th><th>Rigid (RMC)</th></tr>
<tr><td>Bending effort</td><td>Hand bender to 1&quot;</td><td>Hand bender to 3/4&quot; with effort; power beyond</td></tr>
<tr><td>Fittings</td><td>Set-screw / compression</td><td>Threaded</td></tr>
<tr><td>Where used</td><td>Dry, protected indoor runs</td><td>Exposed, wet, hazardous, or damage-prone locations</td></tr>
<tr><td>Cost &amp; speed</td><td>Cheaper, faster to install</td><td>Slower, labor-intensive</td></tr>
</table>

<h2>What stays the same</h2>
<p>The math does not care about the material: multipliers, shrink, saddle spacing, and
kick geometry are identical for EMT and rigid. That is why one calculator app covers
both \u2014 you only re-measure the two numbers that <em>do</em> change: take-up and
the bender's actual bend radius.</p>
""",
    ),
]


# Batch 5 (2026-10-08): AI-search Q&A pages ("ChatGPT sent me" traffic).
# Topics de-duplicated against existing 18 pages: offset multiplier, gain, and
# deduct have no dedicated page; conduit-shrink-calculator already covers the
# shrink chart (replaced by bending-mistakes); 3-point-saddle-calculator already
# covers the saddle layout (replaced by bend-radius).
PAGES += [
    dict(
        slug="offset-multiplier-guide",
        title="Conduit Offset Multiplier Chart \u2014 How to Use It",
        desc="Offset multiplier chart for conduit bending: what the multiplier is, "
             "the cosecant table for 10\u00b0\u201360\u00b0, and how to get mark spacing right.",
        h1="Conduit Offset Multiplier",
        cta_label="Open the free offset bend calculator",
        body="""
<p>Every offset bend starts with one number: the <em>multiplier</em>. It converts the
height of your offset into the distance between your two bend marks. Get the
multiplier right and the offset lands exactly where the box is; get it wrong and
nothing lines up.</p>

<h2>What the multiplier actually is</h2>
<p>The multiplier is the cosecant of the bend angle &mdash; 1 divided by the sine.
You do not need to do the trigonometry on the job: the table below covers every
angle a hand bender makes. Find your angle, multiply the offset height by the
number in the table, and that is the distance between your marks.</p>

<h2>Offset multiplier and shrink chart</h2>
<table>
<tr><th>Bend angle</th><th>Multiplier</th><th>Shrink per inch of offset</th></tr>
<tr><td>10&deg;</td><td>6.0</td><td>1/16&quot;</td></tr>
<tr><td>15&deg;</td><td>3.9</td><td>1/8&quot;</td></tr>
<tr><td>22.5&deg;</td><td>2.6</td><td>3/16&quot;</td></tr>
<tr><td>30&deg;</td><td>2.0</td><td>1/4&quot;</td></tr>
<tr><td>45&deg;</td><td>1.4</td><td>3/8&quot;</td></tr>
<tr><td>60&deg;</td><td>1.2</td><td>1/2&quot;</td></tr>
</table>

<h2>How to use it</h2>
<p>Say you need a 4&quot; offset and you are bending 30&deg; kicks. The multiplier for
30&deg; is 2.0, so your marks go 4 &times; 2.0 = <strong>8&quot; apart</strong>.
Make the first bend on the first mark, flip the bender, and make the second bend
on the second mark in the opposite direction. The conduit shifts 4&quot; and keeps
running parallel.</p>
<p>Do not forget the third column: the bend also <em>eats</em> conduit. That same
4&quot; offset at 30&deg; shrinks the run by 4 &times; 1/4&quot; = 1&quot;. If the
conduit has to land on a coupling or a box at an exact point, add that inch back
when you measure.</p>

<h2>Why 30&deg; is the shop favorite</h2>
<p>Thirty degrees is the default offset angle for a reason: the multiplier is
exactly 2.0, so the math is doubling &mdash; no chart needed. The shrink is a
manageable 1/4&quot; per inch, and the bend is shallow enough to pull wire through
easily. Save the 45&deg; and 60&deg; kicks for when space is tight.</p>
""",
        faqs=[
            ("What is the multiplier for a 30-degree offset?",
             "Exactly 2.0. A 6-inch offset at 30 degrees needs 12 inches between bend marks &mdash; just double the height."),
            ("What if my bend angle is not in the chart?",
             "The multiplier is 1 divided by the sine of the angle. For odd angles, skip the hand math: the free offset calculator gives you mark spacing and shrink directly."),
            ("Does the multiplier change between EMT and rigid conduit?",
             "No. The multiplier is pure geometry &mdash; it depends only on the bend angle, not the material. What changes between EMT and rigid is take-up and springback, not the multiplier."),
            ("What is the difference between multiplier and shrink?",
             "The multiplier sets the distance <em>between</em> your bend marks. Shrink is the conduit length the bend consumes along the run. You need both: multiplier to place the marks, shrink to cut the pipe to the right length."),
        ],
    ),
    dict(
        slug="conduit-bending-gain",
        title="Gain in Conduit Bending \u2014 What It Is & Why It Matters",
        desc="What gain means in conduit bending, why a 90\u00b0 bend \u201csaves\u201d conduit, "
             "and how gain differs from take-up and deduct.",
        h1="Gain in Conduit Bending",
        cta_label="Open the free conduit bending calculator",
        body="""
<p>Bend a 90&deg; in a piece of conduit and something odd happens: the bent pipe is
<em>shorter</em> than the two straight legs measured to the corner. That missing
length is <strong>gain</strong> &mdash; the conduit the bend &ldquo;saves&rdquo; by
taking the curved path instead of going all the way to the corner and back.</p>

<h2>Where gain comes from</h2>
<p>Picture the corner of a 90&deg; bend. If the conduit ran straight to the corner
point and then turned, it would travel the full length of both legs. The real
pipe cuts the corner along an arc, and an arc is shorter than two straights.
The difference &mdash; legs minus developed length &mdash; is the gain. For a
90&deg; bend it equals about <strong>0.4292 &times; the centerline bend
radius</strong>, so a bigger bender radius means more gain.</p>

<h2>Why it matters on the job</h2>
<p>Gain matters whenever you cut conduit to an exact length before bending. A
stub-up that has to land at a precise height, a 90&deg; that must hit a coupling
dead on &mdash; if you cut to the corner-to-corner measurement, the finished bend
comes up short by exactly the gain. On a run with several 90s the error stacks:
four 90s at 1&quot; of gain each puts you 4&quot; off at the end of the run.</p>
<p>The fix is simple once you know the number: subtract the gain from your cut
length. Measure twice, subtract the gain, bend once.</p>

<h2>Gain vs take-up vs deduct</h2>
<p>These three get mixed up constantly. <strong>Take-up</strong> tells you
<em>where to mark</em>: it is the distance from the end of the pipe to the bend
mark, and it is a fixed number for your bender head. <strong>Gain</strong> tells
you <em>how much shorter to cut</em>: it is the length the bend saves. The
<strong>deduct</strong> is what you actually subtract from your measurement on
the job &mdash; for a 90&deg; stub it equals the take-up. Mark with take-up, cut
with gain in mind.</p>
""",
        faqs=[
            ("How do I calculate gain for a 90-degree bend?",
             "Multiply 0.4292 by the centerline bend radius of your bender. A head with a 6-inch radius gives about 2.6 inches of gain. Most electricians look it up once for their bender and reuse the number."),
            ("Is gain the same as take-up?",
             "No. Take-up locates the bend mark &mdash; it is a fixed property of the bender head. Gain is the conduit length the bend saves, and it shortens your cut. Confusing the two is one of the most common bending mistakes."),
            ("Do offsets and saddles have gain?",
             "Every bend has gain, because every bend cuts a corner. It matters most on 90s where the full 0.4292 &times; radius applies; on shallow offsets the gain is small enough that most electricians ignore it."),
            ("Why do gain charts disagree between manufacturers?",
             "Gain depends on the bender's actual bend radius, and every head is slightly different. If precision matters, bend one test 90&deg;, measure the real gain, and use your number instead of the chart's."),
        ],
    ),
    dict(
        slug="conduit-bending-deduct",
        title="Deduct in Conduit Bending \u2014 What It Is & How to Use It",
        desc="Conduit bending deduct explained: what to subtract from your measurement, "
             "when take-up is the deduct, and a worked stub-up example.",
        h1="Deduct in Conduit Bending",
        cta_label="Open the free stub-up calculator",
        body="""
<p>The <strong>deduct</strong> is the number you subtract from your measurement to
find where to put the bend mark. It is the most practical of the three bending
numbers: the multiplier tells you spacing, shrink tells you what the bend eats,
and deduct tells you where to draw the line.</p>

<h2>The 90&deg; stub: deduct equals take-up</h2>
<p>For a 90&deg; stub-up, the deduct <em>is</em> the take-up &mdash; the fixed
number for your bender head. The classic example every apprentice learns: 1/2&quot;
EMT in a standard hand bender has a 5&quot; take-up. Want a 30&quot; stub? Subtract
5&quot;, mark at 25&quot;, put the bender's arrow on the mark, and bend to
90&deg;. The stub comes out at 30&quot;.</p>
<p>Forget the deduct and the stub lands 5&quot; too tall &mdash; exactly the
take-up you failed to subtract. There is no partial credit in stub heights.</p>

<h2>Where to find your take-up</h2>
<p>Take-up is stamped on most bender heads or printed in the manufacturer's chart,
listed by conduit size. It is an <em>empirical</em> number &mdash; measured from
the actual head, not derived from a formula &mdash; so use the number for
<em>your</em> bender, not a generic table. Two heads for the same size EMT can
differ.</p>

<h2>Deduct on other bends</h2>
<p>On offsets, the &ldquo;deduct&rdquo; idea is replaced by shrink: you do not
subtract a fixed number, you add the shrink back to your cut length. On saddles,
you lay out from the centerline of the obstruction instead of deducting. The
deduct rule &mdash; subtract take-up, mark, bend &mdash; belongs to 90s.</p>
""",
        faqs=[
            ("Is the deduct always equal to the take-up?",
             "For 90-degree stub-ups, yes &mdash; the deduct is the take-up. For offsets, use shrink instead of a deduct; for saddles, lay out from the obstruction's centerline."),
            ("Where is the take-up marked on my bender?",
             "Most hand benders stamp it on the head near the size markings, or print it in the manufacturer's bending chart. If yours is worn off, bend a test 90&deg; and measure &mdash; take-up is the distance from the pipe end to the arrow mark."),
            ("What happens if I forget the deduct?",
             "The stub comes out too tall by exactly the deduct &mdash; 5 inches too tall on 1/2-inch EMT with a standard bender. Cut a new piece; you cannot unbend the extra height."),
            ("Does the deduct apply to saddle bends?",
             "No. Saddles are laid out from the center of the obstruction with the center bend first, then the side bends. Deduct is a 90-degree-stub concept."),
        ],
    ),
    dict(
        slug="conduit-bending-mistakes",
        title="5 Conduit Bending Mistakes That Waste Pipe (and Time)",
        desc="The five conduit bending mistakes electricians make most \u2014 wrong multiplier, "
             "forgotten shrink, take-up confusion \u2014 and how to avoid each one.",
        h1="5 Conduit Bending Mistakes That Waste Pipe",
        cta_label="Open the free conduit bending calculator",
        body="""
<p>Ask a journeyman what wastes the most pipe and you will hear the same list.
These five mistakes account for nearly every ruined stick of EMT &mdash; and
every one of them is avoidable once you know what to watch for.</p>

<h2>1. Wrong multiplier for the angle</h2>
<p>The classic: bending 30&deg; kicks but spacing the marks with the 45&deg;
multiplier (1.4 instead of 2.0). The offset comes out shallow and short. Tape the
multiplier chart inside your bender handle or let the app do it &mdash; never
guess.</p>

<h2>2. Forgetting shrink</h2>
<p>The offset lands at the right height but an inch short of the box, because the
bend ate conduit you did not account for. A 6&quot; offset at 30&deg; eats
1-1/2&quot;. Always add shrink back when the landing point matters.</p>

<h2>3. Bending on the wrong mark</h2>
<p>Hand benders have an arrow, a star, and a teardrop &mdash; each for a different
bend. The arrow is for 90&deg; stubs and offsets; the star is for back-to-back
bends. Bend an offset on the star and every mark is off by inches. When in doubt,
check the head: the symbols are stamped next to their names.</p>

<h2>4. Ignoring springback on rigid</h2>
<p>EMT stays where you bend it. Rigid springs back, so a bend that looked like
30&deg; relaxes to 27&deg; overnight &mdash; and your saddle no longer clears the
pipe. Bend rigid a touch past the target angle and let it settle, or measure
after it rests.</p>

<h2>5. Measuring to the wrong point</h2>
<p>Hook the tape on the end of the conduit for every measurement, and remember
that gain shortens 90s. A run measured corner-to-corner with four 90s and no
gain allowance ends up inches short at the far end. Developed length &mdash;
what the tape reads <em>along the pipe</em> &mdash; is the only measurement that
counts.</p>
""",
        faqs=[
            ("Why does my offset always come up short of the box?",
             "Almost always forgotten shrink. A 6-inch offset at 30 degrees eats 1-1/2 inches of conduit. Add the shrink to your cut length and the landing point stops moving."),
            ("Why is my 90-degree stub too tall?",
             "You forgot the deduct. Subtract the take-up &mdash; 5 inches for 1/2-inch EMT on a standard bender &mdash; from the stub height before marking."),
            ("Can I fix a bend that went wrong?",
             "Small corrections on EMT are fine &mdash; work it gently back with the bender. Rigid punishes re-bending: it flattens or cracks instead of improving. When rigid goes wrong, cut a new piece."),
            ("How do I stop wasting pipe while learning?",
             "Bend one test piece per new angle and keep it as a reference. Mark it with the angle, multiplier, and measured shrink. A five-dollar stick of EMT as a template beats a spool of mistakes."),
        ],
    ),
    dict(
        slug="conduit-bend-radius",
        title="Conduit Bend Radius \u2014 Minimums & Why They Matter",
        desc="Conduit bend radius explained: what centerline radius means, NEC minimum "
             "radius for EMT sizes, and why tight bends fail inspection.",
        h1="Conduit Bend Radius",
        cta_label="Open the free conduit bending calculator",
        body="""
<p>The <strong>bend radius</strong> is the radius of the arc the conduit follows
through a bend, measured to the pipe's centerline. It is set by your bender head
&mdash; you cannot bend tighter than the head allows &mdash; and the electrical
code sets a floor below which you must not go.</p>

<h2>Why radius matters</h2>
<p>Two reasons. First, wire pulling: a tight bend kinks conductors and makes the
pull brutal; a generous sweep pulls easy. Second, the code: the NEC limits how
tight any bend can be, because crushed or flattened conduit at a bend is a
failed installation. Bend tighter than the minimum and the inspector fails it
&mdash; even if the wire pulled fine.</p>

<h2>NEC minimum bend radius for EMT</h2>
<p>NEC Chapter 9, Table 2 gives the minimum radius to the centerline for each
size. For EMT:</p>
<table>
<tr><th>EMT size</th><th>Minimum radius</th></tr>
<tr><td>1/2&quot;</td><td>4&quot;</td></tr>
<tr><td>3/4&quot;</td><td>4-1/2&quot;</td></tr>
<tr><td>1&quot;</td><td>5-3/4&quot;</td></tr>
<tr><td>1-1/4&quot;</td><td>7-1/4&quot;</td></tr>
<tr><td>1-1/2&quot;</td><td>8-1/4&quot;</td></tr>
<tr><td>2&quot;</td><td>9-1/2&quot;</td></tr>
</table>
<p>Standard hand benders are built around these minimums, which is why a 1/2&quot;
hand bender and a 2&quot; hydraulic bender feel like different tools &mdash; the
geometry scales with the pipe.</p>

<h2>Radius, gain, and your layout</h2>
<p>Radius is not just a code number: it drives gain. A 90&deg; bend saves about
0.4292 &times; the centerline radius, so the same 90&deg; on a big-radius bender
eats more layout length than on a tight one. When precision matters &mdash;
panel stubs, long runs &mdash; use the radius of <em>your</em> bender, not a
generic chart.</p>
""",
        faqs=[
            ("What happens if a bend is tighter than the minimum radius?",
             "The conduit can flatten or kink, conductors get damaged during the pull, and the installation fails inspection. The NEC minimums in Chapter 9, Table 2 are hard limits, not suggestions."),
            ("Is the minimum radius the same for rigid conduit?",
             "No &mdash; NEC Table 2 lists each raceway type separately, and rigid (RMC) has larger minimums than EMT for the same trade size. Always check the row for the raceway you are actually bending."),
            ("Can I bend a larger radius than the minimum?",
             "Yes, and for long wire pulls you should. Sweeps and large-radius bends pull dramatically easier than minimum-radius 90s. The code sets a floor, not a ceiling."),
            ("How does bend radius relate to gain?",
             "Directly: gain on a 90&deg; bend is about 0.4292 times the centerline radius. A bigger radius means more gain, which means more to subtract from your cut length."),
        ],
    ),
]

# ---------------------------------------------------------------------------
# Batch 6 (T35, 2026-11-23): Three Worked Electrician Field Guides with exact
# tape-measure mark tables, crisp inline SVG bend diagrams, 4-point rookie
# checks, and page-specific FAQPage JSON-LD.
# ---------------------------------------------------------------------------
_GUIDE1_PLAY = html.escape(build_play_url("6-inch-offset-3-4-emt-30-degrees", "inline_play_cta"))
_GUIDE2_PLAY = html.escape(build_play_url("1-2-emt-90-stub-up-take-up-fix", "inline_play_cta"))
_GUIDE3_PLAY = html.escape(build_play_url("3-point-saddle-3-inch-pipe-marks", "inline_play_cta"))

PAGES += [
    dict(
        slug="6-inch-offset-3-4-emt-30-degrees",
        title='6" Offset in 3/4" EMT at 30\u00b0: Exact Marks & Shrink',
        desc='Step-by-step tape-measure marks for a 6" offset in 3/4" EMT at 30\u00b0: '
             '12" mark spacing, 1-1/2" shrink allowance, cut-length correction, and dogleg checks.',
        h1='6" Offset in 3/4" EMT at 30\u00b0: Exact Marks & Shrink',
        cta_label="Open the Offset Bend Calculator",
        quick_links=[
            ("/offset/", "Offset Bend Calculator"),
            ("/shrink/", "Conduit Shrink Calculator"),
            ("/stub-up/", "90° Stub-Up Calculator"),
            ("/3-point-saddle/", "3-Point Saddle Calculator"),
            ("/conduit-fill/", "NEC Conduit Fill Calculator"),
        ],
        related=[
            ("/1-2-emt-90-stub-up-take-up-fix/", 'Why Your 1/2" EMT 90° Stub Lands Short (+ Take-Up Fix)'),
            ("/3-point-saddle-3-inch-pipe-marks/", '3-Point Saddle Over a 3" Pipe: 45°/22.5° Marks & Shrink'),
            ("/offset/", "Offset Bend Calculator"),
            ("/stub-up/", "90° Stub-Up Calculator"),
            ("/3-point-saddle/", "3-Point Saddle Calculator"),
            ("/conduit-fill/", "NEC Conduit Fill Calculator"),
        ],
        body=f"""
<p>Measure <strong>36&quot;</strong> from the last coupling to a structural I-beam, bend a
<strong>6&quot; offset at 30&deg;</strong> in <strong>3/4&quot; EMT</strong>, carry it up
the lift, and your second bend hits the flange <strong>1-1/2&quot; too early</strong>. You
did not misread the tape &mdash; you forgot <em>shrink</em>. Here is the complete
tape-measure layout so every 6&quot; offset clears dead on the first pull.</p>

<h2>Worked jobsite setup</h2>
<ul>
<li><strong>Conduit &amp; bender:</strong> 3/4&quot; EMT on a standard 3/4&quot; hand bender
(e.g., Ideal 74-027 or Klein 51604; both 6&quot; stub take-up).</li>
<li><strong>Offset rise (obstacle height):</strong> 6&quot; at a <strong>30&deg;</strong>
bend angle (easiest math, smooth wire pull, stays well inside the NEC 360&deg; limit).</li>
<li><strong>Fixed coupling to obstacle face:</strong> 36&quot;.</li>
<li><strong>Total straight-line run (coupling to panel):</strong> 84&quot; (7&#39;-0&quot;).</li>
</ul>

<h2>The two 30&deg; constants (and full angle chart)</h2>
<p>For a 30&deg; offset, the multiplier is <strong>2.0</strong> (csc&nbsp;30&deg; = 2.0),
giving <strong>6&quot; &times; 2.0 = 12&quot;</strong> between bend marks. Shrink is
<strong>1/4&quot; per inch</strong> of rise, giving
<strong>6&quot; &times; 1/4&quot; = 1-1/2&quot;</strong> (1.5&quot;) total shrink.</p>
<table>
<tr><th>Offset Angle</th><th>Multiplier</th><th>Shrink / Inch</th><th>Shrink for 6&quot; Offset</th></tr>
<tr><td>10&deg;</td><td>6.0</td><td>1/16&quot;</td><td>3/8&quot;</td></tr>
<tr><td>15&deg;</td><td>3.9</td><td>1/8&quot;</td><td>3/4&quot;</td></tr>
<tr><td>22.5&deg;</td><td>2.6</td><td>3/16&quot;</td><td>1-1/8&quot;</td></tr>
<tr><td><strong>30&deg;</strong></td><td><strong>2.0</strong></td><td><strong>1/4&quot;</strong></td><td><strong>1-1/2&quot;</strong></td></tr>
<tr><td>45&deg;</td><td>1.4</td><td>3/8&quot;</td><td>2-1/4&quot;</td></tr>
<tr><td>60&deg;</td><td>1.2</td><td>1/2&quot;</td><td>3&quot;</td></tr>
</table>

<h2>Step-by-step tape-measure mark table</h2>
<p>Hook your tape on the <strong>fixed end</strong> (0&quot; at the existing coupling or box)
and wrap each pencil mark all the way around the 3/4&quot; EMT so you can read it cleanly
after rotating 180&deg;.</p>
<table>
<tr><th>Layout Step</th><th>Formula</th><th>Tape Reading</th><th>Bender Reference</th></tr>
<tr><td>Mark 1 (obstacle side)</td><td>36&quot; + 1-1/2&quot; shrink</td><td><strong>37-1/2&quot;</strong></td><td>Arrow &rarr; 30&deg;</td></tr>
<tr><td>Mark 2 (fixed-end side)</td><td>37-1/2&quot; &minus; 12&quot; spacing</td><td><strong>25-1/2&quot;</strong></td><td>Arrow &rarr; 30&deg;</td></tr>
<tr><td>Spacing check</td><td>37-1/2&quot; &minus; 25-1/2&quot;</td><td><strong>12&quot;</strong></td><td>Exact 6&quot; &times; 2.0</td></tr>
<tr><td>Pre-bend cut (84&quot; run)</td><td>84&quot; + 1-1/2&quot; shrink</td><td><strong>85-1/2&quot;</strong></td><td>Or bend full 10&#39; stick &amp; trim</td></tr>
</table>

<div class="diagram-card">
<svg viewBox="0 0 640 220" role="img" aria-label="6 inch offset bend diagram in 3/4 inch EMT at 30 degrees showing Mark 2 at 25-1/2 inches, Mark 1 at 37-1/2 inches, 12 inch spacing, and 1-1/2 inch shrink">
  <rect x="0" y="0" width="640" height="220" fill="#FFFFFF" />
  <text x="20" y="24" fill="#52677B" font-size="12" font-weight="600" style="font-variant-numeric:tabular-nums">3/4&quot; EMT &middot; 6&quot; Offset @ 30&deg; &middot; Shrink +1-1/2&quot; &middot; Pre-Bend Cut 85-1/2&quot;</text>
  <line x1="40" y1="164" x2="600" y2="164" stroke="#D9E2EB" stroke-width="1.5" stroke-dasharray="5 4" />
  <rect x="372" y="108" width="224" height="56" fill="#E8EEF4" stroke="#52677B" stroke-width="1.5" />
  <text x="484" y="140" text-anchor="middle" fill="#0F2B46" font-size="12" font-weight="600" style="font-variant-numeric:tabular-nums">Obstacle (6&quot; High, 36&quot; from End)</text>
  <path d="M 44 164 L 236 164 L 356 95 L 596 95" fill="none" stroke="#0F2B46" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
  <line x1="44" y1="152" x2="44" y2="176" stroke="#52677B" stroke-width="2" />
  <text x="44" y="194" text-anchor="middle" fill="#52677B" font-size="11" font-weight="600" style="font-variant-numeric:tabular-nums">0&quot; Fixed End</text>
  <line x1="236" y1="150" x2="236" y2="178" stroke="#C62828" stroke-width="3" />
  <text x="236" y="196" text-anchor="middle" fill="#C62828" font-size="12" font-weight="700" style="font-variant-numeric:tabular-nums">Mark 2: 25-1/2&quot;</text>
  <text x="236" y="211" text-anchor="middle" fill="#52677B" font-size="11">Arrow (30&deg;)</text>
  <line x1="356" y1="81" x2="356" y2="109" stroke="#C62828" stroke-width="3" />
  <text x="356" y="57" text-anchor="middle" fill="#C62828" font-size="12" font-weight="700" style="font-variant-numeric:tabular-nums">Mark 1: 37-1/2&quot;</text>
  <text x="356" y="72" text-anchor="middle" fill="#52677B" font-size="11">Arrow (30&deg; &middot; 36&quot; + 1-1/2&quot; shrink)</text>
  <line x1="244" y1="142" x2="344" y2="84" stroke="#52677B" stroke-width="1.5" stroke-dasharray="3 3" />
  <text x="276" y="106" text-anchor="end" fill="#0F2B46" font-size="12" font-weight="700" style="font-variant-numeric:tabular-nums">12&quot; Spacing</text>
  <text x="276" y="121" text-anchor="end" fill="#52677B" font-size="11">(6&quot; &times; 2.0)</text>
  <line x1="608" y1="95" x2="608" y2="164" stroke="#0F2B46" stroke-width="1.5" />
  <line x1="602" y1="95" x2="614" y2="95" stroke="#0F2B46" stroke-width="1.5" />
  <line x1="602" y1="164" x2="614" y2="164" stroke="#0F2B46" stroke-width="1.5" />
  <text x="616" y="133" fill="#0F2B46" font-size="12" font-weight="700" style="font-variant-numeric:tabular-nums">6&quot;</text>
</svg>
<p class="diagram-caption">Keep the bender hook facing the same direction on both arrow marks and roll the pipe 180&deg; between bends for zero dogleg.</p>
</div>

<h2>Bending sequence (zero dogleg)</h2>
<ol>
<li><strong>First 30&deg; bend:</strong> Line the bender <strong>arrow</strong> on <strong>25-1/2&quot;</strong>, hold heavy foot pressure on the heel so the pipe cannot creep, and pull cleanly to the <strong>30&deg;</strong> rim line.</li>
<li><strong>Rotate 180&deg; and slide to 37-1/2&quot;:</strong> Keep the bender hook facing the <em>same direction</em> along the stick, slide to <strong>37-1/2&quot;</strong>, and roll the conduit <strong>180&deg;</strong>.</li>
<li><strong>Sight for dogleg:</strong> Stand behind the handle and align the bent leg dead-center with the bender handle before pulling &mdash; even a 2&deg; twist throws the far end off the wall by an inch.</li>
<li><strong>Second 30&deg; bend &amp; floor check:</strong> Pull the arrow on <strong>37-1/2&quot;</strong> back to <strong>30&deg;</strong> until both legs lie parallel and flat on concrete with a clean <strong>6&quot;</strong> rise.</li>
</ol>

<h2>4-point rookie mistake check</h2>
<ul>
<li><strong>Forgot shrink:</strong> Marking at 36&quot; and 24&quot; lands the offset at 34-1/2&quot; &mdash; 1-1/2&quot; into the beam.</li>
<li><strong>Used the star or rim notch instead of the arrow:</strong> Standard offsets use the <strong>arrow</strong> on both marks so tangent-point spacing stays exact.</li>
<li><strong>Flipped the bender direction between bends:</strong> Reversing which way the hook faces shifts the tangent points and ruins the 6&quot; rise.</li>
<li><strong>Over-bent past 30&deg; on 3/4&quot; EMT:</strong> Ease into the 30&deg; rim mark and verify on a flat slab or digital torpedo level.</li>
</ul>

<div class="inline-cta-box">
<p><strong>Need marks for an oddball height like 4-5/8&quot; at 22.5&deg; or Rigid conduit?</strong> Plug it straight into the browser calculator or run 100% offline in mechanical rooms.</p>
<div class="inline-cta-actions">
<a class="hero-cta" href="/offset/" onclick="if(window.__ampTrack)window.__ampTrack('seo_landing_cta_clicked','inline_tool_cta')">Open Offset Bend Calculator &rarr;</a>
<a class="inline-cta-secondary" href="{_GUIDE1_PLAY}" target="_blank" rel="noopener noreferrer" onclick="if(window.gtag)gtag('event','google_play_click',{{source:'seo_page'}});if(window.__ampTrack)window.__ampTrack('google_play_cta_clicked','inline_play_cta')">Get Offline Android App on Google Play</a>
</div>
</div>
""",
        faqs=[
            ('How far apart are the marks for a 6" offset at 30 degrees?',
             '12 inches apart. The 30&deg; multiplier (csc 30&deg;) is exactly 2.0, so 6&quot; &times; 2.0 = 12&quot; between bend marks on both 1/2&quot; and 3/4&quot; EMT.'),
            ('How much shrink does a 6" offset at 30 degrees have?',
             '1-1/2 inches (1.5&quot;). A 30&deg; offset shrinks 1/4&quot; per inch of offset rise, so 6&quot; &times; 1/4&quot; = 1-1/2&quot;. Add 1-1/2&quot; to your obstacle distance when placing Mark 1 and to any pre-bend cut length.'),
            ('Should I cut 3/4" EMT to 85-1/2" before bending an 84" run?',
             'If you must pre-cut, add the 1-1/2&quot; shrink (84&quot; + 1-1/2&quot; = 85-1/2&quot;). On a full 10&#39;-0&quot; stick, it is even safer to leave the far tail uncut until both 30&deg; bends are finished, then trim the finished run to 84&quot;.'),
            ('Which bender mark do I use for a 30-degree offset?',
             'Use the arrow on both marks (25-1/2&quot; and 37-1/2&quot;) and keep the bender hook facing the same direction along the pipe for both bends so the spacing stays at 12&quot;.'),
        ],
    ),
    dict(
        slug="1-2-emt-90-stub-up-take-up-fix",
        title='Why Your 1/2" EMT 90\u00b0 Stub Lands Short (+ Take-Up Fix)',
        desc='Worked 14-3/8" stub-up on 1/2" EMT (5" take-up = 9-3/8" mark), Ideal vs '
             'Klein vs Greenlee shoe differences, back-of-90 check, and 12" scrap calibration.',
        h1='Why Your 1/2" EMT 90\u00b0 Stub Lands Short (+ Take-Up Fix)',
        cta_label="Open the 90° Stub-Up Calculator",
        quick_links=[
            ("/stub-up/", "90° Stub-Up Calculator"),
            ("/offset/", "Offset Bend Calculator"),
            ("/3-point-saddle/", "3-Point Saddle Calculator"),
            ("/conduit-fill/", "NEC Conduit Fill Calculator"),
        ],
        related=[
            ("/6-inch-offset-3-4-emt-30-degrees/", '6" Offset in 3/4" EMT at 30°: Exact Marks & Shrink'),
            ("/3-point-saddle-3-inch-pipe-marks/", '3-Point Saddle Over a 3" Pipe: 45°/22.5° Marks & Shrink'),
            ("/stub-up/", "90° Stub-Up Calculator"),
            ("/offset/", "Offset Bend Calculator"),
            ("/3-point-saddle/", "3-Point Saddle Calculator"),
            ("/conduit-fill/", "NEC Conduit Fill Calculator"),
        ],
        body=f"""
<p>Every apprentice learns the rule on day one: subtract <strong>5&quot;</strong> take-up
for a <strong>1/2&quot; EMT 90&deg; stub-up</strong>. You need a <strong>14-3/8&quot;</strong>
stub into a disconnect, mark at <strong>9-3/8&quot;</strong>, pull 90&deg;, stand it on
the slab &mdash; and your tape reads 14-1/8&quot; or 14-3/4&quot;. Here is why benders
disagree and the 60-second scrap calibration that locks every stub to 1/16&quot;.</p>

<h2>Worked example: 14-3/8&quot; stub-up in 1/2&quot; EMT</h2>
<p>Target finished stub height <strong>H = 14-3/8&quot;</strong> (14.375&quot;), measured
from the <strong>outside back of the 90&deg;</strong> to the cut top of the vertical leg.
With standard <strong>5&quot;</strong> take-up:
<strong>Mark from End = 14-3/8&quot; &minus; 5&quot; = 9-3/8&quot;</strong>.</p>
<table>
<tr><th>EMT Trade Size</th><th>Standard Take-Up</th><th>Mark for 14-3/8&quot; Stub</th><th>Datum</th></tr>
<tr><td><strong>1/2&quot; EMT</strong></td><td><strong>5&quot;</strong></td><td><strong>9-3/8&quot;</strong></td><td>Arrow</td></tr>
<tr><td>3/4&quot; EMT</td><td>6&quot;</td><td>8-3/8&quot;</td><td>Arrow</td></tr>
<tr><td>1&quot; EMT</td><td>8&quot;</td><td>6-3/8&quot;</td><td>Arrow</td></tr>
</table>

<div class="diagram-card">
<svg viewBox="0 0 640 230" role="img" aria-label="14-3/8 inch 90 degree stub-up diagram in 1/2 inch EMT showing 9-3/8 inch arrow mark from cut end, 5 inch take-up to back of 90 floor datum, and 12 inch scrap calibration formula">
  <rect x="0" y="0" width="640" height="230" fill="#FFFFFF" />
  <text x="20" y="22" fill="#52677B" font-size="12" font-weight="600" style="font-variant-numeric:tabular-nums">1/2&quot; EMT 90&deg; Stub-Up &middot; Target 14-3/8&quot; &minus; 5&quot; Take-Up = 9-3/8&quot; Mark</text>
  <line x1="36" y1="192" x2="604" y2="192" stroke="#52677B" stroke-width="2" />
  <text x="598" y="210" text-anchor="end" fill="#52677B" font-size="11" font-weight="600">Floor / Back-of-90&deg; Datum (Measure Here)</text>
  <path d="M 430 188 L 216 188 A 62 62 0 0 1 154 126 L 154 38" fill="none" stroke="#0F2B46" stroke-width="7" stroke-linecap="round" />
  <line x1="140" y1="126" x2="168" y2="126" stroke="#C62828" stroke-width="3" />
  <text x="176" y="122" fill="#C62828" font-size="12" font-weight="700" style="font-variant-numeric:tabular-nums">Arrow Mark: 9-3/8&quot;</text>
  <text x="176" y="137" fill="#52677B" font-size="11">measured from top cut end</text>
  <line x1="104" y1="38" x2="104" y2="192" stroke="#0F2B46" stroke-width="1.5" />
  <line x1="98" y1="38" x2="110" y2="38" stroke="#0F2B46" stroke-width="1.5" />
  <line x1="98" y1="192" x2="110" y2="192" stroke="#0F2B46" stroke-width="1.5" />
  <text x="94" y="110" text-anchor="end" fill="#0F2B46" font-size="12" font-weight="700" style="font-variant-numeric:tabular-nums">14-3/8&quot;</text>
  <text x="94" y="125" text-anchor="end" fill="#52677B" font-size="11">Back-of-90&deg;</text>
  <line x1="130" y1="126" x2="130" y2="192" stroke="#C62828" stroke-width="1.5" stroke-dasharray="3 2" />
  <text x="124" y="164" text-anchor="end" fill="#C62828" font-size="11" font-weight="700" style="font-variant-numeric:tabular-nums">5&quot; Take-Up</text>
  <rect x="366" y="42" width="248" height="114" rx="6" fill="#F5F8FB" stroke="#D9E2EB" stroke-width="1.5" />
  <text x="380" y="64" fill="#0F2B46" font-size="12" font-weight="700">60-Second 12&quot; Calibration</text>
  <text x="380" y="84" fill="#52677B" font-size="11.5" style="font-variant-numeric:tabular-nums">1. Mark 12&quot; on scrap, bend 90&deg;</text>
  <text x="380" y="102" fill="#52677B" font-size="11.5" style="font-variant-numeric:tabular-nums">2. Measure floor-to-top height (S)</text>
  <text x="380" y="122" fill="#0F2B46" font-size="12" font-weight="700" style="font-variant-numeric:tabular-nums">Actual Take-Up = S &minus; 12&quot;</text>
  <text x="380" y="141" fill="#C62828" font-size="11.5" font-weight="700" style="font-variant-numeric:tabular-nums">Ex: 17-3/8&quot; &minus; 12&quot; = 5-3/8&quot; &rarr; Mark 9&quot;</text>
</svg>
<p class="diagram-caption">Insert the 9-3/8&quot; tail forward through the bender hook, align the arrow on the mark, and measure finished height from the flat floor slab.</p>
</div>

<h2>Why Ideal, Klein, and Greenlee do not always match</h2>
<p>Two benders both stamped &ldquo;5&quot; Take-Up&rdquo; still have different shoe radii, and
mechanical or electric benders change the <strong>reference datum</strong> from the arrow
to the <strong>hook front edge</strong>:</p>
<table>
<tr><th>Bender Model</th><th>Conduit</th><th>Centerline Radius (R)</th><th>Take-Up / Deduct</th><th>Reference Datum</th></tr>
<tr><td><strong>Ideal 74-026</strong></td><td>1/2&quot; EMT</td><td>4-5/16&quot; (4.3125&quot;)</td><td>5&quot;</td><td>Arrow</td></tr>
<tr><td><strong>Klein 51603</strong></td><td>1/2&quot; EMT</td><td>4-5/8&quot; (4.625&quot;)</td><td>5&quot;</td><td>Arrow</td></tr>
<tr><td><strong>Greenlee 555</strong> (electric)</td><td>1/2&quot; EMT</td><td>4-5/16&quot; (4.3125&quot;)</td><td>7&quot;</td><td>Hook front edge</td></tr>
<tr><td><strong>Greenlee 1800</strong> (mech.)</td><td>1/2&quot; Rigid</td><td>2-5/8&quot; (2.625&quot;)</td><td>5-1/2&quot; (min stub 6-1/2&quot;)</td><td>Hook front edge</td></tr>
</table>
<p>Klein 51603&#39;s centerline radius is <strong>5/16&quot; larger</strong> than Ideal 74-026&#39;s,
so gain and back-to-back behavior differ. And mixing a hand-bender arrow deduct (5&quot;)
with a Greenlee 555 hook deduct (7&quot;) puts you <strong>2&quot; off</strong> immediately.</p>

<h2>The 60-second 12&quot; scrap-pipe calibration check</h2>
<ol>
<li>Mark <strong>12&quot;</strong> from the square-cut end on a scrap piece of 1/2&quot; EMT (24&quot;+ long).</li>
<li>Put the <strong>arrow</strong> on 12&quot;, apply heavy heel pressure, and bend a dead-square <strong>90&deg;</strong> verified with a magnetic torpedo level (over-pull ~91&deg;&ndash;92&deg; for springback).</li>
<li>Stand the bend on a flat concrete slab and measure floor-to-top back-of-90 height (<em>S</em>).</li>
<li>Compute <strong>Actual Take-Up = S &minus; 12&quot;</strong>. Example: if <em>S</em> = <strong>17-3/8&quot;</strong>, your real take-up is <strong>5-3/8&quot;</strong> &mdash; so your 14-3/8&quot; stub marks at <strong>14-3/8&quot; &minus; 5-3/8&quot; = 9&quot;</strong>.</li>
</ol>
<div class="callout-box">
<p><strong>Bonus gain &amp; radius check:</strong> Cut scrap to exactly <strong>24&quot;</strong>, bend a 90&deg; in the middle, and measure legs <em>A</em> and <em>B</em> from the back of the 90&deg; to each end. Exact 90&deg; gain is <strong>G = A + B &minus; 24&quot;</strong>, and real centerline radius is <strong>R = G &divide; 0.4292</strong>.</p>
</div>

<h2>4-point rookie mistake check</h2>
<ul>
<li><strong>Tail pointed the wrong way:</strong> The measured 9-3/8&quot; tail must pass forward through the hook, not back toward the handle.</li>
<li><strong>Measured to the inside corner:</strong> Stub height is always measured from the outside heel (flat floor slab) to the cut end of the vertical leg.</li>
<li><strong>Under-bent at 87&deg;&ndash;88&deg; or light foot pressure:</strong> Letting the shoe slip shifts your arrow mark, and a shallow 90&deg; rocks on the floor and reads wrong.</li>
<li><strong>Wrong brand datum:</strong> Using a 5&quot; hand-bender deduct on a Greenlee 555 (7&quot; hook datum) or Greenlee 1800 (5-1/2&quot; hook datum on 1/2&quot; Rigid) ruins the cut immediately.</li>
</ul>

<div class="inline-cta-box">
<p><strong>Run any EMT or Rigid/IMC stub-up instantly</strong> &mdash; or use the guided 12&quot; scrap calibration flow in our offline Android app.</p>
<div class="inline-cta-actions">
<a class="hero-cta" href="/stub-up/" onclick="if(window.__ampTrack)window.__ampTrack('seo_landing_cta_clicked','inline_tool_cta')">Open 90&deg; Stub-Up Calculator &rarr;</a>
<a class="inline-cta-secondary" href="{_GUIDE2_PLAY}" target="_blank" rel="noopener noreferrer" onclick="if(window.gtag)gtag('event','google_play_click',{{source:'seo_page'}});if(window.__ampTrack)window.__ampTrack('google_play_cta_clicked','inline_play_cta')">Get Offline Android App on Google Play</a>
</div>
</div>
""",
        faqs=[
            ('Where do I mark 1/2" EMT for a 14-3/8" 90-degree stub-up?',
             'At 9-3/8&quot; from the cut end on a standard 1/2&quot; EMT hand bender (14-3/8&quot; &minus; 5&quot; take-up = 9-3/8&quot;). Feed the 9-3/8&quot; tail through the hook and line the bender arrow directly on the mark.'),
            ('Why does my 1/2" EMT 90-degree stub land 1/4" to 3/8" short?',
             'Common causes are a worn gang-box shoe whose real take-up has drifted (e.g., 5-3/8&quot; instead of 5&quot;), insufficient foot pressure allowing the pipe to walk during the pull, or over-bending slightly past 90&deg;. A 12&quot; scrap test reveals your exact take-up in 60 seconds.'),
            ('What is the difference between Ideal 74-026, Klein 51603, and Greenlee 555?',
             'Ideal 74-026 (R = 4-5/16&quot;) and Klein 51603 (R = 4-5/8&quot;) both use a 5&quot; arrow take-up for 1/2&quot; EMT but have different bend radii. The electric Greenlee 555 uses a 7&quot; deduct measured from the hook front edge, not an arrow.'),
            ('How do I check a 90-degree stub height accurately on site?',
             'Stand the bent conduit upright on a flat concrete slab so the horizontal leg rests flush, confirm the vertical leg is plumb at 90&deg; with a torpedo level, and butt your tape flat on the floor beside the vertical leg to read straight to the top cut edge.'),
        ],
    ),
    dict(
        slug="3-point-saddle-3-inch-pipe-marks",
        title='3-Point Saddle Over a 3" Pipe: 45\u00b0/22.5\u00b0 Marks & Shrink',
        desc='Lay out a 3-point saddle over a 3" obstacle in 60 seconds: 2.5 spacing '
             'multiplier (7-1/2" side marks), 3/16"/in shrink (9/16"), and rim-notch/arrow steps.',
        h1='3-Point Saddle Over a 3" Pipe: 45\u00b0/22.5\u00b0 Marks & Shrink',
        cta_label="Open the 3-Point Saddle Calculator",
        quick_links=[
            ("/3-point-saddle/", "3-Point Saddle Calculator"),
            ("/4-point-saddle/", "4-Point Saddle Calculator"),
            ("/offset/", "Offset Bend Calculator"),
            ("/stub-up/", "90° Stub-Up Calculator"),
            ("/conduit-fill/", "NEC Conduit Fill Calculator"),
        ],
        related=[
            ("/6-inch-offset-3-4-emt-30-degrees/", '6" Offset in 3/4" EMT at 30°: Exact Marks & Shrink'),
            ("/1-2-emt-90-stub-up-take-up-fix/", 'Why Your 1/2" EMT 90° Stub Lands Short (+ Take-Up Fix)'),
            ("/3-point-saddle/", "3-Point Saddle Calculator"),
            ("/offset/", "Offset Bend Calculator"),
            ("/stub-up/", "90° Stub-Up Calculator"),
            ("/conduit-fill/", "NEC Conduit Fill Calculator"),
        ],
        body=f"""
<p>A 3-point saddle is one <strong>45&deg; center bend</strong> flanked by two
<strong>22.5&deg; return bends</strong> (22.5&deg; + 22.5&deg; = 45&deg;). Memorize two
trade constants &mdash; <strong>2.5</strong> for side spacing and
<strong>3/16&quot; per inch</strong> for center shrink &mdash; and you can lay out a clean
hop over a <strong>3&quot;</strong> obstacle in under 60 seconds.</p>

<h2>Worked jobsite setup &amp; exact math</h2>
<ul>
<li><strong>Required saddle clearance (H):</strong> 3&quot; (e.g., clearing a 3&quot; OD tube or 2-1/2&quot; EMT at 2.875&quot; OD with 1/8&quot; air gap).</li>
<li><strong>Distance from fixed coupling/box (0&quot;) to obstacle center:</strong> 36&quot;.</li>
<li><strong>Side spacing (2.5&times; trade multiplier):</strong> 3&quot; &times; 2.5 = <strong>7-1/2&quot;</strong> each side (<strong>15&quot;</strong> total span; geometric csc&nbsp;22.5&deg; &asymp; 2.613, rounded to 2.5 for shoe-radius fit).</li>
<li><strong>Center mark shrink (3/16&quot; per inch):</strong> 3&quot; &times; 3/16&quot; = <strong>9/16&quot;</strong> (0.5625&quot;).</li>
</ul>

<h2>Step-by-step tape-measure mark table (0&quot; = fixed end)</h2>
<table>
<tr><th>Mark</th><th>Formula</th><th>Tape Reading</th><th>Bend &amp; Bender Reference</th></tr>
<tr><td>Mark 1 (Left side)</td><td>36-9/16&quot; &minus; 7-1/2&quot;</td><td><strong>29-1/16&quot;</strong></td><td>22.5&deg; &middot; Arrow (hook facing center)</td></tr>
<tr><td><strong>Mark 2 (Center C)</strong></td><td>36&quot; + 9/16&quot; shrink</td><td><strong>36-9/16&quot;</strong></td><td><strong>45&deg; &middot; Rim Notch (bend first)</strong></td></tr>
<tr><td>Mark 3 (Right side)</td><td>36-9/16&quot; + 7-1/2&quot;</td><td><strong>44-1/16&quot;</strong></td><td>22.5&deg; &middot; Arrow (hook facing center)</td></tr>
<tr><td>Total span check</td><td>44-1/16&quot; &minus; 29-1/16&quot;</td><td><strong>15&quot;</strong></td><td>7-1/2&quot; left + 7-1/2&quot; right</td></tr>
</table>

<div class="callout-box">
<p><strong>Jobsite Sanity Check &mdash; Nominal 3&quot; Trade Pipe Is 3-1/2&quot; OD!</strong></p>
<p>Nominal 3&quot; EMT, Rigid, and Schedule 40 steel pipe all measure <strong>3-1/2&quot; (3.5&quot;) outside diameter</strong>. Always put your tape on the pipe: at <strong>H = 3-1/2&quot;</strong>, side spacing is 3.5&quot; &times; 2.5 = <strong>8-3/4&quot;</strong> (<strong>17-1/2&quot;</strong> total span) and center shrink is 3.5&quot; &times; 3/16&quot; = <strong>21/32&quot;</strong> (&asymp; <strong>5/8&quot;</strong> on a tape).</p>
</div>

<div class="diagram-card">
<svg viewBox="0 0 640 225" role="img" aria-label="3-point saddle bend diagram over a 3 inch obstacle showing Mark 1 at 29-1/16 inches, Center Mark 2 at 36-9/16 inches on rim notch, Mark 3 at 44-1/16 inches, 7-1/2 inch side spacing, and 15 inch total span">
  <rect x="0" y="0" width="640" height="225" fill="#FFFFFF" />
  <text x="20" y="22" fill="#52677B" font-size="12" font-weight="600" style="font-variant-numeric:tabular-nums">45&deg; / 22.5&deg; 3-Point Saddle &middot; 3&quot; Clearance &middot; 2.5&times; Spacing (7-1/2&quot;) &middot; Shrink +9/16&quot;</text>
  <line x1="36" y1="168" x2="604" y2="168" stroke="#D9E2EB" stroke-width="1.5" stroke-dasharray="5 4" />
  <circle cx="320" cy="144" r="24" fill="#E8EEF4" stroke="#52677B" stroke-width="2" />
  <text x="320" y="148" text-anchor="middle" fill="#0F2B46" font-size="11" font-weight="700" style="font-variant-numeric:tabular-nums">3&quot; H</text>
  <path d="M 44 168 L 190 168 L 320 112 L 450 168 L 596 168" fill="none" stroke="#0F2B46" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
  <line x1="44" y1="156" x2="44" y2="180" stroke="#52677B" stroke-width="2" />
  <text x="44" y="196" text-anchor="middle" fill="#52677B" font-size="11" font-weight="600">0&quot; End</text>
  <line x1="190" y1="154" x2="190" y2="182" stroke="#C62828" stroke-width="3" />
  <text x="190" y="199" text-anchor="middle" fill="#C62828" font-size="12" font-weight="700" style="font-variant-numeric:tabular-nums">Mark 1: 29-1/16&quot;</text>
  <text x="190" y="214" text-anchor="middle" fill="#52677B" font-size="11">Arrow 22.5&deg; (hook &rarr; C)</text>
  <line x1="320" y1="98" x2="320" y2="126" stroke="#C62828" stroke-width="3" />
  <text x="320" y="64" text-anchor="middle" fill="#C62828" font-size="12" font-weight="700" style="font-variant-numeric:tabular-nums">Mark 2 (C): 36-9/16&quot;</text>
  <text x="320" y="79" text-anchor="middle" fill="#52677B" font-size="11">Rim Notch 45&deg; (36&quot; + 9/16&quot; shrink)</text>
  <line x1="450" y1="154" x2="450" y2="182" stroke="#C62828" stroke-width="3" />
  <text x="450" y="199" text-anchor="middle" fill="#C62828" font-size="12" font-weight="700" style="font-variant-numeric:tabular-nums">Mark 3: 44-1/16&quot;</text>
  <text x="450" y="214" text-anchor="middle" fill="#52677B" font-size="11">Arrow 22.5&deg; (hook &larr; C)</text>
  <text x="242" y="128" text-anchor="end" fill="#0F2B46" font-size="11.5" font-weight="700" style="font-variant-numeric:tabular-nums">7-1/2&quot;</text>
  <text x="398" y="128" text-anchor="start" fill="#0F2B46" font-size="11.5" font-weight="700" style="font-variant-numeric:tabular-nums">7-1/2&quot;</text>
  <text x="320" y="196" text-anchor="middle" fill="#0F2B46" font-size="11.5" font-weight="700" style="font-variant-numeric:tabular-nums">15&quot; Total Span</text>
</svg>
<p class="diagram-caption">Bend the 45&deg; center peak first on the rim notch, then flip and bend both 22.5&deg; return bends on the arrow with the bender hook facing inward toward center.</p>
</div>

<h2>Bending sequence: rim notch first, then arrows</h2>
<ol>
<li><strong>Bend 1 &mdash; Center 45&deg; (Rim Notch):</strong> Center Mark 2 (<strong>36-9/16&quot;</strong>, labeled <em>C</em>) on the bender&#39;s teardrop <strong>rim notch</strong> and pull a clean <strong>45&deg;</strong> bend.</li>
<li><strong>Bend 2 &mdash; Left 22.5&deg; (Arrow, Hook Facing Center):</strong> Rotate the pipe <strong>180&deg;</strong> in plane, slide the bender to Mark 1 (<strong>29-1/16&quot;</strong>) with the <strong>hook facing inward toward the 45&deg; peak</strong>, align the <strong>arrow</strong>, sight for zero dogleg, and pull to <strong>22.5&deg;</strong>.</li>
<li><strong>Bend 3 &mdash; Right 22.5&deg; (Arrow, Hook Facing Center):</strong> Flip end-for-end so the hook again faces inward toward center, align the <strong>arrow</strong> on Mark 3 (<strong>44-1/16&quot;</strong>), sight flat, and pull <strong>22.5&deg;</strong>.</li>
<li><strong>Flat-floor check:</strong> Both outer legs must lie collinear and flat on concrete with <strong>3&quot;</strong> clear under the peak.</li>
</ol>

<h2>4-point rookie mistake check</h2>
<ul>
<li><strong>Used nominal pipe size instead of actual OD:</strong> Nominal 3&quot; pipe is 3-1/2&quot; OD &mdash; always measure across the outside diameter first.</li>
<li><strong>Put the center bend on the arrow instead of the rim notch:</strong> The 45&deg; center peak must sit on the teardrop rim notch so the peak lands over the obstacle center.</li>
<li><strong>Pointed the bender hook outward on the 22.5&deg; side bends:</strong> Both side bends must face inward toward the 45&deg; peak so the saddle closes symmetrically.</li>
<li><strong>Used a 3-point saddle on an obstacle wider than ~6&quot;:</strong> For HVAC ducts or multi-pipe racks, switch to a <a href="/4-point-saddle/">4-Point Saddle Calculator</a> (two matching offsets where shrink applies twice).</li>
</ul>

<div class="inline-cta-box">
<p><strong>Verify any 3-point saddle height (3&quot;, 3-1/2&quot;, or metric mm)</strong> with a live diagram in your browser or offline on Android.</p>
<div class="inline-cta-actions">
<a class="hero-cta" href="/3-point-saddle/" onclick="if(window.__ampTrack)window.__ampTrack('seo_landing_cta_clicked','inline_tool_cta')">Open 3-Point Saddle Calculator &rarr;</a>
<a class="inline-cta-secondary" href="{_GUIDE3_PLAY}" target="_blank" rel="noopener noreferrer" onclick="if(window.gtag)gtag('event','google_play_click',{{source:'seo_page'}});if(window.__ampTrack)window.__ampTrack('google_play_cta_clicked','inline_play_cta')">Get Offline Android App on Google Play</a>
</div>
</div>
""",
        faqs=[
            ('What is the multiplier for a 45-degree / 22.5-degree 3-point saddle?',
             '2.5 inches per inch of obstacle height on each side of the center mark. For a 3&quot; clearance height, place the two 22.5&deg; side marks 7-1/2&quot; left and right of center (15&quot; total span).'),
            ('How much does a 3-point saddle shrink over a 3" obstacle?',
             '9/16 inch (0.5625&quot;). A 45&deg;/22.5&deg; 3-point saddle shrinks 3/16&quot; per inch of height, so 3&quot; &times; 3/16&quot; = 9/16&quot;. Push your center mark forward by 9/16&quot; (from 36&quot; to 36-9/16&quot;) before laying out the side marks.'),
            ('Is a nominal 3" pipe actually 3 inches wide?',
             'No. Nominal 3&quot; EMT, Rigid, and Schedule 40 steel pipe measure 3-1/2&quot; (3.5&quot;) outside diameter. For a nominal 3&quot; pipe, calculate with H = 3-1/2&quot; (or 3-3/4&quot; with clearance): 8-3/4&quot; side spacing and 21/32&quot; (&asymp; 5/8&quot;) shrink.'),
            ('Which bender marks do I use for a 3-point saddle?',
             'Bend the 45&deg; center mark first on the teardrop rim notch, then flip the conduit and bend both 22.5&deg; side marks on the arrow with the bender hook facing inward toward the center bend.'),
        ],
    ),
]

def word_count(html_body: str) -> int:
    text = re.sub(r"<[^>]+>", " ", html_body)
    text = html.unescape(text)
    return len([w for w in text.split() if w.strip()])


def render_faq_section(faqs: list) -> str:
    """Visible FAQ section appended after the body. Answers are HTML."""
    if not faqs:
        return ""
    parts = ["\n<h2>Frequently asked questions</h2>"]
    for q, a in faqs:
        parts.append(f"<h3>{html.escape(q)}</h3>\n<p>{a}</p>")
    return "\n".join(parts) + "\n"


def render_faq_jsonld(faqs: list) -> str:
    """FAQPage JSON-LD for <head>. Answers are plain text (tags stripped)."""
    if not faqs:
        return ""
    import json
    entities = []
    for q, a in faqs:
        text = html.unescape(re.sub(r"<[^>]+>", " ", a))
        text = re.sub(r"\s+", " ", text).strip()
        entities.append({
            "@type": "Question",
            "name": q,
            "acceptedAnswer": {"@type": "Answer", "text": text},
        })
    data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": entities,
    }
    return (
        '<script type="application/ld+json">\n'
        + json.dumps(data, ensure_ascii=False, indent=2)
        + "\n</script>"
    )


def calculator_url_for_slug(slug: str, base_url: str) -> str:
    """Map each landing page slug to its canonical interactive calculator route."""
    if "rolling" in slug:
        return f"{base_url}/rolling-offset/"
    if "kick" in slug:
        return f"{base_url}/kicked-90/"
    if "wire-size" in slug:
        return f"{base_url}/wire-size/"
    if "voltage-drop" in slug:
        return f"{base_url}/voltage-drop/"
    if "4-point" in slug:
        return f"{base_url}/4-point-saddle/"
    if "3-point" in slug or "saddle" in slug:
        return f"{base_url}/3-point-saddle/"
    if "fill" in slug or "emt-sizes" in slug:
        return f"{base_url}/conduit-fill/"
    if "shrink" in slug:
        return f"{base_url}/shrink/"
    if "stub" in slug or "deduct" in slug or "take-up" in slug or "hand-bender" in slug or "90-degree" in slug:
        return f"{base_url}/stub-up/"
    if "offset" in slug or "multiplier" in slug or "parallel" in slug or "dogleg" in slug or "chart" in slug:
        return f"{base_url}/offset/"
    return f"{base_url}/"


def enhance_body_html(
    body_html: str,
    tool_url: str,
    cta_label: str,
    base_url: str,
    quick_links: list | None = None,
) -> str:
    """Wrap tables in .table-wrap and inject a hero CTA bar after the lead paragraph."""
    wrapped = re.sub(
        r"(<table\b[^>]*>.*?</table>)",
        r'<div class="table-wrap">\1</div>',
        body_html,
        flags=re.DOTALL,
    )
    quick_html = ""
    if quick_links:
        pills = "".join(
            f'<a class="quick-tool-link" href="{base_url}{path}" '
            f'onclick="if(window.__ampTrack)window.__ampTrack(\'seo_landing_cta_clicked\',\'quick_tool_link\')">'
            f'{html.escape(label)} &rarr;</a>'
            for path, label in quick_links
        )
        quick_html = f'<div class="quick-tools">{pills}</div>'
    hero_cta = (
        f'\n<div class="hero-cta-bar">'
        f'<span class="muted">Free interactive tool &mdash; no sign-up</span>'
        f'<a class="hero-cta" href="{tool_url}" onclick="if(window.__ampTrack)window.__ampTrack(\'seo_landing_cta_clicked\',\'hero_cta\')">{html.escape(cta_label)} &rarr;</a>'
        f'{quick_html}'
        f'</div>\n'
    )
    if "</p>" in wrapped:
        return wrapped.replace("</p>", "</p>" + hero_cta, 1)
    return hero_cta + wrapped


def render_page(page: dict, base_url: str, ga4_id: str | None) -> str:
    canonical = f"{base_url}/{page['slug']}/"
    host = urlparse(base_url).netloc or "bendcalc.wattflow.net"
    tool_url = calculator_url_for_slug(page["slug"], base_url)
    play_url = build_play_url(page["slug"], "sidebar_play_cta")
    seen_paths: set[str] = {f"/{page['slug']}/"}
    related_items: list[str] = []

    def add_related(path: str, label: str) -> None:
        norm = path if path.startswith("/") else f"/{path}"
        if not norm.endswith("/"):
            norm += "/"
        if norm in seen_paths:
            return
        seen_paths.add(norm)
        related_items.append(f'  <li><a href="{base_url}{norm}">{html.escape(label)}</a></li>')

    for path, label in page.get("related", []):
        add_related(path, label)
    for tool_slug, label in CANONICAL_TOOLS:
        add_related(f"/{tool_slug}/", label)
    for p in PAGES:
        if p["slug"] != page["slug"] and p["slug"] not in REDIRECTED_SLUGS:
            add_related(f"/{p['slug']}/", p["h1"])
    related = "\n".join(related_items)
    import json
    ga4 = GA4_TEMPLATE.format(gid=html.escape(ga4_id)) if ga4_id else ""
    amp_script = AMPLITUDE_TEMPLATE.format(
        api_key=json.dumps(AMPLITUDE_WEB_API_KEY),
        page_slug=json.dumps(page["slug"]),
    )
    faqs = page.get("faqs", [])
    raw_body = page["body"] + render_faq_section(faqs)
    body = enhance_body_html(
        raw_body,
        tool_url,
        page["cta_label"],
        base_url,
        page.get("quick_links"),
    )
    return PAGE_TEMPLATE.format(
        title=html.escape(page["title"]),
        desc=html.escape(page["desc"]),
        canonical=canonical,
        host=host,
        slug=page["slug"],
        h1=html.escape(page["h1"]),
        body=body,
        cta_label=html.escape(page["cta_label"]),
        tool_url=tool_url,
        base=base_url,
        play_url=html.escape(play_url),
        related=related,
        css=BASE_CSS.strip(),
        ga4=ga4,
        amp_script=amp_script,
        faq_jsonld=render_faq_jsonld(faqs),
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

    active_pages = [p for p in PAGES if p["slug"] not in REDIRECTED_SLUGS]

    # Sanity checks: title/description lengths and body word counts.
    for page in active_pages:
        assert len(page["title"]) <= 60, f"title too long ({len(page['title'])}): {page['slug']}"
        assert len(page["desc"]) <= 160, f"desc too long ({len(page['desc'])}): {page['slug']}"
        full_body = page["body"] + render_faq_section(page.get("faqs", []))
        wc = word_count(full_body)
        assert 250 <= wc <= 1500, f"word count {wc} out of range: {page['slug']}"

    for page in active_pages:
        out_dir = os.path.join(export_dir, page["slug"])
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, "index.html")
        with open(out_path, "w") as f:
            f.write(render_page(page, base_url, ga4_id))
        print(f"wrote {out_path} ({word_count(page['body'])} words, ga4={'on' if ga4_id else 'off'})")
    print(f"SEO landing pages: {len(active_pages)} active ({len(REDIRECTED_SLUGS)} deduplicated via _redirects)")


if __name__ == "__main__":
    main()
