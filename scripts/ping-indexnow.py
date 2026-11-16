#!/usr/bin/env python3
"""Submit all URLs from dist/sitemap.xml to Bing / IndexNow API.

Usage:
  python3 scripts/ping-indexnow.py --dry-run
  INDEXNOW_KEY=<32-char-key> python3 scripts/ping-indexnow.py --host bendcalc.wattflow.net
  python3 scripts/ping-indexnow.py --key <32-char-key> --host bendcalc.wattflow.net --sitemap dist/sitemap.xml
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"
SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def extract_urls(sitemap_path: str) -> list[str]:
    tree = ET.parse(sitemap_path)
    root = tree.getroot()
    urls: list[str] = []
    for loc in root.findall(".//sm:loc", SITEMAP_NS):
        if loc.text and loc.text.strip():
            urls.append(loc.text.strip())
    if not urls:
        for loc in root.findall(".//loc"):
            if loc.text and loc.text.strip():
                urls.append(loc.text.strip())
    return urls


def main() -> int:
    parser = argparse.ArgumentParser(description="Submit sitemap URLs to IndexNow.")
    parser.add_argument(
        "--sitemap",
        default="dist/sitemap.xml",
        help="Path to sitemap.xml (default: dist/sitemap.xml)",
    )
    parser.add_argument(
        "--host",
        default="bendcalc.wattflow.net",
        help="Site host (default: bendcalc.wattflow.net)",
    )
    parser.add_argument(
        "--key",
        default="",
        help="IndexNow key (or set INDEXNOW_KEY environment variable)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print payload without sending an HTTP request",
    )
    args = parser.parse_args()

    if not os.path.exists(args.sitemap):
        print(f"error: sitemap not found: {args.sitemap}", file=sys.stderr)
        return 1

    urls = extract_urls(args.sitemap)
    if not urls:
        print(f"error: no <loc> URLs found in {args.sitemap}", file=sys.stderr)
        return 1

    key = (args.key or os.environ.get("INDEXNOW_KEY") or "").strip()
    if not key:
        if args.dry_run:
            key = "<INDEXNOW_KEY>"
        else:
            print(
                "error: IndexNow key required via --key or INDEXNOW_KEY env var",
                file=sys.stderr,
            )
            return 1

    payload = {
        "host": args.host,
        "key": key,
        "keyLocation": f"https://{args.host}/{key}.txt",
        "urlList": urls,
    }

    if args.dry_run:
        print(f"[dry-run] endpoint={INDEXNOW_ENDPOINT}")
        print(json.dumps(payload, indent=2))
        print(f"[dry-run] {len(urls)} URL(s) ready for submission.")
        return 0

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        INDEXNOW_ENDPOINT,
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            resp_body = resp.read().decode("utf-8", errors="replace")
            print(f"IndexNow HTTP {resp.status}: {len(urls)} URL(s) submitted. {resp_body}".strip())
            return 0
    except urllib.error.HTTPError as err:
        err_body = err.read().decode("utf-8", errors="replace")
        print(f"IndexNow HTTP error {err.code}: {err_body}", file=sys.stderr)
        return 1
    except urllib.error.URLError as err:
        print(f"IndexNow network error: {err.reason}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
