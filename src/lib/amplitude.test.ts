import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AMPLITUDE_ACTIVATED_KEY,
  AMPLITUDE_API_ENDPOINT,
  AMPLITUDE_DEVICE_ID_KEY,
  AMPLITUDE_SESSION_TIMEOUT_MS,
  AMPLITUDE_UTM_STORAGE_KEY,
  buildAmplitudeHttpBody,
  createAmplitudeClient,
  DEFAULT_AMPLITUDE_API_KEY,
  isExcludedAnalyticsEnvironment,
  parseIncomingUtmParams,
  parseSessionState,
  resolveAmplitudeApiKey,
  sanitizeEventProperties,
  sanitizeEventType,
  sanitizeIncomingUtmParams,
  sanitizeUserProperties,
  WEB_AMPLITUDE_API_KEY,
} from './amplitudeCore.ts';
import type { HistoryStorage } from './historyStore.ts';

function createMemoryStorage(initial: Record<string, string> = {}): HistoryStorage & { data: Record<string, string> } {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    async getItem(key: string): Promise<string | null> {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    async setItem(key: string, value: string): Promise<void> {
      data[key] = value;
    },
    async removeItem(key: string): Promise<void> {
      delete data[key];
    },
  };
}

test('sanitizeEventProperties：严格白名单过滤 PII 与用户输入值，并截断超长字符串', () => {
  const longTool = 'x'.repeat(150);
  const cleaned = sanitizeEventProperties({
    tool_name: longTool,
    unit_system: 'imperial',
    platform: 'android',
    email: 'user@example.com',
    phone: '1234567890',
    receipt: 'purchase-token-secret',
    user_input_rise: 12.5,
    history_items: '["offset"]',
    bad_number: Number.NaN,
    empty_str: '   ',
  });

  assert.ok(cleaned);
  assert.equal((cleaned.tool_name as string).length, 100);
  assert.equal(cleaned.unit_system, 'imperial');
  assert.equal(cleaned.platform, 'android');
  assert.equal('email' in cleaned, false);
  assert.equal('phone' in cleaned, false);
  assert.equal('receipt' in cleaned, false);
  assert.equal('user_input_rise' in cleaned, false);
  assert.equal('history_items' in cleaned, false);
  assert.equal('bad_number' in cleaned, false);
  assert.equal('empty_str' in cleaned, false);
});

test('buildAmplitudeHttpBody：构造符合 Amplitude HTTP API v2 规范的 payload', () => {
  const body = buildAmplitudeHttpBody({
    apiKey: DEFAULT_AMPLITUDE_API_KEY,
    deviceId: 'anon-device-1234',
    sessionId: 1700000000000,
    eventType: 'calculation_completed',
    time: 1700000001234,
    platform: 'android',
    appVersion: '1.10.1',
    language: 'en-US',
    eventProperties: {
      bend_type: 'offset',
      tool_name: 'offset',
      unit_system: 'imperial',
      secret_token: 'should-drop',
    },
  });

  assert.equal(body.api_key, DEFAULT_AMPLITUDE_API_KEY);
  assert.equal(body.events.length, 1);
  assert.deepEqual(body.events[0], {
    device_id: 'anon-device-1234',
    session_id: 1700000000000,
    event_type: 'calculation_completed',
    time: 1700000001234,
    platform: 'android',
    app_version: '1.10.1',
    language: 'en-US',
    event_properties: {
      bend_type: 'offset',
      tool_name: 'offset',
      unit_system: 'imperial',
    },
  });
});

test('sanitizeEventType：清洗非法字符并限制长度', () => {
  assert.equal(sanitizeEventType('  pro paywall/viewed! '), 'pro_paywall_viewed_');
  assert.equal(sanitizeEventType(''), 'unknown_event');
  assert.equal(sanitizeEventType('a'.repeat(100)).length, 64);
});

