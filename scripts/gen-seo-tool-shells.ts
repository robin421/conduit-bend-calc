/**
 * 为 4 个 P0 SEO 工具页生成静态 HTML shell。
 *
 * 用法（在 `npx expo export --platform web` 之后运行）：
 *   node scripts/gen-seo-tool-shells.ts dist/ https://bendcalc.wattflow.net
 *
 * 原理：expo web export 产出的是 SPA（根目录 index.html + #root + bundle）。
 * 每个工具页复制同一份 SPA shell，只替换 <head> 里的
 * title / description / canonical / OG / Twitter / JSON-LD，
 * 写进 dist/<slug>/index.html。Cloudflare Pages 会以 /offset/ 提供它。
 * 浏览器加载后，React Navigation（App.tsx 的 linking 配置）按 URL 渲染对应计算器。
 *
 * title / description / FAQ schema 全部来自 src/seo/toolPages.ts 单一来源，
 * 与屏幕展示内容不可能漂移。可重复运行（会先剥离旧的 SEO 标签）。
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { LANGS, type Lang } from '../src/i18n/lang.ts';
import { buildGooglePlayUrl } from '../src/lib/homeContent.ts';
import {
  buildCanonicalUrl,
  buildFaqPageJsonLd,
  buildRelatedLinks,
  buildWebApplicationJsonLd,
  getRelatedCalculatorsTitle,
  getSeoToolPageCopy,
  SEO_SITE_URL,
  SEO_TOOL_PAGES,
} from '../src/seo/toolPages.ts';
import { buildAlternatesForPath } from '../src/lib/seoHead.ts';

const HEAD_TAG_PATTERNS = [
  /<title>.*?<\/title>/gis,
  /<meta\s+name="description"[^>]*>/gi,
  /<meta\s+name="keywords"[^>]*>/gi,
  /<meta\s+name="robots"[^>]*>/gi,
  /<link\s+rel="canonical"[^>]*>/gi,
  /<link\s+rel="alternate"[^>]*>/gi,
  /<meta\s+property="og:[^"]*"[^>]*>/gi,
  /<meta\s+property="al:android:[^"]*"[^>]*>/gi,
  /<meta\s+name="twitter:[^"]*"[^>]*>/gi,
  /<script\s+type="application\/ld\+json">.*?<\/script>/gis,
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonLdScript(data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function buildHead(
  page: (typeof SEO_TOOL_PAGES)[number],
  baseUrl: string,
  lang: Lang,
): string {
  const copy = getSeoToolPageCopy(page, lang);
  const canonical = buildCanonicalUrl(page, baseUrl, lang);
  const host = new URL(baseUrl || SEO_SITE_URL).host;
  const routePath = lang === 'es' ? `/es${page.path}` : page.path;
  const title = escapeHtml(copy.title);
  const description = escapeHtml(copy.description);
  const alternates = buildAlternatesForPath(page.path, baseUrl)
    .map(
      (alt) =>
        `<link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />`,
    )
    .join('\n');
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="index,follow" />`,
    `<link rel="canonical" href="${canonical}" />`,
    alternates,
    `<link rel="alternate" href="android-app://com.robin421.conduitbendcalc/https/${host}${routePath}/" />`,
    `<meta property="al:android:package" content="com.robin421.conduitbendcalc" />`,
    `<meta property="al:android:url" content="${canonical}" />`,
    `<meta property="al:android:app_name" content="Conduit Bend Calc" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="WattFlow" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    jsonLdScript(buildWebApplicationJsonLd(page, baseUrl, lang)),
    jsonLdScript(buildFaqPageJsonLd(page, lang)),
  ].join('\n');
}

function setHtmlLang(shell: string, lang: Lang): string {
  if (/<html\b[^>]*\blang="[^"]*"/i.test(shell)) {
    return shell.replace(/(<html\b[^>]*\blang=")[^"]*(")/i, `$1${lang}$2`);
  }
  return shell.replace(/<html\b/i, `<html lang="${lang}"`);
}

function injectHead(shell: string, headBlock: string, lang: Lang): string {
  let output = setHtmlLang(shell, lang);
  for (const pattern of HEAD_TAG_PATTERNS) {
    output = output.replace(pattern, '');
  }
  if (!output.includes('</head>')) {
    throw new Error('index.html has no </head>; cannot inject SEO tags');
  }
  return output.replace('</head>', `${headBlock}\n</head>`);
}

/**
 * 生成各工具页的专业 NEC / EMT 速查表 HTML（爬虫直接抓取，提升关键词密度与权威度）。
 */
