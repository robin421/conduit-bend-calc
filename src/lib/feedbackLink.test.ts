import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildFeedbackUrl, feedbackLanguage, FEEDBACK_PRODUCT } from './feedbackLink.ts';

test('反馈产品路由稳定，不受安装包名变化影响；只传环境白名单', () => {
  const url = new URL(buildFeedbackUrl({ version: '1.10.1-t81-0184d16', platform: 'android', osVersion: 35, language: 'zh-CN' }));
  assert.equal(url.origin, 'https://feedback-hub.robin421.workers.dev');
  assert.equal(url.searchParams.get('pkg'), 'conduit');
  assert.equal(url.searchParams.get('ver'), '1.10.1-t81-0184d16');
  assert.equal(url.searchParams.get('os'), 'Android API 35');
  assert.equal(url.searchParams.get('lang'), 'zh');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['lang', 'os', 'pkg', 'title', 'ver']);
});

test('语言规范化与 Hub 支持的语言一致', () => {
  for (const locale of ['zh-TW', 'zh_HK', 'zh-Hant-TW', 'zh-MO']) assert.equal(feedbackLanguage(locale), 'zh-tw');
  assert.equal(feedbackLanguage('zh-Hans-CN'), 'zh');
  for (const lang of ['en', 'ja', 'ko', 'es', 'de', 'fr']) assert.equal(feedbackLanguage(`${lang.toUpperCase()}-XX`), lang);
  assert.equal(feedbackLanguage('pt-BR'), 'en');
});

test('iOS、Web 与异常环境值安全降级，不进入服务端 HTML 插值', () => {
  const ios = new URL(buildFeedbackUrl({ version: '1.10.1', platform: 'ios', osVersion: '18.6', language: 'en-US' }));
  assert.equal(ios.searchParams.get('os'), 'iOS 18.6');
  const web = new URL(buildFeedbackUrl({ version: '<script>', platform: 'web', osVersion: '<script>', language: 'unknown' }));
  assert.equal(web.searchParams.get('ver'), 'unknown');
  assert.equal(web.searchParams.get('os'), 'Web');
  assert.equal(web.searchParams.get('lang'), 'en');
  assert.ok(!web.href.includes('script'));
});

test('固定子模块契约：conduit 发往本项目，生成的 URL 能渲染反馈表单', async () => {
  const hub = await import(new URL('../../feedback-hub/src/index.js', import.meta.url).href);
  assert.equal(hub.resolveTargetRepo(FEEDBACK_PRODUCT, {}), 'robin421/conduit-bend-calc');
  const url = buildFeedbackUrl({ version: '1.10.1', platform: 'android', osVersion: 35, language: 'zh-TW' });
  const response = await hub.default.fetch(new Request(url), {}, {});
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('name="website_url"'));
  assert.ok(html.includes('WattFlow · Conduit Bend Calc'));
  assert.ok(html.includes('lang="zh-TW"'));
});