test('parseSessionState：30 分钟内沿用 sessionId，超时自动刷新', () => {
  const t0 = 1_700_000_000_000;
  const raw = JSON.stringify({ sessionId: t0, lastActiveAt: t0 });

  const within = parseSessionState(raw, t0 + AMPLITUDE_SESSION_TIMEOUT_MS - 1000);
  assert.equal(within.sessionId, t0);
  assert.equal(within.lastActiveAt, t0 + AMPLITUDE_SESSION_TIMEOUT_MS - 1000);

  const expired = parseSessionState(raw, t0 + AMPLITUDE_SESSION_TIMEOUT_MS + 1);
  assert.equal(expired.sessionId, t0 + AMPLITUDE_SESSION_TIMEOUT_MS + 1);
  assert.equal(expired.lastActiveAt, t0 + AMPLITUDE_SESSION_TIMEOUT_MS + 1);
});

test('createAmplitudeClient：持久化匿名 device_id、刷新 session 并正确上报 HTTP 请求', async () => {
  let clock = 1_700_000_000_000;
  const storage = createMemoryStorage();
  const requests: Array<{ url: string; body: any }> = [];

  const client = createAmplitudeClient({
    storage,
    now: () => clock,
    platform: 'web',
    appVersion: '1.10.1',
    language: 'en-US',
    uuid: () => 'anon-uuid-0001',
    fetchFn: (async (url: string, init?: RequestInit) => {
      requests.push({ url, body: JSON.parse(String(init?.body ?? '{}')) });
      return new Response(JSON.stringify({ code: 200 }), { status: 200 });
    }) as typeof fetch,
  });

  await client.init();
  assert.equal(storage.data[AMPLITUDE_DEVICE_ID_KEY], 'anon-uuid-0001');

  const ok1 = await client.logScreenView('CalcHome');
  assert.equal(ok1, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, AMPLITUDE_API_ENDPOINT);
  assert.equal(requests[0].body.events[0].event_type, 'screen_view');
  assert.deepEqual(requests[0].body.events[0].event_properties, { screen_name: 'CalcHome' });
  const firstSessionId = requests[0].body.events[0].session_id;

  // 推进 31 分钟，触发 session_id 刷新
  clock += AMPLITUDE_SESSION_TIMEOUT_MS + 60_000;
  await client.logEvent('feedback_opened', { source: 'feedback_card' });
  assert.equal(requests.length, 2);
  assert.equal(requests[1].body.events[0].session_id, clock);
  assert.notEqual(requests[1].body.events[0].session_id, firstSessionId);
});

test('markActivationIfNeeded：首次成功计算仅触发一次 activation_completed', async () => {
  const storage = createMemoryStorage();
  const sentEvents: string[] = [];

  const client = createAmplitudeClient({
    storage,
    uuid: () => 'anon-uuid-0002',
    fetchFn: (async (_url: string, init?: RequestInit) => {
      const parsed = JSON.parse(String(init?.body ?? '{}'));
      sentEvents.push(parsed.events[0].event_type);
      return new Response('{}', { status: 200 });
    }) as typeof fetch,
  });

  const first = await client.markActivationIfNeeded({ tool_name: 'offset', unit_system: 'imperial', platform: 'android' });
  const second = await client.markActivationIfNeeded({ tool_name: 'stub', unit_system: 'imperial', platform: 'android' });

  assert.equal(first, true);
  assert.equal(second, false);
  assert.deepEqual(sentEvents, ['activation_completed']);
  assert.equal(storage.data[AMPLITUDE_ACTIVATED_KEY], '1');
});

test('createAmplitudeClient：网络失败或存储异常时静默容错，不抛未捕获异常', async () => {
  const brokenStorage: HistoryStorage = {
    async getItem() {
      throw new Error('storage read failed');
    },
    async setItem() {
      throw new Error('storage write failed');
    },
    async removeItem() {
      throw new Error('storage remove failed');
    },
  };

  const client = createAmplitudeClient({
    storage: brokenStorage,
    uuid: () => 'anon-uuid-fallback',
    fetchFn: (async () => {
      throw new Error('offline');
    }) as typeof fetch,
  });

  await client.init();
  const ok = await client.logEvent('calculation_completed', { tool_name: 'offset' });
  assert.equal(ok, false);
});