function buildCheatSheetHtml(key: (typeof SEO_TOOL_PAGES)[number]['key']): string {
  switch (key) {
    case 'offset':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Conduit Offset Bend Multiplier & Shrink Chart (NEC Standards)</h2>',
        '  <p>Standard multipliers and shrink constants for EMT, IMC, and Rigid electrical conduit:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Bend Angle</th><th>Multiplier</th><th>Shrink Per Inch</th><th>Example (6" Offset)</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>10°</td><td>6.0</td><td>1/16" (0.063")</td><td>Distance: 36" · Shrink: 3/8"</td></tr>',
        '      <tr><td>15°</td><td>3.86</td><td>1/8" (0.125")</td><td>Distance: 23 3/16" · Shrink: 3/4"</td></tr>',
        '      <tr><td>22.5°</td><td>2.6</td><td>3/16" (0.188")</td><td>Distance: 15 5/8" · Shrink: 1 1/8"</td></tr>',
        '      <tr><td>30° (Standard)</td><td>2.0</td><td>1/4" (0.250")</td><td>Distance: 12" · Shrink: 1 1/2"</td></tr>',
        '      <tr><td>45°</td><td>1.4</td><td>3/8" (0.375")</td><td>Distance: 8 1/2" · Shrink: 2 1/4"</td></tr>',
        '      <tr><td>60°</td><td>1.2</td><td>1/2" (0.500")</td><td>Distance: 7 1/4" · Shrink: 3"</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Formulas:</strong> <em>Distance Between Marks = Offset Height × Multiplier</em>; <em>Total Shrink = Offset Height × Shrink Per Inch</em>.</p>',
        '</section>',
      ].join('\n');
    case 'stubUp':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>90° Stub-Up Deduct (Take-Up) Chart for EMT & Rigid Conduit</h2>',
        '  <p>Standard manufacturer take-up deducts stamped on hand bender shoes:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Conduit Trade Size</th><th>Conduit Type</th><th>Take-Up (Deduct)</th><th>Centerline Radius</th><th>Min Stub Height</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>1/2"</td><td>EMT</td><td>5"</td><td>4.00"</td><td>6"</td></tr>',
        '      <tr><td>3/4"</td><td>EMT</td><td>6"</td><td>4.50"</td><td>8"</td></tr>',
        '      <tr><td>1"</td><td>EMT</td><td>8"</td><td>5.75"</td><td>11"</td></tr>',
        '      <tr><td>1-1/4"</td><td>EMT</td><td>11"</td><td>7.25"</td><td>14"</td></tr>',
        '      <tr><td>1/2"</td><td>Rigid / IMC</td><td>6"</td><td>4.25"</td><td>8"</td></tr>',
        '      <tr><td>3/4"</td><td>Rigid / IMC</td><td>8"</td><td>5.00"</td><td>10"</td></tr>',
        '      <tr><td>1"</td><td>Rigid / IMC</td><td>11"</td><td>6.00"</td><td>14"</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Formula:</strong> <em>Mark 1 Location = Desired Stub Height − Take-Up Deduct</em> (align bender arrow with Mark 1).</p>',
        '</section>',
      ].join('\n');
    case 'shrink':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Conduit Bend Shrink Reference Table</h2>',
        '  <p>Shrink is the overall length consumed when bending around an obstacle:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Angle</th><th>Shrink Per Inch of Rise</th><th>Decimal</th><th>Single Offset (4" Rise)</th><th>4-Point Saddle (4" Rise)</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>10°</td><td>1/16"</td><td>0.063"</td><td>1/4"</td><td>1/2"</td></tr>',
        '      <tr><td>15°</td><td>1/8"</td><td>0.125"</td><td>1/2"</td><td>1"</td></tr>',
        '      <tr><td>22.5°</td><td>3/16"</td><td>0.188"</td><td>3/4"</td><td>1 1/2"</td></tr>',
        '      <tr><td>30° (Standard)</td><td>1/4"</td><td>0.250"</td><td>1"</td><td>2"</td></tr>',
        '      <tr><td>45°</td><td>3/8"</td><td>0.375"</td><td>1 1/2"</td><td>3"</td></tr>',
        '      <tr><td>60°</td><td>1/2"</td><td>0.500"</td><td>2"</td><td>4"</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Rule of thumb:</strong> Add total shrink to your measured center-to-center run length before cutting conduit.</p>',
        '</section>',
      ].join('\n');
    case 'saddle3':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>3-Point Saddle Bend Multiplier &amp; Center Shrink Chart</h2>',
        '  <p>Standard field multipliers and center mark shrink constants for jumping round pipes and narrow obstacles:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Center Bend</th><th>Side Bends</th><th>Side Mark Spacing</th><th>Center Shrink / Inch</th><th>Example (4" Obstacle)</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>45° (Standard)</td><td>22.5° / 22.5°</td><td>Height × 2.5</td><td>3/16" (0.188")</td><td>Sides: 10" · Span: 20" · Shrink: 3/4"</td></tr>',
        '      <tr><td>60° (Tight)</td><td>30° / 30°</td><td>Height × 2.0</td><td>1/4" (0.250")</td><td>Sides: 8" · Span: 16" · Shrink: 1"</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Bender Marks:</strong> Place the center mark on the <em>rim notch</em> (teardrop) for the center bend, then flip the conduit and align the two outer marks with the <em>arrow</em> for the opposite side bends.</p>',
        '</section>',
      ].join('\n');
    case 'conduitFill':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>NEC 2023 Conduit Fill Table C.1 Quick Chart (EMT · THHN / THWN-2)</h2>',
        '  <p>Maximum number of same-size THHN / THWN-2 conductors in EMT per NEC Chapter 9 Table 1 (40% fill for 3+ wires, 31% for 2 wires, 53% for 1 wire, Note 7 rounding):</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>EMT Trade Size</th><th>14 AWG</th><th>12 AWG</th><th>10 AWG</th><th>8 AWG</th><th>6 AWG</th><th>4 AWG</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>1/2"</td><td>12</td><td>9</td><td>5</td><td>3</td><td>2</td><td>1</td></tr>',
        '      <tr><td>3/4"</td><td>22</td><td>16</td><td>10</td><td>6</td><td>4</td><td>2</td></tr>',
        '      <tr><td>1"</td><td>35</td><td>26</td><td>16</td><td>9</td><td>7</td><td>4</td></tr>',
        '      <tr><td>1-1/4"</td><td>61</td><td>45</td><td>28</td><td>16</td><td>12</td><td>7</td></tr>',
        '      <tr><td>1-1/2"</td><td>84</td><td>61</td><td>38</td><td>22</td><td>16</td><td>10</td></tr>',
        '      <tr><td>2"</td><td>138</td><td>101</td><td>63</td><td>36</td><td>26</td><td>16</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>NEC Rule:</strong> Supports EMT, IMC, Rigid (RMC), and PVC Schedule 40 from 1/2" to 4" across 14 AWG to 500 kcmil. Nipples &le; 24" may fill up to 60%.</p>',
        '</section>',
      ].join('\n');
    case 'saddle4':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>4-Point Saddle Spacing and Clearance Table</h2>',
        '  <p>Dimensions for bending two equal offsets back-to-back over square obstacles, ductwork, and structural beams:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Bend Angle</th><th>Marks 1 to 2 (Distance)</th><th>Marks 2 to 3 (Center Span)</th><th>Marks 3 to 4 (Distance)</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>22.5°</td><td>Obstacle Height × 2.6</td><td>Obstacle Width + Shrink</td><td>Obstacle Height × 2.6</td></tr>',
        '      <tr><td>30° (Standard)</td><td>Obstacle Height × 2.0</td><td>Obstacle Width + Shrink</td><td>Obstacle Height × 2.0</td></tr>',
        '      <tr><td>45°</td><td>Obstacle Height × 1.4</td><td>Obstacle Width + Shrink</td><td>Obstacle Height × 1.4</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Note:</strong> Total 4-point saddle shrink equals twice the shrink of a single offset bend (2 × Height × Shrink Factor).</p>',
        '</section>',
      ].join('\n');
    case 'rollingOffset':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Rolling Offset True Offset &amp; Multiplier Quick Reference</h2>',
        '  <p>Calculate true offset first with Pythagoras, then apply standard conduit offset multipliers and shrink per inch:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Rise × Roll</th><th>True Offset √(Rise² + Roll²)</th><th>30° Mark Spacing (×2.0)</th><th>30° Shrink (1/4"/in)</th><th>45° Mark Spacing (×1.4)</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>3" × 4"</td><td>5.0"</td><td>10"</td><td>1 1/4"</td><td>7"</td></tr>',
        '      <tr><td>6" × 8"</td><td>10.0"</td><td>20"</td><td>2 1/2"</td><td>14"</td></tr>',
        '      <tr><td>8" × 8"</td><td>11.31"</td><td>22 5/8"</td><td>2 13/16"</td><td>15 7/8"</td></tr>',
        '      <tr><td>9" × 12"</td><td>15.0"</td><td>30"</td><td>3 3/4"</td><td>21"</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Formulas:</strong> <em>True Offset = √(Rise² + Roll²)</em>; <em>Mark Spacing = True Offset × Multiplier</em>; <em>Rotation Angle = atan(Roll ÷ Rise)</em>.</p>',
        '</section>',
      ].join('\n');
    case 'kicked90':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Kicked 90° Bend Multiplier &amp; EMT Take-Up Chart</h2>',
        '  <p>Subtract bender take-up to mark your 90° stub, then multiply kick height by the kick angle multiplier to mark from the back of the 90°:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Kick Angle</th><th>Multiplier</th><th>Shrink / Inch</th><th>4" Kick Mark (from Back of 90°)</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>10°</td><td>6.0</td><td>1/16"</td><td>24"</td></tr>',
        '      <tr><td>15°</td><td>3.9</td><td>1/8"</td><td>15 5/8"</td></tr>',
        '      <tr><td>22.5°</td><td>2.6</td><td>3/16"</td><td>10 3/8"</td></tr>',
        '      <tr><td>30° (Standard)</td><td>2.0</td><td>1/4"</td><td>8"</td></tr>',
        '      <tr><td>45°</td><td>1.4</td><td>3/8"</td><td>5 5/8"</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Standard Hand-Bender EMT Take-Up:</strong> 1/2" EMT = 5" · 3/4" EMT = 6" · 1" EMT = 8". <em>Stub Mark = Target Stub Height − Take-Up</em>.</p>',
        '</section>',
      ].join('\n');
    case 'wireSize':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>NEC 2023 Table 310.16 Conductor Ampacity Chart (Cu &amp; Al)</h2>',
        '  <p>Allowable ampacities for up to 3 current-carrying conductors in a raceway at 30°C ambient (125% rule applies to continuous loads ≥ 3 hr):</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Wire Size</th><th>Copper 60°C</th><th>Copper 75°C</th><th>Copper 90°C</th><th>Aluminum 75°C</th><th>NEC 240.4(D) Max OCPD</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>14 AWG</td><td>15 A</td><td>20 A</td><td>25 A</td><td>—</td><td>15 A Cu</td></tr>',
        '      <tr><td>12 AWG</td><td>20 A</td><td>25 A</td><td>30 A</td><td>20 A</td><td>20 A Cu / 15 A Al</td></tr>',
        '      <tr><td>10 AWG</td><td>30 A</td><td>35 A</td><td>40 A</td><td>30 A</td><td>30 A Cu / 25 A Al</td></tr>',
        '      <tr><td>8 AWG</td><td>40 A</td><td>50 A</td><td>55 A</td><td>40 A</td><td>Per 310.16</td></tr>',
        '      <tr><td>6 AWG</td><td>55 A</td><td>65 A</td><td>75 A</td><td>50 A</td><td>Per 310.16</td></tr>',
        '      <tr><td>4 AWG</td><td>70 A</td><td>85 A</td><td>95 A</td><td>65 A</td><td>Per 310.16</td></tr>',
        '      <tr><td>2 AWG</td><td>95 A</td><td>115 A</td><td>130 A</td><td>90 A</td><td>Per 310.16</td></tr>',
        '      <tr><td>1/0 AWG</td><td>125 A</td><td>150 A</td><td>170 A</td><td>120 A</td><td>Per 310.16</td></tr>',
        '      <tr><td>3/0 AWG</td><td>165 A</td><td>200 A</td><td>225 A</td><td>155 A</td><td>Per 310.16</td></tr>',
        '      <tr><td>4/0 AWG</td><td>195 A</td><td>230 A</td><td>260 A</td><td>180 A</td><td>Per 310.16</td></tr>',
        '      <tr><td>500 kcmil</td><td>320 A</td><td>380 A</td><td>430 A</td><td>310 A</td><td>Per 310.16</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>NEC 110.14(C)(1):</strong> Circuits ≤100 A default to 60°C terminations unless listed for 75°C; circuits &gt;100 A use 75°C.</p>',
        '</section>',
      ].join('\n');
    case 'voltageDrop':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>NEC Chapter 9 Table 8 Conductor Resistance &amp; Voltage Drop Formulas</h2>',
        '  <p>DC resistance at 75°C (Ω per 1,000 ft) used to verify NEC 210.19(A) 3% branch / 5% total voltage drop limits:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Wire Size</th><th>Copper R (Ω / 1,000 ft)</th><th>Aluminum R (Ω / 1,000 ft)</th><th>Max 1φ 120V Run @ 15A (≤3%)</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>14 AWG</td><td>3.140</td><td>—</td><td>38 ft (Cu)</td></tr>',
        '      <tr><td>12 AWG</td><td>1.980</td><td>3.250</td><td>60 ft (Cu)</td></tr>',
        '      <tr><td>10 AWG</td><td>1.240</td><td>2.040</td><td>96 ft (Cu)</td></tr>',
        '      <tr><td>8 AWG</td><td>0.778</td><td>1.280</td><td>154 ft (Cu)</td></tr>',
        '      <tr><td>6 AWG</td><td>0.491</td><td>0.808</td><td>244 ft (Cu)</td></tr>',
        '      <tr><td>4 AWG</td><td>0.308</td><td>0.508</td><td>389 ft (Cu)</td></tr>',
        '      <tr><td>2 AWG</td><td>0.194</td><td>0.319</td><td>618 ft (Cu)</td></tr>',
        '      <tr><td>1/0 AWG</td><td>0.122</td><td>0.201</td><td>983 ft (Cu)</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Formulas:</strong> <em>Single-phase VD = (2 × L × I × R) ÷ 1,000</em> · <em>Three-phase VD = (1.732 × L × I × R) ÷ 1,000</em>, where L is one-way feet and I is load amps.</p>',
        '</section>',
      ].join('\n');
  }
}

