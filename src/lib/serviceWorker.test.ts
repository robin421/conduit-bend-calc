import assert from 'node:assert/strict';
import { test } from 'node:test';

import { shouldRegisterServiceWorker } from './serviceWorker.ts';

test('非 Web 平台不注册', () => {
  assert.equal(
    shouldRegisterServiceWorker({
      isWeb: false,
      protocol: 'https:',
      hostname: 'bendcalc.wattflow.net',
      hasServiceWorker: true,
    }),
    false,
  );
});

test('浏览器不支持 serviceWorker 不注册', () => {
  assert.equal(
    shouldRegisterServiceWorker({
      isWeb: true,
      protocol: 'https:',
      hostname: 'bendcalc.wattflow.net',
      hasServiceWorker: false,
    }),
    false,
  );
});

test('production HTTPS 注册', () => {
  assert.equal(
    shouldRegisterServiceWorker({
      isWeb: true,
      protocol: 'https:',
      hostname: 'bendcalc.wattflow.net',
      hasServiceWorker: true,
    }),
    true,
  );
});

test('http 非 localhost 不注册（避免踩到非安全上下文的坑）', () => {
  assert.equal(
    shouldRegisterServiceWorker({
      isWeb: true,
      protocol: 'http:',
      hostname: 'example.com',
      hasServiceWorker: true,
    }),
    false,
  );
});

test('localhost http 允许注册（本地调试）', () => {
  assert.equal(
    shouldRegisterServiceWorker({
      isWeb: true,
      protocol: 'http:',
      hostname: 'localhost',
      hasServiceWorker: true,
    }),
    true,
  );
  assert.equal(
    shouldRegisterServiceWorker({
      isWeb: true,
      protocol: 'http:',
      hostname: '127.0.0.1',
      hasServiceWorker: true,
    }),
    true,
  );
});
