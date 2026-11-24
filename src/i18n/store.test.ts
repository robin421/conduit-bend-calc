import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_LANG, LANG_STORAGE_KEY } from './lang.ts';
import {
  __resetI18nForTests,
  configureAsyncLangStorage,
  getLang,
  hydrateStoredLang,
  initI18n,
  setLang,
  subscribeLang,
  type AsyncLangStorage,
} from './store.ts';

function fakeAsyncStorage(seed: Record<string, string> = {}): AsyncLangStorage & {
  data: Record<string, string>;
} {
  const data: Record<string, string> = { ...seed };
  return {
    data,
    getItem: async (key) => (key in data ? data[key] : null),
    setItem: async (key, value) => {
      data[key] = value;
    },
  };
}

test('initI18n / setLang 在无 DOM 的 Node 环境不抛异常', () => {
  __resetI18nForTests();
  assert.doesNotThrow(() => initI18n('en-US'));
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
    assert.doesNotThrow(() => initI18n('en-US'));
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

test('Native 启动：先按系统 locale 自动检测 es，再异步水合用户已保存的 en 并通知订阅者', async () => {
  __resetI18nForTests();
  initI18n('es-MX');
  assert.equal(getLang(), 'es');

  const asyncStorage = fakeAsyncStorage({ [LANG_STORAGE_KEY]: 'en' });
  configureAsyncLangStorage(asyncStorage);

  let notifications = 0;
  const unsubscribe = subscribeLang(() => {
    notifications += 1;
  });

  const hydrated = await hydrateStoredLang();
  unsubscribe();

  assert.equal(hydrated, 'en');
  assert.equal(getLang(), 'en');
  assert.equal(notifications, 1);
});

test('Native 持久化：未保存时保留系统检测语言；setLang 写入异步存储且不被延迟水合覆盖', async () => {
  __resetI18nForTests();
  initI18n('es-419');
  assert.equal(getLang(), 'es');

  const emptyStorage = fakeAsyncStorage();
  configureAsyncLangStorage(emptyStorage);
  assert.equal(await hydrateStoredLang(), 'es');

  // 显式切到 en，写入 asyncStorage
  setLang('en');
  assert.equal(getLang(), 'en');
  assert.equal(emptyStorage.data[LANG_STORAGE_KEY], 'en');

  // 即使有旧存储值，显式选择后水合也不覆盖
  emptyStorage.data[LANG_STORAGE_KEY] = 'es';
  assert.equal(await hydrateStoredLang(), 'en');
});

test('hydrateStoredLang：异步存储抛错时安全降级不抛异常', async () => {
  __resetI18nForTests();
  initI18n('es-US');
  configureAsyncLangStorage({
    getItem: async () => {
      throw new Error('disk error');
    },
    setItem: async () => {
      throw new Error('disk full');
    },
  });
  assert.equal(await hydrateStoredLang(), 'es');
  assert.doesNotThrow(() => setLang('en'));
  assert.equal(getLang(), 'en');
});

test('Web 端：/es/offset/ 优先于 localStorage 的 en，切换 EN ↔ ES 改写路径并剥离 ?lang=', () => {
  const globalRecord = globalThis as unknown as Record<string, unknown>;
  const previous = globalRecord.window;
  const storageData: Record<string, string> = { [LANG_STORAGE_KEY]: 'en' };
  const replacedUrls: string[] = [];
  const fakeLocation = {
    pathname: '/es/offset/',
    search: '?lang=es&foo=1',
    hash: '#calc',
  };
  globalRecord.window = {
    location: fakeLocation,
    localStorage: {
      getItem: (key: string) => (key in storageData ? storageData[key] : null),
      setItem: (key: string, value: string) => {
        storageData[key] = value;
      },
    },
    history: {
      state: null,
      replaceState: (_state: unknown, _title: string, url: string) => {
        replacedUrls.push(url);
        const [pathAndQuery, hashPart] = url.split('#');
        const [pathPart, queryPart] = pathAndQuery.split('?');
        fakeLocation.pathname = pathPart;
        fakeLocation.search = queryPart ? `?${queryPart}` : '';
        fakeLocation.hash = hashPart ? `#${hashPart}` : '';
      },
    },
  };
  try {
    __resetI18nForTests();
    assert.equal(initI18n('en-US'), 'es');
    assert.equal(getLang(), 'es');
    assert.equal(storageData[LANG_STORAGE_KEY], 'es');

    setLang('en');
    assert.equal(getLang(), 'en');
    assert.equal(replacedUrls[0], '/offset/?foo=1#calc');

    setLang('es');
    assert.equal(getLang(), 'es');
    assert.equal(replacedUrls[1], '/es/offset/?foo=1#calc');
  } finally {
    if (previous === undefined) {
      delete globalRecord.window;
    } else {
      globalRecord.window = previous;
    }
  }
});
