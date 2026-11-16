#!/usr/bin/env python3
"""Inject SEO tags into expo web export + write robots.txt/sitemap.xml.

Usage: python3 scripts/inject-web-seo.py dist/ https://bendcalc.wattflow.net [--ga4-id G-XXXX] [--cf-beacon TOKEN]

The GA4 measurement ID can also come from the GA4_ID env var. When no ID is
given, no GA4 code is emitted (pages stay analytics-free). The ID is never
hardcoded; it is injected at build time only.

The Cloudflare Web Analytics beacon token can also come from the
CF_BEACON_TOKEN env var. It must be 32 lowercase hex characters. When no token
is given, no beacon is emitted. The token is never hardcoded; it is injected at
build time only.
Replaces the old /tmp/seo-inject.py (deleted during /tmp cleanup 2026-09-29).
"""
from __future__ import annotations

import datetime
import html
import json
import os
import re
import sys
from urllib.parse import urlparse

EXPORT_DIR = sys.argv[1].rstrip("/")
BASE_URL = sys.argv[2].rstrip("/")
BASE_HOST = urlparse(BASE_URL).netloc or "bendcalc.wattflow.net"
ANDROID_PACKAGE = "com.robin421.conduitbendcalc"
PLAY_URL = f"https://play.google.com/store/apps/details?id={ANDROID_PACKAGE}"

GA4_TEMPLATE = """<script async src="https://www.googletagmanager.com/gtag/js?id={gid}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){{dataLayer.push(arguments);}}
gtag('js', new Date());
gtag('config', '{gid}');
</script>"""


def resolve_ga4_id(argv: list) -> str | None:
    for i, a in enumerate(argv):
        if a == "--ga4-id" and i + 1 < len(argv):
            candidate = argv[i + 1].strip()
            break
    else:
        candidate = (os.environ.get("GA4_ID") or "").strip()
    if candidate and re.fullmatch(r"G-[A-Z0-9]{4,}", candidate):
        return candidate
    if candidate:
        print(f"warning: ignoring malformed GA4 ID {candidate!r}", file=sys.stderr)
    return None


def resolve_cf_beacon(argv: list) -> str | None:
    for i, a in enumerate(argv):
        if a == "--cf-beacon" and i + 1 < len(argv):
            candidate = argv[i + 1].strip()
            break
    else:
        candidate = (os.environ.get("CF_BEACON_TOKEN") or "").strip()
    if candidate and re.fullmatch(r"[0-9a-f]{32}", candidate):
        return candidate
    if candidate:
        print(f"warning: ignoring malformed CF beacon token {candidate!r}", file=sys.stderr)
    return None


GA4_ID = resolve_ga4_id(sys.argv)
GA4_SNIPPET = GA4_TEMPLATE.format(gid=html.escape(GA4_ID)) if GA4_ID else ""

CF_BEACON_TEMPLATE = (
    "<script defer src='https://static.cloudflareinsights.com/beacon.min.js' "
    "data-cf-beacon='{{\"token\": \"{token}\"}}'></script>"
)
CF_BEACON_TOKEN = resolve_cf_beacon(sys.argv)
CF_BEACON_SNIPPET = (
    CF_BEACON_TEMPLATE.format(token=html.escape(CF_BEACON_TOKEN))
    if CF_BEACON_TOKEN
    else ""
)

TITLE = "Conduit Bend Calc \u2014 Free Conduit Bending Calculator | WattFlow"
DESC = (
    "Free conduit bending calculator for electricians: offset bends, 90\u00b0 stubs, "
    "3-point and 4-point saddles, rolling offsets and kicked 90s. Mark spacing, "
    "shrink and take-up in inches or metric. Get Conduit Bend Calc Pro on Google "
    "Play to calibrate measurements to your actual bender."
)
KEYWORDS = (
    "conduit bending calculator, offset bend calculator, stub up calculator, "
    "3 point saddle calculator, 4 point saddle calculator, rolling offset "
    "calculator, electrician bender app, EMT bending"
)

GSC_VERIFY = (os.environ.get("GSC_VERIFY") or "").strip()
BING_VERIFY = (os.environ.get("BING_VERIFY") or "").strip()

WEBSITE_JSONLD = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Conduit Bend Calc",
    "url": f"{BASE_URL}/",
    "publisher": {
        "@type": "Organization",
        "name": "WattFlow",
        "url": "https://wattflow.net",
    },
}

