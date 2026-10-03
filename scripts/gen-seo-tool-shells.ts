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
  buildWebApplicationJsonLd,
  SEO_SITE_URL,
  SEO_TOOL_PAGES,
} from '../src/seo/toolPages.ts';

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
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="index,follow" />`,
    `<link rel="canonical" href="${canonical}" />`,
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
    const html = injectHead(indexHtml, buildHead(page, baseUrl));
    const outDir = join(exportDir, page.slug);
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, 'index.html');
    writeFileSync(outPath, html);
    console.log(`wrote ${outPath} (title ${page.title.length}, desc ${page.description.length})`);
  }

  console.log(`SEO tool shells: 4 pages, base=${baseUrl || SEO_SITE_URL}`);
}

main();