test('resolveAmplitudeApiKey：Web 端与 Native 端项目隔离，支持 envKey 覆盖', () => {
  assert.equal(resolveAmplitudeApiKey('web'), WEB_AMPLITUDE_API_KEY);
  assert.equal(resolveAmplitudeApiKey('android'), DEFAULT_AMPLITUDE_API_KEY);
  assert.equal(resolveAmplitudeApiKey('ios'), DEFAULT_AMPLITUDE_API_KEY);
  assert.equal(resolveAmplitudeApiKey('web', '   '), WEB_AMPLITUDE_API_KEY);
  assert.equal(resolveAmplitudeApiKey('android', ''), DEFAULT_AMPLITUDE_API_KEY);
  assert.equal(resolveAmplitudeApiKey('web', 'custom-override-key'), 'custom-override-key');
  assert.equal(resolveAmplitudeApiKey('android', ' custom-native-key '), 'custom-native-key');
});

test('sanitizeEventProperties：保留 Web 漏斗新增白名单属性并过滤非白名单尺寸', () => {
  const cleaned = sanitizeEventProperties({
    calculator: 'offset',
    mode: 'stub',
    unit: 'imperial',
    lang: 'es',
    target: '4-point-saddle',
    source: 'calculator_drawer',
    page_slug: 'emt-conduit-bending-chart',
    rise_inches: 6,
    stub_height: 12,
  });

  assert.deepEqual(cleaned, {
    calculator: 'offset',
    mode: 'stub',
    unit: 'imperial',
    lang: 'es',
    target: '4-point-saddle',
    source: 'calculator_drawer',
    page_slug: 'emt-conduit-bending-chart',
  });
});

test('sanitizeEventProperties：保留 Phase 1 付费墙与单位模式新增白名单字段', () => {
  const cleaned = sanitizeEventProperties({
    sku_status: 'available',
    price_loaded: true,
    unit_mode: 'fractional',
    dismiss_method: 'back',
    product_id: 'conduit_bend_calc_pro_lifetime',
    purchase_token: 'secret-token',
    measured_stub: 17.375,
  });

  assert.deepEqual(cleaned, {
    sku_status: 'available',
    price_loaded: true,
    unit_mode: 'fractional',
    dismiss_method: 'back',
    product_id: 'conduit_bend_calc_pro_lifetime',
  });
});

test('sanitizeEventProperties：放行 Value-First 漏斗离散/布尔维度并严格过滤实测数值与档案名', () => {
  const cleaned = sanitizeEventProperties({
    source: 'offset_calibration',
    mode: 'quick',
    scene: 'calibration',
    action: 'delta_chip',
    delta_bucket: 'large',
    has_personal_data: true,
    has_hidden_history: true,
    base_take_up: 5,
    measured_take_up: 5.375,
    delta_inches: 0.375,
    conduit_size: '1/2" EMT',
    profile_name: 'My Shop Klein',
  });

  assert.deepEqual(cleaned, {
    source: 'offset_calibration',
    mode: 'quick',
    scene: 'calibration',
    action: 'delta_chip',
    delta_bucket: 'large',
    has_personal_data: true,
    has_hidden_history: true,
  });
});

test('sanitizeUserProperties：仅允许 is_pro / unit_system / app_lang，过滤 PII 与尺寸', () => {
  const cleaned = sanitizeUserProperties({
    is_pro: true,
    unit_system: 'decimal',
    app_lang: 'en',
    email: 'user@example.com',
    receipt: 'tok_123',
    stub_height: 12,
    extra: 'drop',
  });

  assert.deepEqual(cleaned, {
    is_pro: true,
    unit_system: 'decimal',
    app_lang: 'en',
  });
  assert.equal(sanitizeUserProperties({ email: 'user@example.com' }), undefined);
});