/**
 * 西班牙语版专业 NEC / EMT 速查表 HTML（地道的美国/墨西哥电工术语：conducto / tubo conduit）。
 */
function buildCheatSheetHtmlEs(key: (typeof SEO_TOOL_PAGES)[number]['key']): string {
  switch (key) {
    case 'offset':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Tabla de multiplicadores y contracción para desplazamiento de conducto (EMT y rígido)</h2>',
        '  <p>Multiplicadores y contracción estándar de campo para tubo conduit EMT, IMC y rígido:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Ángulo</th><th>Multiplicador</th><th>Contracción por pulgada</th><th>Ejemplo (desplazamiento de 6")</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>10°</td><td>6.0</td><td>1/16" (0.063")</td><td>Distancia: 36" · Contracción: 3/8"</td></tr>',
        '      <tr><td>15°</td><td>3.9</td><td>1/8" (0.125")</td><td>Distancia: 23-3/8" · Contracción: 3/4"</td></tr>',
        '      <tr><td>22.5°</td><td>2.6</td><td>3/16" (0.188")</td><td>Distancia: 15-5/8" · Contracción: 1-1/8"</td></tr>',
        '      <tr><td>30° (Estándar)</td><td>2.0</td><td>1/4" (0.250")</td><td>Distancia: 12" · Contracción: 1-1/2"</td></tr>',
        '      <tr><td>45°</td><td>1.4</td><td>3/8" (0.375")</td><td>Distancia: 8-3/8" · Contracción: 2-1/4"</td></tr>',
        '      <tr><td>60°</td><td>1.2</td><td>1/2" (0.500")</td><td>Distancia: 7-3/16" · Contracción: 3"</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Fórmulas:</strong> <em>Distancia entre marcas = Altura × Multiplicador</em>; <em>Contracción total = Altura × Contracción por pulgada</em>.</p>',
        '</section>',
      ].join('\n');
    case 'stubUp':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Tabla de deducción (recogida / take-up) para doblez de 90° en EMT y conducto rígido</h2>',
        '  <p>Deducciones estándar de dobladores manuales, mecánicos y eléctricos (Ideal, Klein y Greenlee):</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Diámetro</th><th>Tipo de conducto</th><th>Deducción (recogida)</th><th>Radio central (R)</th><th>Referencia</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>1/2"</td><td>EMT (Ideal 74-026)</td><td>5"</td><td>4-5/16" (4.3125")</td><td>Flecha</td></tr>',
        '      <tr><td>1/2"</td><td>EMT (Klein 51603)</td><td>5"</td><td>4-5/8" (4.625")</td><td>Flecha</td></tr>',
        '      <tr><td>3/4"</td><td>EMT (Ideal 74-027 / Klein 51604)</td><td>6"</td><td>5-1/4" / 5-1/2"</td><td>Flecha</td></tr>',
        '      <tr><td>1"</td><td>EMT (Klein 51605)</td><td>8"</td><td>7-3/8" (7.375")</td><td>Flecha</td></tr>',
        '      <tr><td>1/2"</td><td>EMT (Greenlee 555)</td><td>7"</td><td>4-5/16" (4.3125")</td><td>Frente del gancho</td></tr>',
        '      <tr><td>1/2"</td><td>Rígido (Greenlee 1800)</td><td>5-1/2"</td><td>2-5/8" (2.625")</td><td>Frente del gancho</td></tr>',
        '      <tr><td>3/4"</td><td>Rígido (Greenlee 1800)</td><td>8-1/2"</td><td>4-5/8" (4.625")</td><td>Frente del gancho</td></tr>',
        '      <tr><td>1"</td><td>Rígido (Greenlee 1800)</td><td>11"</td><td>5-7/8" (5.875")</td><td>Frente del gancho</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Fórmula:</strong> <em>Marca = Altura de subida deseada − Deducción (recogida)</em> (alinea la flecha o el gancho según tu doblador).</p>',
        '</section>',
      ].join('\n');
    case 'shrink':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Tabla de referencia de contracción de tubo conduit</h2>',
        '  <p>La contracción es la longitud de tramo que se consume al doblar alrededor de un obstáculo:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Ángulo</th><th>Contracción por pulgada</th><th>Decimal</th><th>Desplazamiento simple (4")</th><th>Silla de 4 puntos (4")</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>10°</td><td>1/16"</td><td>0.063"</td><td>1/4"</td><td>1/2"</td></tr>',
        '      <tr><td>15°</td><td>1/8"</td><td>0.125"</td><td>1/2"</td><td>1"</td></tr>',
        '      <tr><td>22.5°</td><td>3/16"</td><td>0.188"</td><td>3/4"</td><td>1-1/2"</td></tr>',
        '      <tr><td>30° (Estándar)</td><td>1/4"</td><td>0.250"</td><td>1"</td><td>2"</td></tr>',
        '      <tr><td>45°</td><td>3/8"</td><td>0.375"</td><td>1-1/2"</td><td>3"</td></tr>',
        '      <tr><td>60°</td><td>1/2"</td><td>0.500"</td><td>2"</td><td>4"</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Regla de obra:</strong> Suma la contracción total a la distancia medida antes de marcar o cortar el tubo conduit.</p>',
        '</section>',
      ].join('\n');
    case 'saddle3':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Tabla de multiplicadores y contracción para silla de 3 puntos</h2>',
        '  <p>Constantes de campo para cruzar tubos redondos y obstáculos angostos con tubo conduit EMT o rígido:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Doblez central</th><th>Doblez lateral</th><th>Distancia lateral</th><th>Contracción central / pulgada</th><th>Ejemplo (obstáculo de 4")</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>45° (Estándar)</td><td>22.5° / 22.5°</td><td>Altura × 2.5</td><td>3/16" (0.188")</td><td>Lados: 10" · Total: 20" · Contracción: 3/4"</td></tr>',
        '      <tr><td>60° (Cerrado)</td><td>30° / 30°</td><td>Altura × 2.0</td><td>1/4" (0.250")</td><td>Lados: 8" · Total: 16" · Contracción: 1"</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Marcas del doblador:</strong> Coloca la marca central en la <em>muesca del borde</em> (rim notch) para el doblez central, luego gira el conducto y alinea cada marca lateral con la <em>flecha</em> para los dobleces opuestos.</p>',
        '</section>',
      ].join('\n');
    case 'conduitFill':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Tabla rápida NEC 2023 Anexo C Tabla C.1 (Llenado de conducto EMT · THHN / THWN-2)</h2>',
        '  <p>Máximo de conductores THHN / THWN-2 del mismo calibre en EMT según NEC Capítulo 9 Tabla 1 (40% para 3+ cables, 31% para 2 cables, 53% para 1 cable, redondeo Nota 7):</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Diámetro EMT</th><th>14 AWG</th><th>12 AWG</th><th>10 AWG</th><th>8 AWG</th><th>6 AWG</th><th>4 AWG</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>1/2"</td><td>12</td><td>9</td><td>5</td><td>3</td><td>2</td><td>1</td></tr>',
        '      <tr><td>3/4"</td><td>22</td><td>16</td><td>10</td><td>6</td><td>4</td><td>2</td></tr>',
        '      <tr><td>1"</td><td>35</td><td>26</td><td>16</td><td>9</td><td>7</td><td>4</td></tr>',
        '      <tr><td>1-1/4"</td><td>61</td><td>45</td><td>28</td><td>16</td><td>12</td><td>7</td></tr>',
        '      <tr><td>1-1/2"</td><td>84</td><td>61</td><td>38</td><td>22</td><td>16</td><td>10</td></tr>',
        '      <tr><td>2"</td><td>138</td><td>101</td><td>63</td><td>36</td><td>26</td><td>16</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Regla NEC:</strong> Compatible con EMT, IMC, rígido (RMC) y PVC Cédula 40 desde 1/2" hasta 4" y calibres 14 AWG a 500 kcmil. Niples &le; 24" permiten hasta 60%.</p>',
        '</section>',
      ].join('\n');
    case 'saddle4':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Tabla de trazado y separación para silla de 4 puntos</h2>',
        '  <p>Dos desplazamientos iguales encontrados para librar ductos de aire, vigas y charolas anchas:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Ángulo</th><th>Marcas 1 a 2</th><th>Marcas 2 a 3 (tramo plano)</th><th>Marcas 3 a 4</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>22.5°</td><td>Altura × 2.6</td><td>Ancho del obstáculo + Contracción</td><td>Altura × 2.6</td></tr>',
        '      <tr><td>30° (Estándar)</td><td>Altura × 2.0</td><td>Ancho del obstáculo + Contracción</td><td>Altura × 2.0</td></tr>',
        '      <tr><td>45°</td><td>Altura × 1.4</td><td>Ancho del obstáculo + Contracción</td><td>Altura × 1.4</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Nota:</strong> La contracción total de una silla de 4 puntos es el doble de un desplazamiento simple (2 × Altura × Contracción por pulgada).</p>',
        '</section>',
      ].join('\n');
    case 'rollingOffset':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Referencia rápida de desplazamiento compuesto (Rolling Offset)</h2>',
        '  <p>Calcula primero el desplazamiento real por Pitágoras y aplica los multiplicadores estándar de tubo conduit:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Subida × Avance</th><th>Desplazamiento real √(S² + A²)</th><th>Distancia a 30° (×2.0)</th><th>Contracción a 30° (1/4"/pulg)</th><th>Distancia a 45° (×1.4)</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>3" × 4"</td><td>5.0"</td><td>10"</td><td>1-1/4"</td><td>7"</td></tr>',
        '      <tr><td>6" × 8"</td><td>10.0"</td><td>20"</td><td>2-1/2"</td><td>14"</td></tr>',
        '      <tr><td>8" × 8"</td><td>11.31"</td><td>22-5/8"</td><td>2-13/16"</td><td>15-7/8"</td></tr>',
        '      <tr><td>9" × 12"</td><td>15.0"</td><td>30"</td><td>3-3/4"</td><td>21"</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Fórmulas:</strong> <em>Desplazamiento real = √(Subida² + Avance²)</em>; <em>Distancia = Desplazamiento real × Multiplicador</em>; <em>Ángulo de rotación = atan(Avance ÷ Subida)</em>.</p>',
        '</section>',
      ].join('\n');
    case 'kicked90':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Tabla de multiplicadores de kick y deducción de 90° en EMT</h2>',
        '  <p>Resta la deducción del doblador para marcar el 90° y multiplica la altura del kick por el multiplicador midiendo desde la espalda del 90°:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Ángulo de kick</th><th>Multiplicador</th><th>Contracción / pulgada</th><th>Marca para kick de 4" (desde atrás del 90°)</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>10°</td><td>6.0</td><td>1/16"</td><td>24"</td></tr>',
        '      <tr><td>15°</td><td>3.9</td><td>1/8"</td><td>15-5/8"</td></tr>',
        '      <tr><td>22.5°</td><td>2.6</td><td>3/16"</td><td>10-3/8"</td></tr>',
        '      <tr><td>30° (Estándar)</td><td>2.0</td><td>1/4"</td><td>8"</td></tr>',
        '      <tr><td>45°</td><td>1.4</td><td>3/8"</td><td>5-5/8"</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Deducción estándar EMT manual:</strong> 1/2" EMT = 5" · 3/4" EMT = 6" · 1" EMT = 8". <em>Marca 90° = Altura objetivo − Deducción</em>.</p>',
        '</section>',
      ].join('\n');
    case 'wireSize':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Tabla de ampacidad NEC 2023 Tabla 310.16 (Cobre y Aluminio)</h2>',
        '  <p>Ampacidad permisible para hasta 3 conductores portadores de corriente en conducto a 30°C ambiente (regla 125% para cargas continuas ≥ 3 h):</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Calibre</th><th>Cobre 60°C</th><th>Cobre 75°C</th><th>Cobre 90°C</th><th>Aluminio 75°C</th><th>Máx. protección NEC 240.4(D)</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>14 AWG</td><td>15 A</td><td>20 A</td><td>25 A</td><td>—</td><td>15 A Cu</td></tr>',
        '      <tr><td>12 AWG</td><td>20 A</td><td>25 A</td><td>30 A</td><td>20 A</td><td>20 A Cu / 15 A Al</td></tr>',
        '      <tr><td>10 AWG</td><td>30 A</td><td>35 A</td><td>40 A</td><td>30 A</td><td>30 A Cu / 25 A Al</td></tr>',
        '      <tr><td>8 AWG</td><td>40 A</td><td>50 A</td><td>55 A</td><td>40 A</td><td>Según 310.16</td></tr>',
        '      <tr><td>6 AWG</td><td>55 A</td><td>65 A</td><td>75 A</td><td>50 A</td><td>Según 310.16</td></tr>',
        '      <tr><td>4 AWG</td><td>70 A</td><td>85 A</td><td>95 A</td><td>65 A</td><td>Según 310.16</td></tr>',
        '      <tr><td>2 AWG</td><td>95 A</td><td>115 A</td><td>130 A</td><td>90 A</td><td>Según 310.16</td></tr>',
        '      <tr><td>1/0 AWG</td><td>125 A</td><td>150 A</td><td>170 A</td><td>120 A</td><td>Según 310.16</td></tr>',
        '      <tr><td>3/0 AWG</td><td>165 A</td><td>200 A</td><td>225 A</td><td>155 A</td><td>Según 310.16</td></tr>',
        '      <tr><td>4/0 AWG</td><td>195 A</td><td>230 A</td><td>260 A</td><td>180 A</td><td>Según 310.16</td></tr>',
        '      <tr><td>500 kcmil</td><td>320 A</td><td>380 A</td><td>430 A</td><td>310 A</td><td>Según 310.16</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>NEC 110.14(C)(1):</strong> Circuitos ≤100 A usan terminales de 60°C salvo que estén listados para 75°C; circuitos &gt;100 A usan 75°C.</p>',
        '</section>',
      ].join('\n');
    case 'voltageDrop':
      return [
        '<section class="cheat-sheet" style="margin:2rem 0;">',
        '  <h2>Resistencia NEC Capítulo 9 Tabla 8 y fórmulas de caída de tensión</h2>',
        '  <p>Resistencia DC a 75°C (Ω por 1,000 pies) para comprobar los límites NEC 210.19(A) del 3% en ramal y 5% total:</p>',
        '  <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin:1rem 0;">',
        '    <thead>',
        '      <tr style="background:#f2f2f2;"><th>Calibre</th><th>Cobre R (Ω / 1,000 ft)</th><th>Aluminio R (Ω / 1,000 ft)</th><th>Tramo máx. 1φ 120V @ 15A (≤3%)</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><td>14 AWG</td><td>3.140</td><td>—</td><td>38 ft (Cu)</td></tr>',
        '      <tr><td>12 AWG</td><td>1.980</td><td>3.250</td><td>60 ft (Cu)</td></tr>',
        '      <tr><td>10 AWG</td><td>1.240</td><td>2.040</td><td>96 ft (Cu)</td></tr>',
        '      <tr><td>8 AWG</td><td>0.778</td><td>1.280</td><td>154 ft (Cu)</td></tr>',
        '      <tr><td>6 AWG</td><td>0.491</td><td>0.808</td><td>244 ft (Cu)</td></tr>',
        '      <tr><td>4 AWG</td><td>0.308</td><td>0.508</td><td>389 ft (Cu)</td></tr>',
        '      <tr><td>2 AWG</td><td>0.194</td><td>0.319</td><td>618 ft (Cu)</td></tr>',
        '      <tr><td>1/0 AWG</td><td>0.122</td><td>0.201</td><td>983 ft (Cu)</td></tr>',
        '    </tbody>',
        '  </table>',
        '  <p><strong>Fórmulas:</strong> <em>Monofásico VD = (2 × L × I × R) ÷ 1,000</em> · <em>Trifásico VD = (1.732 × L × I × R) ÷ 1,000</em>, donde L es la distancia de ida en pies e I la corriente en amperios.</p>',
        '</section>',
      ].join('\n');
  }
}