MOBILE_APP_JSONLD = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "name": "Conduit Bend Calc",
    "operatingSystem": "Android",
    "applicationCategory": "UtilitiesApplication",
    "installUrl": PLAY_URL,
    "downloadUrl": PLAY_URL,
    "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free conduit bending calculator with optional Pro bender calibration upgrade.",
    },
    "publisher": {
        "@type": "Organization",
        "name": "WattFlow",
        "url": "https://wattflow.net",
    },
}


def jsonld_tag(data: dict) -> str:
    payload = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")
    return f'<script type="application/ld+json">{payload}</script>'


VERIFY_TAGS = ""
if GSC_VERIFY:
    VERIFY_TAGS += f'<meta name="google-site-verification" content="{html.escape(GSC_VERIFY)}" />\n'
if BING_VERIFY:
    VERIFY_TAGS += f'<meta name="msvalidate.01" content="{html.escape(BING_VERIFY)}" />\n'

SEO_BLOCK = f"""<title>{html.escape(TITLE)}</title>
<meta name="description" content="{html.escape(DESC)}" />
<meta name="keywords" content="{html.escape(KEYWORDS)}" />
<link rel="canonical" href="{BASE_URL}/" />
<link rel="alternate" href="android-app://{ANDROID_PACKAGE}/https/{BASE_HOST}/" />
<meta property="al:android:package" content="{ANDROID_PACKAGE}" />
<meta property="al:android:url" content="{BASE_URL}/" />
<meta property="al:android:app_name" content="Conduit Bend Calc" />
{VERIFY_TAGS}<meta property="og:type" content="website" />
<meta property="og:site_name" content="WattFlow" />
<meta property="og:title" content="{html.escape(TITLE)}" />
<meta property="og:description" content="{html.escape(DESC)}" />
<meta property="og:url" content="{BASE_URL}/" />
<meta property="og:image" content="{BASE_URL}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="{BASE_URL}/og-image.png" />
<meta name="twitter:title" content="{html.escape(TITLE)}" />
<meta name="twitter:description" content="{html.escape(DESC)}" />
{jsonld_tag(WEBSITE_JSONLD)}
{jsonld_tag(MOBILE_APP_JSONLD)}
"""

HOME_STATIC_HTML = f"""<!-- static-seo-home-start -->
<main class="static-seo-home" style="max-width:800px;margin:2rem auto;padding:0 1rem;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#1a1a1a;">
  <h1>Conduit Bend Calc — Free Conduit Bending Calculator</h1>
  <p>Free electrical conduit bending calculator for EMT, IMC, and Rigid conduit: offset bends, 90&deg; stub-ups, 3-point and 4-point saddles, rolling offsets, kicked 90s, shrink, and take-up in imperial inches or metric mm.</p>
  <nav aria-label="Interactive bending calculators">
    <h2>Interactive Calculators</h2>
    <ul>
      <li><a href="/offset/">Offset Bend Calculator</a> — Mark spacing and shrink for 10&deg;, 15&deg;, 22.5&deg;, 30&deg;, 45&deg;, and 60&deg; offsets.</li>
      <li><a href="/4-point-saddle/">4-Point Saddle Calculator</a> — Four marks and total shrink over square obstacles and ductwork.</li>
      <li><a href="/shrink/">Conduit Shrink Calculator</a> — Shrink per inch and total run allowance before cutting.</li>
      <li><a href="/stub-up/">90&deg; Stub-Up Calculator</a> — Take-up deduct and mark placement for EMT, IMC, and Rigid conduit.</li>
    </ul>
  </nav>
  <nav aria-label="Bending guides and charts">
    <h2>Conduit Bending Guides &amp; Charts</h2>
    <ul>
      <li><a href="/conduit-bending-calculator/">Conduit Bending Calculator Guide</a></li>
      <li><a href="/conduit-bending-chart/">Conduit Bending Multiplier &amp; Shrink Chart</a></li>
      <li><a href="/conduit-bending-formula/">Conduit Bending Formulas</a></li>
      <li><a href="/how-to-bend-emt-conduit/">How to Bend EMT Conduit</a></li>
      <li><a href="/offset-multiplier-guide/">Offset Multiplier Guide</a></li>
    </ul>
  </nav>
  <p><a href="{PLAY_URL}">Get Conduit Bend Calc on Google Play</a> for offline jobsite access and Pro bender calibration.</p>
</main>
<!-- static-seo-home-end -->"""