test('buildAmplitudeHttpBody 与 createAmplitudeClient：缓存并附带白名单 user_properties', async () => {
  const body = buildAmplitudeHttpBody({
    apiKey: DEFAULT_AMPLITUDE_API_KEY,
    deviceId: 'anon-device-user-props',
    sessionId: 1700000000000,
    eventType: 'pro_paywall_viewed',
    time: 1700000001000,
    platform: 'android',
    appVersion: '1.10.1',
    language: 'en-US',
    eventProperties: { trigger_source: 'calibration', sku_status: 'available', price_loaded: true },
    userProperties: { is_pro: false, unit_system: 'fractional', app_lang: 'en', receipt: 'drop-me' },
  });

  assert.deepEqual(body.events[0].user_properties, {
    is_pro: false,
    unit_system: 'fractional',
    app_lang: 'en',
  });

  const storage = createMemoryStorage();
  const payloads: Array<any> = [];
  const client = createAmplitudeClient({
    storage,
    uuid: () => 'anon-uuid-user-props',
    fetchFn: (async (_url: string, init?: RequestInit) => {
      payloads.push(JSON.parse(String(init?.body ?? '{}')));
      return new Response('{}', { status: 200 });
    }) as typeof fetch,
  });

  // 未设置 user_properties 时不附带该字段
  await client.logEvent('pro_paywall_viewed', { trigger_source: 'direct' });
  assert.equal('user_properties' in payloads[0].events[0], false);

  // 分次设置并合并缓存，非法字段被清洗
  client.setUserProperties({ is_pro: false, unit_system: 'fractional', email: 'drop@example.com' });
  client.setUserProperties({ app_lang: 'es' });
  await client.logEvent('calculation_completed', { tool_name: 'offset', unit_mode: 'fractional' });
  assert.deepEqual(payloads[1].events[0].user_properties, {
    is_pro: false,
    unit_system: 'fractional',
    app_lang: 'es',
  });

  // 后续更新覆盖对应键
  client.setUserProperties({ is_pro: true });
  await client.logEvent('pro_entitlement_granted', { outcome: 'purchased', product_id: 'conduit_bend_calc_pro_lifetime' });
  assert.deepEqual(payloads[2].events[0].user_properties, {
    is_pro: true,
    unit_system: 'fractional',
    app_lang: 'es',
  });
});

test('isExcludedAnalyticsEnvironment：屏蔽 dev / localhost / pages.dev / webdriver / bots，forceSend 可覆盖', () => {
  assert.equal(isExcludedAnalyticsEnvironment(), false);
  assert.equal(isExcludedAnalyticsEnvironment({ hostname: 'bendcalc.wattflow.net', userAgent: 'Mozilla/5.0' }), false);

  // 开发模式
  assert.equal(isExcludedAnalyticsEnvironment({ isDev: true }), true);

  // 本地与预览域名
  assert.equal(isExcludedAnalyticsEnvironment({ hostname: 'localhost' }), true);
  assert.equal(isExcludedAnalyticsEnvironment({ hostname: '127.0.0.1' }), true);
  assert.equal(isExcludedAnalyticsEnvironment({ hostname: '0.0.0.0' }), true);
  assert.equal(isExcludedAnalyticsEnvironment({ hostname: 'macbook.local' }), true);
  assert.equal(isExcludedAnalyticsEnvironment({ hostname: 'abc123.conduit-bend-calc.pages.dev' }), true);
  assert.equal(isExcludedAnalyticsEnvironment({ hostname: 'LOCALHOST' }), true);

  // 自动化与爬虫
  assert.equal(isExcludedAnalyticsEnvironment({ webdriver: true }), true);
  assert.equal(isExcludedAnalyticsEnvironment({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }), true);
  assert.equal(isExcludedAnalyticsEnvironment({ userAgent: 'Mozilla/5.0 (compatible; Bingbot/2.0)' }), true);
  assert.equal(isExcludedAnalyticsEnvironment({ userAgent: 'HeadlessChrome/120.0' }), true);
  assert.equal(isExcludedAnalyticsEnvironment({ userAgent: 'Playwright/1.45' }), true);
  assert.equal(isExcludedAnalyticsEnvironment({ userAgent: 'Puppeteer/22.0' }), true);

  // forceSend 强制放行
  assert.equal(
    isExcludedAnalyticsEnvironment({
      isDev: true,
      hostname: 'localhost',
      webdriver: true,
      userAgent: 'HeadlessChrome/120.0',
      forceSend: true,
    }),
    false,
  );
});