/**
 * 生成页面完整的 FAQ 静态 HTML。
 */
function buildFaqsHtml(
  faqs: (typeof SEO_TOOL_PAGES)[number]['faqs'],
  lang: Lang,
): string {
  if (!faqs || faqs.length === 0) return '';
  const heading =
    lang === 'es' ? 'Preguntas frecuentes' : 'Frequently Asked Questions';
  const items = faqs
    .map(
      (f) =>
        `  <div class="faq-item" style="margin-bottom:1.2rem;">\n    <h3 style="margin-bottom:0.3rem;">${escapeHtml(f.question)}</h3>\n    <p style="margin-top:0;color:#333;">${escapeHtml(f.answer)}</p>\n  </div>`,
    )
    .join('\n');
  return [
    '<section class="faqs" style="margin:2rem 0;">',
    `  <h2>${escapeHtml(heading)}</h2>`,
    items,
    '</section>',
  ].join('\n');
}

/**
 * 相关计算器静态内链（爬虫在 hydration 前就能读到）。
 * 文案与 RN 屏幕同源：`buildRelatedLinks` / `getRelatedCalculatorsTitle`。
 * 用根相对 href（EN: `/offset/`，ES: `/es/offset/`），不依赖部署域名。
 */
function buildRelatedSectionHtml(
  page: (typeof SEO_TOOL_PAGES)[number],
  lang: Lang,
): string {
  const heading = getRelatedCalculatorsTitle(lang);
  const items = buildRelatedLinks(page, lang)
    .map((link) => {
      const href = link.path.endsWith('/') ? link.path : `${link.path}/`;
      const description = link.description
        ? ` <span>${escapeHtml(link.description)}</span>`
        : '';
      return `<li><a href="${href}">${escapeHtml(link.title)}</a>${description}</li>`;
    })
    .join('\n      ');
  return [
    `<nav aria-label="${escapeHtml(heading)}" style="margin-top:2rem;border-top:1px solid #ddd;padding-top:1rem;">`,
    `  <h2>${escapeHtml(heading)}</h2>`,
    '  <ul>',
    `      ${items}`,
    '  </ul>',
    '</nav>',
  ].join('\n');
}