index_path = f"{EXPORT_DIR}/index.html"
with open(index_path) as f:
    content = f.read()

# 幂等：剥离旧的 SEO / App Links / 验证 / JSON-LD 标签，重复跑不再叠加。
content = re.sub(r"<title>.*?</title>\s*", "", content, flags=re.DOTALL)
content = re.sub(
    r'<meta\s+(?:name="(?:description|keywords|google-site-verification|msvalidate\.01|twitter:[^"]*)"|property="(?:og:[^"]*|al:android:[^"]*)")[^>]*/?>\s*',
    "",
    content,
)
content = re.sub(
    r'<link\s+rel="(?:canonical|alternate)"[^>]*/?>\s*',
    "",
    content,
)
content = re.sub(
    r'<script\s+type="application/ld\+json">.*?</script>\s*',
    "",
    content,
    flags=re.DOTALL,
)
content = content.replace("</head>", SEO_BLOCK + "</head>", 1)
if GA4_SNIPPET and "googletagmanager.com/gtag/js" not in content:
    content = content.replace("</head>", GA4_SNIPPET + "</head>", 1)
if CF_BEACON_SNIPPET and "cloudflareinsights.com/beacon" not in content:
    content = content.replace("</head>", CF_BEACON_SNIPPET + "</head>", 1)

# 幂等：向 <div id="root"></div> 注入首页静态语义化 HTML（React 挂载后自动接管替换）。
content = re.sub(
    r'<div id="root">\s*<!-- static-seo-home-start -->.*?<!-- static-seo-home-end -->\s*</div>',
    '<div id="root"></div>',
    content,
    flags=re.DOTALL,
)
if '<div id="root"></div>' in content:
    content = content.replace(
        '<div id="root"></div>',
        f'<div id="root">\n{HOME_STATIC_HTML}\n</div>',
        1,
    )

with open(index_path, "w") as f:
    f.write(content)

# OG 分享图：expo export 不会拷贝未被代码引用的 assets，手动拷到 dist/（幂等，直接覆盖）。
og_src = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "og-image.png")
og_dst = f"{EXPORT_DIR}/og-image.png"
if os.path.exists(og_src):
    import shutil
    shutil.copyfile(og_src, og_dst)
    print("og-image.png copied to dist/")
else:
    print("warning: assets/og-image.png not found, skipping", file=sys.stderr)

# 隐私页（若已拷贝到 dist）：同样注入 GA4 基础代码，保证整站口径一致。
privacy_path = f"{EXPORT_DIR}/privacy.html"
if GA4_SNIPPET and os.path.exists(privacy_path):
    with open(privacy_path) as f:
        privacy = f.read()
    if "googletagmanager" not in privacy:
        privacy = privacy.replace("</head>", GA4_SNIPPET + "</head>", 1)
        with open(privacy_path, "w") as f:
            f.write(privacy)
        print("GA4 injected into privacy.html")

# 隐私页同样注入 Cloudflare Web Analytics beacon（与 GA4 同样的注入位置和幂等标记）。
if CF_BEACON_SNIPPET and os.path.exists(privacy_path):
    with open(privacy_path) as f:
        privacy = f.read()
    if "cloudflareinsights.com/beacon" not in privacy:
        privacy = privacy.replace("</head>", CF_BEACON_SNIPPET + "</head>", 1)
        with open(privacy_path, "w") as f:
            f.write(privacy)
        print("CF beacon injected into privacy.html")

# 4 个 SPA 工具页 shell（scripts/gen-seo-tool-shells.ts 生成 dist/<slug>/index.html）。
# 若 shell 在 GA4 注入之后生成（见 CHANGELOG 构建顺序），它们已经继承了 index.html
# 的 gtag；若在其之前生成，则此处补齐，保证新工具页无论构建顺序都能被 GA4 覆盖。
TOOL_SHELL_SLUGS = ["offset", "4-point-saddle", "shrink", "stub-up"]
if GA4_SNIPPET:
    for slug in TOOL_SHELL_SLUGS:
        shell_path = f"{EXPORT_DIR}/{slug}/index.html"
        if not os.path.exists(shell_path):
            continue
        with open(shell_path) as f:
            shell = f.read()
        if "googletagmanager" in shell:
            continue
        shell = shell.replace("</head>", GA4_SNIPPET + "</head>", 1)
        with open(shell_path, "w") as f:
            f.write(shell)
        print(f"GA4 injected into {slug}/index.html")

