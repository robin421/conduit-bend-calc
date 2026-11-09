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

import {
  buildCanonicalUrl,
  buildFaqPageJsonLd,
  buildRelatedLinks,
  buildWebApplicationJsonLd,
  getRelatedCalculatorsTitle,
  SEO_SITE_URL,
  SEO_TOOL_PAGES,
} from '../src/seo/toolPages.ts';
import { buildAlternatesForPath } from '../src/lib/seoHead.ts';

const HEAD_TAG_PATTERNS = [
  /<title>.*?<\/title>/gis,
  /<meta\s+name="description"[^>]*>/gi,
  /<meta\s+name="robots"[^>]*>/gi,
  /<link\s+rel="canonical"[^>]*>/gi,
  /<meta\s+property="og:[^"]*"[^>]*>/gi,
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

function buildHead(page: (typeof SEO_TOOL_PAGES)[number], baseUrl: string): string {
  const canonical = buildCanonicalUrl(page, baseUrl);
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
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
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="WattFlow" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    jsonLdScript(buildWebApplicationJsonLd(page, baseUrl)),
    jsonLdScript(buildFaqPageJsonLd(page)),
  ].join('\n');
}

function injectHead(shell: string, headBlock: string): string {
  let output = shell;
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
  }
}

/**
 * 生成页面完整的 FAQ 静态 HTML。
 */
function buildFaqsHtml(faqs: (typeof SEO_TOOL_PAGES)[number]['faqs']): string {
  if (!faqs || faqs.length === 0) return '';
  const items = faqs
    .map(
      (f) =>
        `  <div class="faq-item" style="margin-bottom:1.2rem;">\n    <h3 style="margin-bottom:0.3rem;">${escapeHtml(f.question)}</h3>\n    <p style="margin-top:0;color:#333;">${escapeHtml(f.answer)}</p>\n  </div>`,
    )
    .join('\n');
  return [
    '<section class="faqs" style="margin:2rem 0;">',
    '  <h2>Frequently Asked Questions</h2>',
    items,
    '</section>',
  ].join('\n');
}

/**
 * 相关计算器静态内链（爬虫在 hydration 前就能读到）。
 * 文案与 RN 屏幕同源：`buildRelatedLinks` / `getRelatedCalculatorsTitle`。
 * 用根相对 href（`/offset/`），不依赖部署域名。
 */
function buildRelatedSectionHtml(page: (typeof SEO_TOOL_PAGES)[number]): string {
  const heading = getRelatedCalculatorsTitle();
  const items = buildRelatedLinks(page)
    .map((link) => {
      const href = link.path === '/' ? '/' : `${link.path}/`;
      const description = link.description
        ? ` <span>${escapeHtml(link.description)}</span>`
        : '';
      return `<li><a href="${href}">${escapeHtml(link.title)}</a>${description}</li>`;
    })
    .join('\n      ');
  return [
    '<nav aria-label="Related calculators" style="margin-top:2rem;border-top:1px solid #ddd;padding-top:1rem;">',
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
function buildStaticPageContentHtml(page: (typeof SEO_TOOL_PAGES)[number]): string {
  return [
    '<article class="static-seo-document" style="max-width:800px;margin:2rem auto;padding:0 1rem;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;line-height:1.6;color:#1a1a1a;">',
    `  <h1>${escapeHtml(page.h1)}</h1>`,
    `  <p class="tagline" style="font-size:1.1rem;color:#444;">${escapeHtml(page.tagline)}</p>`,
    buildCheatSheetHtml(page.key),
    buildFaqsHtml(page.faqs),
    buildRelatedSectionHtml(page),
    '</article>',
  ].join('\n');
}

/**
 * 把完整静态内容塞进 `#root`。
 */
function injectStaticContent(shell: string, contentHtml: string): string {
  const marker = '<div id="root"></div>';
  if (!shell.includes(marker)) {
    throw new Error(
      'index.html has no empty #root; cannot inject static SEO content',
    );
  }
  return shell.replace(marker, `<div id="root">\n${contentHtml}\n</div>`);
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
    const staticContent = buildStaticPageContentHtml(page);
    const shell = injectStaticContent(indexHtml, staticContent);
    const html = injectHead(shell, buildHead(page, baseUrl));
    const outDir = join(exportDir, page.slug);
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, 'index.html');
    writeFileSync(outPath, html);
    console.log(`wrote ${outPath} (title ${page.title.length}, desc ${page.description.length})`);
  }

  console.log(`SEO tool shells: 4 pages, base=${baseUrl || SEO_SITE_URL}`);
}

main();