/**
 * 组装整个预渲染 HTML 文档，塞进 `#root`：未执行 JS 时可见（爬虫直接索引），
 * React 首次 render 会平滑接管并替换。
 */
function buildStaticPageContentHtml(
  page: (typeof SEO_TOOL_PAGES)[number],
  lang: Lang,
): string {
  const copy = getSeoToolPageCopy(page, lang);
  const isEs = lang === 'es';
  const playUrl = buildGooglePlayUrl({
    source: 'web_seo',
    medium: 'tool_shell',
    campaign: isEs ? `${page.slug}_es` : page.slug,
    content: 'static_fallback',
  });
  const homeHref = isEs ? '/es/' : '/';
  const homeLabel = isEs ? 'Todas las calculadoras' : 'All Calculators';
  const ctaTitle = isEs
    ? 'Usa Conduit Bend Calc 100% sin conexión en obra'
    : 'Use Conduit Bend Calc 100% offline on the jobsite';
  const ctaButton = isEs
    ? 'Descargar App Android gratis en Google Play'
    : 'Get Free Android App on Google Play';
  const cheatSheet = isEs
    ? buildCheatSheetHtmlEs(page.key)
    : buildCheatSheetHtml(page.key);
  return [
    '<div class="static-seo-shell" style="min-height:100vh;background:#F5F8FB;color:#0F2B46;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;line-height:1.55;">',
    '  <header style="background:#0F2B46;color:#FFFFFF;padding:14px 24px;border-bottom:3px solid #F4C317;">',
    '    <div style="max-width:1120px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;">',
    '      <strong style="font-size:18px;">Conduit Bend Calc</strong>',
    `      <a href="${homeHref}" style="color:#F4C317;font-size:13px;font-weight:600;text-decoration:none;">${escapeHtml(homeLabel)}</a>`,
    '    </div>',
    '  </header>',
    '  <article class="static-seo-document" style="max-width:800px;margin:24px auto;padding:24px;background:#FFFFFF;border:1px solid #D9E2EB;border-radius:8px;color:#0F2B46;">',
    `    <h1 style="margin-top:0;">${escapeHtml(copy.h1)}</h1>`,
    `    <p class="tagline" style="font-size:1.05rem;color:#475569;">${escapeHtml(copy.tagline)}</p>`,
    cheatSheet,
    '    <section class="app-cta" style="margin:1.5rem 0;padding:16px;background:#F5F8FB;border:1px solid #D9E2EB;border-radius:8px;">',
    `      <p style="margin:0 0 8px;font-weight:700;">${escapeHtml(ctaTitle)}</p>`,
    `      <p style="margin:0;"><a href="${escapeHtml(playUrl)}" rel="noopener noreferrer" style="display:inline-block;background:#F4C317;color:#0F2B46;font-weight:700;padding:10px 16px;border-radius:8px;text-decoration:none;">${escapeHtml(ctaButton)}</a></p>`,
    '    </section>',
    buildFaqsHtml(copy.faqs, lang),
    buildRelatedSectionHtml(page, lang),
    '  </article>',
    '</div>',
  ].join('\n');
}

