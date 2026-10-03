import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_LANG } from './lang.ts';
import { __resetI18nForTests, getLang, initI18n, setLang } from './store.ts';

test('initI18n / setLang 在无 DOM 的 Node 环境不抛异常', () => {
  __resetI18nForTests();
  assert.doesNotThrow(() => initI18n());
  assert.equal(getLang(), DEFAULT_LANG);
  assert.doesNotThrow(() => setLang('es'));
  assert.equal(getLang(), 'es');
});

test('模拟 React Native：window 存在但没有 location/history/localStorage 也不崩', () => {
  const globalRecord = globalThis as unknown as Record<string, unknown>;
  const previous = globalRecord.window;
  // RN 定义全局 window，但没有 location / history / localStorage。
  globalRecord.window = {};
  try {
    __resetI18nForTests();
    assert.doesNotThrow(() => initI18n());
    assert.equal(getLang(), DEFAULT_LANG);
    assert.doesNotThrow(() => setLang('es'));
    assert.equal(getLang(), 'es');
  } finally {
    if (previous === undefined) {
      delete globalRecord.window;
    } else {
      globalRecord.window = previous;
    }
  }
});