# 4 个 SPA 工具页 shell 同样补齐 Cloudflare Web Analytics beacon。
if CF_BEACON_SNIPPET:
    for slug in TOOL_SHELL_SLUGS:
        shell_path = f"{EXPORT_DIR}/{slug}/index.html"
        if not os.path.exists(shell_path):
            continue
        with open(shell_path) as f:
            shell = f.read()
        if "cloudflareinsights.com/beacon" in shell:
            continue
        shell = shell.replace("</head>", CF_BEACON_SNIPPET + "</head>", 1)
        with open(shell_path, "w") as f:
            f.write(shell)
        print(f"CF beacon injected into {slug}/index.html")

with open(f"{EXPORT_DIR}/robots.txt", "w") as f:
    f.write(f"User-agent: *\nAllow: /\n\nSitemap: {BASE_URL}/sitemap.xml\n")

# Standalone SEO landing pages generated by scripts/gen-seo-pages.py
# (dist/<slug>/index.html). Keep in sync with that script's page list.
SEO_PATHS = [
    "conduit-bending-calculator/",
    "offset-calculator/",
    "rolling-offset-calculator/",
    "stub-up-calculator/",
    "3-point-saddle-calculator/",
    "4-point-saddle-calculator/",
    # Batch 2 (2026-09-29). Keep in sync with scripts/gen-seo-pages.py page list.
    "kick-90-calculator/",
    "90-degree-bend-calculator/",
    "conduit-bending-chart/",
    "conduit-shrink-calculator/",
    "parallel-offset-calculator/",
    "how-to-bend-emt-conduit/",
    # Batch 4 (2026-10-04, P0 interactive tools). Generated as SPA shells by
    # scripts/gen-seo-tool-shells.ts (not content pages by gen-seo-pages.py),
    # but they share the same sitemap. Keep in sync with src/seo/toolPages.ts.
    "offset/",
    "4-point-saddle/",
    "shrink/",
    "stub-up/",
    # Batch 3 (2026-09-29). Keep in sync with scripts/gen-seo-pages.py page list.
    "conduit-bending-formula/",
    "hand-bender-markings/",
    "emt-sizes-chart/",
    "box-offset-bend/",
    "how-to-bend-3-4-emt/",
    "emt-vs-rigid-bending/",
    # Batch 5 (2026-10-08, AI-search Q&A). Keep in sync with scripts/gen-seo-pages.py.
    "offset-multiplier-guide/",
    "conduit-bending-gain/",
    "conduit-bending-deduct/",
    "conduit-bending-mistakes/",
    "conduit-bend-radius/",
]

today_iso = datetime.date.today().isoformat()

with open(f"{EXPORT_DIR}/sitemap.xml", "w") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
    f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    f.write(
        "  <url>\n"
        f"    <loc>{BASE_URL}/</loc>\n"
        f"    <lastmod>{today_iso}</lastmod>\n"
        "    <changefreq>weekly</changefreq>\n"
        "    <priority>1.0</priority>\n"
        "  </url>\n"
    )
    for path in SEO_PATHS:
        f.write(
            "  <url>\n"
            f"    <loc>{BASE_URL}/{path}</loc>\n"
            f"    <lastmod>{today_iso}</lastmod>\n"
            "    <changefreq>monthly</changefreq>\n"
            "    <priority>0.8</priority>\n"
            "  </url>\n"
        )
    if os.path.exists(privacy_path):
        f.write(
            "  <url>\n"
            f"    <loc>{BASE_URL}/privacy.html</loc>\n"
            f"    <lastmod>{today_iso}</lastmod>\n"
            "    <changefreq>yearly</changefreq>\n"
            "    <priority>0.3</priority>\n"
            "  </url>\n"
        )
    f.write("</urlset>\n")

# Google Play App Links: dist/.well-known/assetlinks.json
raw_fingerprints = (os.environ.get("ANDROID_SHA256_FINGERPRINTS") or "").strip()
fingerprints = [fp.strip() for fp in raw_fingerprints.split(",") if fp.strip()]
well_known_dir = f"{EXPORT_DIR}/.well-known"
os.makedirs(well_known_dir, exist_ok=True)
assetlinks = [
    {
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
            "namespace": "android_app",
            "package_name": ANDROID_PACKAGE,
            "sha256_cert_fingerprints": fingerprints,
        },
    }
]
with open(f"{well_known_dir}/assetlinks.json", "w") as f:
    json.dump(assetlinks, f, indent=2)
    f.write("\n")

