import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AMPLITUDE_ACTIVATED_KEY,
  AMPLITUDE_API_ENDPOINT,
  AMPLITUDE_DEVICE_ID_KEY,
  AMPLITUDE_SESSION_TIMEOUT_MS,
  buildAmplitudeHttpBody,
  createAmplitudeClient,
  DEFAULT_AMPLITUDE_API_KEY,
  parseSessionState,
  sanitizeEventProperties,
  sanitizeEventType,
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