test('createAmplitudeClient：命中 isExcluded 时阻止所有真实上报且不写入激活标记', async () => {
  const storage = createMemoryStorage();
  let fetchCalls = 0;
  const client = createAmplitudeClient({
    storage,
    isExcluded: () => true,
    fetchFn: (async () => {
      fetchCalls += 1;
      return new Response('{}', { status: 200 });
    }) as typeof fetch,
  });

  assert.equal(await client.logEvent('calculation_completed', { calculator: 'offset' }), false);
  assert.equal(await client.logScreenView('SeoOffset'), false);
  assert.equal(await client.markActivationIfNeeded({ calculator: 'offset' }), false);
  assert.equal(fetchCalls, 0);
  assert.equal(storage.data[AMPLITUDE_ACTIVATED_KEY], undefined);
});

test('sanitizeEventProperties：放行 UTM 与 cta_placement 归因白名单字段', () => {
  const cleaned = sanitizeEventProperties({
    utm_source: 'web_seo',
    utm_medium: 'tool_cta',
    utm_campaign: '3-point-saddle',
    cta_placement: 'below_result',
    email: 'drop@example.com',
  });

  assert.deepEqual(cleaned, {
    utm_source: 'web_seo',
    utm_medium: 'tool_cta',
    utm_campaign: '3-point-saddle',
    cta_placement: 'below_result',
  });
});

test('parseIncomingUtmParams：解析标准 UTM、转小写、剔除非白名单字符并截断 40 字符', () => {
  assert.equal(AMPLITUDE_UTM_STORAGE_KEY, '@conduit_amplitude_utm');

  assert.deepEqual(
    parseIncomingUtmParams(
      '?utm_source=youtube_shorts&utm_medium=short_video&utm_campaign=t32_offset_6in_30deg',
    ),
    {
      utm_source: 'youtube_shorts',
      utm_medium: 'short_video',
      utm_campaign: 't32_offset_6in_30deg',
    },
  );

  // 无前导问号、大小写混合、特殊字符清洗、40 字符截断、忽略非白名单与 PII 参数
  const longCampaign = 'T32_Campaign-' + 'A'.repeat(60);
  const parsed = parseIncomingUtmParams(
    `utm_source=YouTube%20Shorts!&utm_medium=Short/Video$2026&utm_campaign=${longCampaign}&utm_term=ignore&utm_content=ignore&email=user@example.com&gclid=12345#section`,
  );
  assert.deepEqual(parsed, {
    utm_source: 'youtubeshorts',
    utm_medium: 'shortvideo2026',
    utm_campaign: ('t32_campaign-' + 'a'.repeat(60)).slice(0, 40),
  });
  assert.equal(parsed.utm_campaign?.length, 40);
});

test('parseIncomingUtmParams：忽略空值、纯非法字符与畸形查询串且不抛异常', () => {
  assert.deepEqual(parseIncomingUtmParams(''), {});
  assert.deepEqual(parseIncomingUtmParams('?'), {});
  assert.deepEqual(parseIncomingUtmParams('???===&&&'), {});
  assert.deepEqual(parseIncomingUtmParams('?utm_source=&utm_medium=   &utm_campaign=!!!@@@'), {});
  assert.deepEqual(parseIncomingUtmParams('?email=test@example.com&foo=bar'), {});
  // 畸形百分号编码应静默清洗而非抛出 URIError
  assert.deepEqual(
    parseIncomingUtmParams('?utm_source=%E0%A4%FFreddit&utm_medium=community_post'),
    {
      utm_source: 'reddit',
      utm_medium: 'community_post',
    },
  );
  assert.deepEqual(
    parseIncomingUtmParams('?utm_source=%E0%A4%80&utm_medium=short_video'),
    {
      utm_medium: 'short_video',
    },
  );
});