if fingerprints:
    print(f"assetlinks.json wrote ({len(fingerprints)} SHA-256 fingerprint(s))")
else:
    print(
        "warning: ANDROID_SHA256_FINGERPRINTS not set; assetlinks.json has empty "
        "sha256_cert_fingerprints. Set ANDROID_SHA256_FINGERPRINTS=\"AA:BB:...\" "
        "from Google Play Console > App integrity > App signing key certificate before deploy.",
        file=sys.stderr,
    )

# Cloudflare Pages static headers: dist/_headers
headers_content = """/.well-known/assetlinks.json
  Content-Type: application/json
  Access-Control-Allow-Origin: *

/sitemap.xml
  Content-Type: application/xml; charset=utf-8

/robots.txt
  Content-Type: text/plain; charset=utf-8

/sw.js
  Cache-Control: no-cache
"""
with open(f"{EXPORT_DIR}/_headers", "w") as f:
    f.write(headers_content)
print("Cloudflare Pages _headers wrote")

# Bing IndexNow verification key file: dist/<INDEXNOW_KEY>.txt
indexnow_key = (os.environ.get("INDEXNOW_KEY") or "").strip()
if indexnow_key:
    if re.fullmatch(r"[A-Za-z0-9\-]{8,128}", indexnow_key):
        with open(f"{EXPORT_DIR}/{indexnow_key}.txt", "w") as f:
            f.write(indexnow_key + "\n")
        print(f"IndexNow key file wrote: {indexnow_key}.txt")
    else:
        print(f"warning: ignoring malformed INDEXNOW_KEY {indexnow_key!r}", file=sys.stderr)

print(f"SEO injected: title={TITLE[:40]}... base={BASE_URL}")
print(f"GA4: {'on (' + GA4_ID + ')' if GA4_ID else 'off'}")
print(
    f"CF beacon: {'on (' + CF_BEACON_TOKEN + ')' if CF_BEACON_TOKEN else 'off'}"
)


# ---------------------------------------------------------------------------
# Service worker: 预缓存只放首屏关键资源（HTML shell + index.html 直接引用的
# entry bundle）；按路由拆分的 async chunk（工具页 / 内部 App）不预缓存，
# 但首次在线加载时按需写入 runtime cache，之后离线也能用。
# 不缓存任何第三方（gtag 等）或图片，避免无谓占用。
# ---------------------------------------------------------------------------
html_path = f"{EXPORT_DIR}/index.html"
with open(html_path) as f:
    index_html = f.read()
entry_match = re.search(r'src="(/_expo/static/js/web/[^"]+\.js)"', index_html)
precache = ["/", "/index.html"]
if entry_match:
    precache.append(entry_match.group(1))
version = (
    os.path.basename(entry_match.group(1)).split(".")[0]
    if entry_match
    else "v1"
)
sw = f"""/* Generated by scripts/inject-web-seo.py. Do not edit in dist. */
const CACHE = 'bendcalc-shell-{version}';
const PRECACHE = {precache!r};

self.addEventListener('install', (event) => {{
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
}});

self.addEventListener('activate', (event) => {{
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
}});

/** 只对同源 JS chunk 做 cache-first（命中就返回，未命中回源并回填）。 */
async function cachedScript(request) {{
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {{
    cache.put(request, response.clone());
  }}
  return response;
}}

self.addEventListener('fetch', (event) => {{
  const {{ request }} = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 导航：优先网络，离线回退缓存的 SPA shell（SPA 路由自己解析 path）。
  if (request.mode === 'navigate') {{
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }}

  // 首屏关键资源 + 按路由拆分的 JS chunk：cache-first。
  if (
    PRECACHE.includes(url.pathname) ||
    url.pathname.startsWith('/_expo/static/js/web/')
  ) {{
    event.respondWith(cachedScript(request));
  }}
}});
"""
with open(f"{EXPORT_DIR}/sw.js", "w") as f:
    f.write(sw)
print(
    f"Service worker wrote: cache={version}, precache={precache}"
)
