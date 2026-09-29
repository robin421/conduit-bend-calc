#!/usr/bin/env python3
"""Inject SEO tags into expo web export + write robots.txt/sitemap.xml.

Usage: python3 scripts/inject-web-seo.py dist/ https://bendcalc.wattflow.net
Replaces the old /tmp/seo-inject.py (deleted during /tmp cleanup 2026-09-29).
"""
import html
import re
import sys

EXPORT_DIR = sys.argv[1].rstrip("/")
BASE_URL = sys.argv[2].rstrip("/")

TITLE = "Conduit Bend Calc \u2014 Free Conduit Bending Calculator (Offset, Stub, Saddles)"
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

SEO_BLOCK = f"""<title>{html.escape(TITLE)}</title>
<meta name="description" content="{html.escape(DESC)}" />
<meta name="keywords" content="{html.escape(KEYWORDS)}" />
<link rel="canonical" href="{BASE_URL}/" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Conduit Bend Calc" />
<meta property="og:title" content="{html.escape(TITLE)}" />
<meta property="og:description" content="{html.escape(DESC)}" />
<meta property="og:url" content="{BASE_URL}/" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="{html.escape(TITLE)}" />
<meta name="twitter:description" content="{html.escape(DESC)}" />
"""

index_path = f"{EXPORT_DIR}/index.html"
with open(index_path) as f:
    content = f.read()

# Remove any existing <title> to avoid duplicates, then inject before </head>.
content = re.sub(r"<title>.*?</title>", "", content, flags=re.DOTALL)
content = content.replace("</head>", SEO_BLOCK + "</head>", 1)

with open(index_path, "w") as f:
    f.write(content)

with open(f"{EXPORT_DIR}/robots.txt", "w") as f:
    f.write(f"User-agent: *\nAllow: /\n\nSitemap: {BASE_URL}/sitemap.xml\n")

with open(f"{EXPORT_DIR}/sitemap.xml", "w") as f:
    f.write(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        "  <url>\n"
        f"    <loc>{BASE_URL}/</loc>\n"
        "    <changefreq>weekly</changefreq>\n"
        "    <priority>1.0</priority>\n"
        "  </url>\n"
        "</urlset>\n"
    )

print(f"SEO injected: title={TITLE[:40]}... base={BASE_URL}")