test('sanitizeIncomingUtmParams：清洗 sessionStorage 读回对象并剔除非白名单键', () => {
  assert.deepEqual(
    sanitizeIncomingUtmParams({
      utm_source: 'FIELD_GUIDE!!',
      utm_medium: 'organic_article',
      utm_campaign: 't32_saddle3_3in_pipe',
      email: 'leak@example.com',
      extra: 123,
    }),
    {
      utm_source: 'field_guide',
      utm_medium: 'organic_article',
      utm_campaign: 't32_saddle3_3in_pipe',
    },
  );
  assert.deepEqual(sanitizeIncomingUtmParams(null), {});
  assert.deepEqual(sanitizeIncomingUtmParams('bad-string'), {});
});

test('createAmplitudeClient：defaultEventProperties 自动合并会话 UTM，显式事件属性优先覆盖', async () => {
  const storage = createMemoryStorage();
  const payloads: Array<any> = [];

  const client = createAmplitudeClient({
    storage,
    platform: 'web',
    uuid: () => 'anon-uuid-utm',
    defaultEventProperties: () => ({
      utm_source: 'youtube_shorts',
      utm_medium: 'short_video',
      utm_campaign: 't32_offset_6in_30deg',
      email: 'should-be-stripped@example.com',
    }),
    fetchFn: (async (_url: string, init?: RequestInit) => {
      payloads.push(JSON.parse(String(init?.body ?? '{}')));
      return new Response('{}', { status: 200 });
    }) as typeof fetch,
  });

  // 1) screen_view 自动携带入站 UTM，且过滤非白名单字段
  await client.logScreenView('SeoOffset');
  assert.deepEqual(payloads[0].events[0].event_properties, {
    screen_name: 'SeoOffset',
    utm_source: 'youtube_shorts',
    utm_medium: 'short_video',
    utm_campaign: 't32_offset_6in_30deg',
  });

  // 2) calculation_completed 自动携带入站 UTM，undefined 不会覆盖默认值
  await client.logEvent('calculation_completed', {
    calculator: 'offset',
    utm_source: undefined,
  });
  assert.deepEqual(payloads[1].events[0].event_properties, {
    calculator: 'offset',
    utm_source: 'youtube_shorts',
    utm_medium: 'short_video',
    utm_campaign: 't32_offset_6in_30deg',
  });

  // 3) activation_completed 自动携带入站 UTM
  await client.markActivationIfNeeded({ tool_name: 'offset', platform: 'web' });
  assert.deepEqual(payloads[2].events[0].event_properties, {
    tool_name: 'offset',
    platform: 'web',
    utm_source: 'youtube_shorts',
    utm_medium: 'short_video',
    utm_campaign: 't32_offset_6in_30deg',
  });

  // 4) google_play_cta_clicked 的显式出站 UTM 属性优先覆盖会话入站 UTM
  await client.logEvent('google_play_cta_clicked', {
    source: 'seo_tool_cta',
    page_slug: 'offset',
    utm_source: 'web_seo',
    utm_medium: 'tool_cta',
    utm_campaign: 'offset',
    cta_placement: 'below_result',
  });
  assert.deepEqual(payloads[3].events[0].event_properties, {
    source: 'seo_tool_cta',
    page_slug: 'offset',
    utm_source: 'web_seo',
    utm_medium: 'tool_cta',
    utm_campaign: 'offset',
    cta_placement: 'below_result',
  });
});

test('createAmplitudeClient：defaultEventProperties 抛异常时静默降级', async () => {
  const storage = createMemoryStorage();
  const payloads: Array<any> = [];

  const client = createAmplitudeClient({
    storage,
    uuid: () => 'anon-uuid-utm-err',
    defaultEventProperties: () => {
      throw new Error('sessionStorage blocked');
    },
    fetchFn: (async (_url: string, init?: RequestInit) => {
      payloads.push(JSON.parse(String(init?.body ?? '{}')));
      return new Response('{}', { status: 200 });
    }) as typeof fetch,
  });

  const ok = await client.logEvent('calculation_completed', { calculator: 'stub-up' });
  assert.equal(ok, true);
  assert.deepEqual(payloads[0].events[0].event_properties, { calculator: 'stub-up' });
});
