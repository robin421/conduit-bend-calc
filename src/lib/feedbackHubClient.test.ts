import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_FEEDBACK_HUB_URL,
  resolveFeedbackLanguage,
  submitFeedbackTicket,
  validateFeedbackPayload,
} from '../../feedback-hub/clients/feedback-hub-rn.ts';

test('resolveFeedbackLanguage：支持 en / zh / zh-tw / ja / ko / es / de / fr，未知回退 en', () => {
  assert.equal(resolveFeedbackLanguage('en-US'), 'en');
  assert.equal(resolveFeedbackLanguage('zh-CN'), 'zh');
  assert.equal(resolveFeedbackLanguage('zh_sg'), 'zh');
  assert.equal(resolveFeedbackLanguage('zh-TW'), 'zh-tw');
  assert.equal(resolveFeedbackLanguage('zh-HK'), 'zh-tw');
  assert.equal(resolveFeedbackLanguage('zh-Hant'), 'zh-tw');
  assert.equal(resolveFeedbackLanguage('ja-JP'), 'ja');
  assert.equal(resolveFeedbackLanguage('ko-KR'), 'ko');
  assert.equal(resolveFeedbackLanguage('es-MX'), 'es');
  assert.equal(resolveFeedbackLanguage('de-DE'), 'de');
  assert.equal(resolveFeedbackLanguage('fr-CA'), 'fr');
  assert.equal(resolveFeedbackLanguage('pt-BR'), 'en');
  assert.equal(resolveFeedbackLanguage(''), 'en');
});

test('validateFeedbackPayload：仅校验 category 与 content 非空（不限制字数）', () => {
  assert.deepEqual(validateFeedbackPayload({ category: '', content: '123' }), {
    valid: false,
    error: 'invalid_category',
  });
  assert.deepEqual(validateFeedbackPayload({ category: '   ', content: '123' }), {
    valid: false,
    error: 'invalid_category',
  });
  assert.deepEqual(validateFeedbackPayload({ category: 'bug', content: '   ' }), {
    valid: false,
    error: 'content_empty',
  });
  assert.deepEqual(
    validateFeedbackPayload({ category: 'bug', content: 'ok' }),
    { valid: true },
  );
  assert.deepEqual(
    validateFeedbackPayload({ category: 'feature', content: 'a'.repeat(1500) }),
    { valid: true },
  );
});

test('submitFeedbackTicket：校验失败时不发请求直接返回错误', async () => {
  let called = false;
  const mockFetch = (async () => {
    called = true;
    throw new Error('should not be called');
  }) as unknown as typeof fetch;

  const result = await submitFeedbackTicket(
    {
      pkg: 'conduit',
      category: 'bug',
      content: '   ',
    },
    { fetchImpl: mockFetch },
  );

  assert.equal(called, false);
  assert.deepEqual(result, { ok: false, error: 'content_empty' });
});

test('submitFeedbackTicket：成功提交解析 ticketId 并发送完整白名单字段', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Feedback submitted successfully.',
        data: {
          ticket_id: 'T-xyz123',
          issue_number: 88,
          issue_url: 'https://github.com/example/repo/issues/88',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  const result = await submitFeedbackTicket(
    {
      pkg: 'conduit',
      ver: '1.10.1',
      os: 'Android API 35',
      lang: 'es-MX',
      category: 'formula',
      content: 'Offset multiplier for 30 degrees looks great in field.',
      email: 'user@example.com',
      extra: { source: 'in_app' },
    },
    { fetchImpl: mockFetch },
  );

  assert.equal(capturedUrl, `${DEFAULT_FEEDBACK_HUB_URL}/api/submit`);
  assert.equal(capturedInit?.method, 'POST');
  const sentBody = JSON.parse(String(capturedInit?.body));
  assert.deepEqual(sentBody, {
    pkg: 'conduit',
    ver: '1.10.1',
    os: 'Android API 35',
    lang: 'es',
    category: 'formula',
    content: 'Offset multiplier for 30 degrees looks great in field.',
    email: 'user@example.com',
    extra: { source: 'in_app' },
    website_url: '',
  });

  assert.deepEqual(result, {
    ok: true,
    ticketId: 'T-xyz123',
    issueNumber: 88,
    issueUrl: 'https://github.com/example/repo/issues/88',
    status: 200,
  });
});

test('submitFeedbackTicket：400 响应返回服务端错误与状态码', async () => {
  const mockFetch = (async () =>
    new Response(
      JSON.stringify({
        success: false,
        error: 'Feedback content must be between 10 and 1000 characters.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )) as typeof fetch;

  const result = await submitFeedbackTicket(
    {
      pkg: 'conduit',
      category: 'bug',
      content: 'Valid length feedback content here.',
    },
    { baseUrl: 'https://custom.example.com/', fetchImpl: mockFetch },
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'Feedback content must be between 10 and 1000 characters.',
    status: 400,
  });
});

test('submitFeedbackTicket：网络异常时不抛异常并返回错误信息', async () => {
  const mockFetch = (async () => {
    throw new Error('Network request failed');
  }) as unknown as typeof fetch;

  const result = await submitFeedbackTicket(
    {
      pkg: 'conduit',
      category: 'other',
      content: 'Testing network failure resilience.',
    },
    { fetchImpl: mockFetch },
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'Network request failed',
  });
});

test('submitFeedbackTicket：超时触发 AbortController 返回 timeout', async () => {
  const mockFetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    })) as unknown as typeof fetch;

  const result = await submitFeedbackTicket(
    {
      pkg: 'conduit',
      category: 'bug',
      content: 'Testing 15s timeout abort controller.',
    },
    { timeoutMs: 10, fetchImpl: mockFetch },
  );

  assert.deepEqual(result, {
    ok: false,
    error: 'timeout',
  });
});