/**
 * 把完整静态内容塞进 `#root`。
 */
function injectStaticContent(shell: string, contentHtml: string): string {
  const cleaned = shell.replace(
    /<div id="root">\s*<!-- static-seo-home-start -->[\s\S]*?<!-- static-seo-home-end -->\s*<\/div>/,
    '<div id="root"></div>',
  );
  const marker = '<div id="root"></div>';
  if (!cleaned.includes(marker)) {
    throw new Error(
      'index.html has no empty #root; cannot inject static SEO content',
    );
  }
  return cleaned.replace(marker, `<div id="root">\n${contentHtml}\n</div>`);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      'usage: node scripts/gen-seo-tool-shells.ts <exportDir> <baseUrl>',
    );
    process.exit(1);
  }
  const exportDir = args[0].replace(/\/+$/, '');
  const baseUrl = args[1].replace(/\/+$/, '');

  const indexHtml = readFileSync(join(exportDir, 'index.html'), 'utf8');

  let written = 0;
  for (const page of SEO_TOOL_PAGES) {
    if (page.title.length > 60) {
      throw new Error(`title too long for ${page.slug}: ${page.title.length}`);
    }
    if (page.description.length > 160) {
      throw new Error(`description too long for ${page.slug}: ${page.description.length}`);
    }
    if (page.es.title.length > 60) {
      throw new Error(`es title too long for ${page.slug}: ${page.es.title.length}`);
    }
    if (page.es.description.length > 160) {
      throw new Error(
        `es description too long for ${page.slug}: ${page.es.description.length}`,
      );
    }

    for (const lang of LANGS) {
      const copy = getSeoToolPageCopy(page, lang);
      const staticContent = buildStaticPageContentHtml(page, lang);
      const shell = injectStaticContent(indexHtml, staticContent);
      const html = injectHead(shell, buildHead(page, baseUrl, lang), lang);
      const outDir =
        lang === 'es'
          ? join(exportDir, 'es', page.slug)
          : join(exportDir, page.slug);
      mkdirSync(outDir, { recursive: true });
      const outPath = join(outDir, 'index.html');
      writeFileSync(outPath, html);
      written += 1;
      console.log(
        `wrote ${outPath} [${lang}] (title ${copy.title.length}, desc ${copy.description.length})`,
      );
    }
  }

  console.log(
    `SEO tool shells: ${written} pages (${SEO_TOOL_PAGES.length} EN + ${SEO_TOOL_PAGES.length} ES), base=${baseUrl || SEO_SITE_URL}`,
  );
}

main();
