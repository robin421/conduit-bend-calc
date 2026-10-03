import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DICTIONARIES,
  en,
  es,
  missingKeys,
  translate,
  type TranslationKey,
} from './dictionaries.ts';
import {
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  LANGS,
  LANG_QUERY_PARAM,
  isLang,
  normalizeLang,
  persistLang,
  readStoredLang,
  resolveInitialLang,
  resolveLangFromSearch,
  withLangQuery,
  type LangStorage,
} from './lang.ts';

/** 进程内假 storage，模拟 localStorage（用于持久化单测）。 */
function fakeStorage(seed: Record<string, string> = {}): LangStorage & {
  data: Record<string, string>;
} {
  const data: Record<string, string> = { ...seed };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

test('normalizeLang：大小写 / 地区码归一，未知回退英语', () => {
  assert.equal(normalizeLang('es'), 'es');
  assert.equal(normalizeLang('ES'), 'es');
  assert.equal(normalizeLang('es-MX'), 'es');
  assert.equal(normalizeLang('es_mx'), 'es');
  assert.equal(normalizeLang('en-US'), 'en');
  assert.equal(normalizeLang('fr'), DEFAULT_LANG);
  assert.equal(normalizeLang(''), DEFAULT_LANG);
  assert.equal(normalizeLang(null), DEFAULT_LANG);
  assert.equal(normalizeLang(undefined), DEFAULT_LANG);
});

test('isLang / LANGS：只接受受支持语言', () => {
  assert.deepEqual([...LANGS], ['en', 'es']);
  assert.equal(isLang('en'), true);
  assert.equal(isLang('es'), true);
  assert.equal(isLang('fr'), false);
  assert.equal(isLang(undefined), false);
});

test('resolveLangFromSearch：解析 ?lang=（含 & 拼接 / 非法值）', () => {
  assert.equal(resolveLangFromSearch('?lang=es'), 'es');
  assert.equal(resolveLangFromSearch('?foo=1&lang=ES'), 'es');
  assert.equal(resolveLangFromSearch('?lang=es-MX'), 'es');
  assert.equal(resolveLangFromSearch('?lang=fr'), null);
  assert.equal(resolveLangFromSearch('?foo=1'), null);
  assert.equal(resolveLangFromSearch(''), null);
  assert.equal(resolveLangFromSearch(null), null);
});

test('resolveInitialLang：URL ?lang= 覆盖 localStorage，非法 URL 回退存储', () => {
  assert.equal(resolveInitialLang('?lang=es', 'en'), 'es');
  assert.equal(resolveInitialLang('?lang=en', 'es'), 'en');
  assert.equal(resolveInitialLang('', 'es'), 'es');
  assert.equal(resolveInitialLang('?foo=1', 'es'), 'es');
  assert.equal(resolveInitialLang('?lang=fr', 'es'), 'es');
  assert.equal(resolveInitialLang('', null), 'en');
});

test('localStorage 持久化：写入后能读回，未知值回退默认', () => {
  const storage = fakeStorage();
  persistLang(storage, 'es');
  assert.equal(storage.data[LANG_STORAGE_KEY], 'es');
  assert.equal(readStoredLang(storage), 'es');

  // 切回 en 同样持久化
  persistLang(storage, 'en');
  assert.equal(readStoredLang(storage), 'en');

  // 损坏 / 未知值 fail-safe 回退
  assert.equal(readStoredLang(fakeStorage({ [LANG_STORAGE_KEY]: 'klingon' })), 'en');
  assert.equal(readStoredLang(null), 'en');
});

test('persistLang / readStoredLang 对抛错的 storage 静默降级', () => {
  const throwing: LangStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('quota');
    },
  };
  assert.equal(readStoredLang(throwing), 'en');
  assert.doesNotThrow(() => persistLang(throwing, 'es'));
});

test('withLangQuery：es 加参数，en 移除参数，保留其它 query 与 hash', () => {
  assert.equal(withLangQuery('/offset/', 'es'), '/offset/?lang=es');
  assert.equal(withLangQuery('/offset/?lang=es', 'en'), '/offset/');
  assert.equal(withLangQuery('/offset/?foo=1', 'es'), '/offset/?foo=1&lang=es');
  assert.equal(
    withLangQuery('/offset/?lang=es&foo=1', 'en'),
    '/offset/?foo=1',
  );
  assert.equal(withLangQuery('/offset/#top', 'es'), '/offset/?lang=es#top');
  assert.equal(LANG_QUERY_PARAM, 'lang');
});

test('es 文案无缺 key（与 en 结构 / 数量完全一致）', () => {
  assert.deepEqual(missingKeys('en'), []);
  assert.deepEqual(missingKeys('es'), []);
  const enKeys = Object.keys(en).sort();
  const esKeys = Object.keys(es).sort();
  assert.deepEqual(esKeys, enKeys);
  assert.equal(Object.keys(DICTIONARIES.es).length, enKeys.length);
});

test('translate：按语言取词并支持 {name} 插值', () => {
  assert.equal(translate('en', 'common.calculate'), 'Calculate');
  assert.equal(translate('es', 'common.calculate'), 'Calcular');
  assert.equal(translate('es', 'offset.markSpacing'), 'Distancia entre marcas');
  assert.equal(translate('es', 'stub.takeUp'), 'Recogida');
  assert.equal(
    translate('es', 'stub.tooShort', { takeUp: 5 }),
    'La altura objetivo debe ser mayor que la recogida de 5".',
  );
  // 未知 key 运行时不抛异常，回退为 key 本身
  assert.equal(
    translate('es', 'not.a.key' as TranslationKey),
    'not.a.key',
  );
});

test('电工术语口径：desplazamiento / conducto / contracción / subida', () => {
  const terms = Object.values(es).join('\n');
  assert.match(terms, /desplazamiento/i);
  assert.match(terms, /conducto/i);
  assert.match(terms, /contracción/i);
  assert.match(terms, /subida de 90°/i);
  assert.match(terms, /recogida/i);
  // 不要用 tubería（brief 指定 conducto 并保持一致）
  assert.doesNotMatch(terms, /tuber/i);
});

test('英文基准里 offset / conduit 术语不被误改', () => {
  assert.equal(en['nav.offset'], 'Offset');
  assert.match(en['brand.footer'], /WattFlow/);
});
