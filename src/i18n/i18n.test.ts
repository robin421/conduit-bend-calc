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
  detectSystemLang,
  isLang,
  localizePath,
  normalizeLang,
  parseStoredLang,
  persistLang,
  readRawStoredLang,
  readStoredLang,
  resolveInitialLang,
  resolveLangFromPath,
  resolveLangFromSearch,
  stripLangPrefix,
  withLangPath,
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

test('detectSystemLang：西语系 locale 返回 es，其他回退 en', () => {
  assert.equal(detectSystemLang('es'), 'es');
  assert.equal(detectSystemLang('es-MX'), 'es');
  assert.equal(detectSystemLang('es-US'), 'es');
  assert.equal(detectSystemLang('es-419'), 'es');
  assert.equal(detectSystemLang('ES_es'), 'es');
  assert.equal(detectSystemLang('en'), 'en');
  assert.equal(detectSystemLang('en-US'), 'en');
  assert.equal(detectSystemLang('fr-FR'), 'en');
  assert.equal(detectSystemLang(''), 'en');
  assert.equal(detectSystemLang(null), 'en');
  assert.equal(detectSystemLang(undefined), 'en');
});

test('parseStoredLang / readRawStoredLang：区分未保存 null 与显式保存 en', () => {
  assert.equal(parseStoredLang('en'), 'en');
  assert.equal(parseStoredLang('es'), 'es');
  assert.equal(parseStoredLang('es-MX'), 'es');
  assert.equal(parseStoredLang(null), null);
  assert.equal(parseStoredLang(undefined), null);
  assert.equal(parseStoredLang(''), null);
  assert.equal(parseStoredLang('fr'), null);
  assert.equal(readRawStoredLang(fakeStorage()), null);
  assert.equal(readRawStoredLang(fakeStorage({ [LANG_STORAGE_KEY]: 'en' })), 'en');
  assert.equal(readRawStoredLang(fakeStorage({ [LANG_STORAGE_KEY]: 'bogus' })), null);
});

test('resolveLangFromPath：仅匹配 /es 或 /es/... 前缀', () => {
  assert.equal(resolveLangFromPath('/es'), 'es');
  assert.equal(resolveLangFromPath('/es/'), 'es');
  assert.equal(resolveLangFromPath('/es/offset'), 'es');
  assert.equal(resolveLangFromPath('/es/offset/'), 'es');
  assert.equal(resolveLangFromPath('/ES/stub-up/?foo=1'), 'es');
  assert.equal(resolveLangFromPath('/'), null);
  assert.equal(resolveLangFromPath('/offset/'), null);
  assert.equal(resolveLangFromPath('/escalator'), null);
  assert.equal(resolveLangFromPath('/es-guide/'), null);
  assert.equal(resolveLangFromPath(''), null);
  assert.equal(resolveLangFromPath(null), null);
  assert.equal(resolveLangFromPath(undefined), null);
});

test('stripLangPrefix / localizePath：幂等剥离与拼接 /es 前缀', () => {
  assert.equal(stripLangPrefix('/es'), '/');
  assert.equal(stripLangPrefix('/es/'), '/');
  assert.equal(stripLangPrefix('/es/offset/'), '/offset/');
  assert.equal(stripLangPrefix('/ES/stub-up'), '/stub-up');
  assert.equal(stripLangPrefix('/offset/'), '/offset/');
  assert.equal(stripLangPrefix('/'), '/');

  assert.equal(localizePath('/', 'en'), '/');
  assert.equal(localizePath('/', 'es'), '/es/');
  assert.equal(localizePath('/es/', 'en'), '/');
  assert.equal(localizePath('/es/', 'es'), '/es/');
  assert.equal(localizePath('/offset', 'es'), '/es/offset');
  assert.equal(localizePath('/offset/', 'es'), '/es/offset/');
  assert.equal(localizePath('/es/offset/', 'es'), '/es/offset/');
  assert.equal(localizePath('/es/offset/', 'en'), '/offset/');
});

test('resolveInitialLang：URL /es/... > URL ?lang= > 已保存语言 > systemLocale > 默认 en', () => {
  // 向后兼容 2 参数调用
  assert.equal(resolveInitialLang('?lang=es', 'en'), 'es');
  assert.equal(resolveInitialLang('?lang=en', 'es'), 'en');
  assert.equal(resolveInitialLang('', 'es'), 'es');
  assert.equal(resolveInitialLang('?foo=1', 'es'), 'es');
  assert.equal(resolveInitialLang('?lang=fr', 'es'), 'es');
  assert.equal(resolveInitialLang('', null), 'en');

  // 3 参数调用：区分未保存 null 与用户显式选了 en
  assert.equal(resolveInitialLang('', null, 'es-MX'), 'es');
  assert.equal(resolveInitialLang('', undefined, 'es-419'), 'es');
  assert.equal(resolveInitialLang('', 'invalid', 'es-US'), 'es');
  assert.equal(resolveInitialLang('', 'en', 'es-MX'), 'en');
  assert.equal(resolveInitialLang('?lang=es', 'en', 'en-US'), 'es');
  assert.equal(resolveInitialLang('?lang=en', 'es', 'es-MX'), 'en');
  assert.equal(resolveInitialLang('', null, 'en-US'), 'en');

  // 4 参数调用：/es/... 路径优先级高于 ?lang=、stored 与 systemLocale
  assert.equal(resolveInitialLang('', 'en', 'en-US', '/es/'), 'es');
  assert.equal(resolveInitialLang('?lang=en', 'en', 'en-US', '/es/offset/'), 'es');
  assert.equal(resolveInitialLang('?lang=es', 'en', 'en-US', '/offset/'), 'es');
  assert.equal(resolveInitialLang('', 'en', 'es-MX', '/offset/'), 'en');
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

test('withLangPath：在 /<slug>/ ↔ /es/<slug>/ 与 / ↔ /es/ 间干净切换并剥离冗余 ?lang=', () => {
  assert.equal(withLangPath('/', '', '', 'es'), '/es/');
  assert.equal(withLangPath('/es/', '', '', 'en'), '/');
  assert.equal(withLangPath('/es', '', '', 'en'), '/');
  assert.equal(withLangPath('/es', '', '', 'es'), '/es/');
  assert.equal(withLangPath('/offset/', '', '', 'es'), '/es/offset/');
  assert.equal(withLangPath('/offset', '', '', 'es'), '/es/offset/');
  assert.equal(withLangPath('/es/offset/', '', '', 'en'), '/offset/');
  assert.equal(withLangPath('/es/offset', '', '', 'en'), '/offset/');
  assert.equal(withLangPath('/offset/', '?lang=es', '', 'es'), '/es/offset/');
  assert.equal(withLangPath('/offset/', '?lang=es&foo=1', '#faq', 'en'), '/offset/?foo=1#faq');
  assert.equal(withLangPath('/offset/', '?foo=1&lang=es', '#faq', 'es'), '/es/offset/?foo=1#faq');
  assert.equal(withLangPath('/es/', '?utm_source=x&lang=es', '#top', 'en'), '/?utm_source=x#top');
  assert.equal(withLangPath('/privacy.html', '', '', 'en'), '/privacy.html');
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

test('feedback.* 词条在 en / es 中完整且支持插值', () => {
  assert.equal(translate('en', 'feedback.sendButton'), 'Send feedback');
  assert.equal(translate('es', 'feedback.sendButton'), 'Enviar comentarios');
  assert.equal(
    translate('en', 'feedback.minCharsHint', { min: 10 }),
    'Minimum 10 characters',
  );
  assert.equal(
    translate('es', 'feedback.errorTooLong', { max: 1000 }),
    'El comentario debe tener 1000 caracteres o menos.',
  );
});

test('核心链路词条（paywall / home / history / tabs / calc）在 en / es 完整且支持插值', () => {
  assert.equal(translate('en', 'paywall.unlockCta'), 'Unlock Pro Lifetime');
  assert.equal(translate('es', 'paywall.unlockCta'), 'Desbloquear Pro de por vida');
  assert.equal(translate('es', 'home.group.bending'), 'Doblado de conducto');
  assert.equal(translate('es', 'tabs.history'), 'Historial');
  assert.equal(
    translate('es', 'history.limitTitle', { count: 12 }),
    'Viendo 5 de 12 dobleces recientes',
  );
  assert.equal(
    translate('es', 'offset.guideSummary', { distance: '12"', angle: 30 }),
    'Separa las dos marcas 12". Alinea cada marca con la flecha y dobla 30° en direcciones opuestas.',
  );
  assert.equal(translate('en', 'rating.button'), 'Rate on Google Play');
  assert.equal(translate('es', 'rating.button'), 'Calificar en Google Play');
  assert.equal(translate('es', 'rating.opening'), 'Abriendo Google Play…');
  assert.equal(
    translate('en', 'paywall.personalCalibrationTitle', { delta: '+3/8"' }),
    'Save your +3/8" bender calibration',
  );
  assert.equal(
    translate('es', 'paywall.personalCalibrationTitle', { delta: '+3/8"' }),
    'Guarda tu calibración de +3/8"',
  );
  assert.equal(
    translate('en', 'paywall.roiAnchor'),
    'One saved stick of conduit pays for it — one-time purchase, no subscription.',
  );
  assert.equal(
    translate('es', 'paywall.roiAnchor'),
    'Ahorra un solo conducto y se paga solo — pago único, sin suscripción.',
  );
  assert.equal(
    translate('es', 'paywall.historyHiddenTitle', { total: 12, hidden: 7 }),
    '12 dobleces guardados · 7 ocultos',
  );
  assert.equal(
    translate('en', 'calibration.guided.saveAndApply'),
    'Save & Apply to All Bend Calculators',
  );
  assert.equal(
    translate('es', 'calibration.guided.saveAndApply'),
    'Guardar y aplicar a todas las calculadoras de doblado',
  );
});

test('T40 全量原生屏词条（Conduit Fill / BenderPicker / BendGuide / Wire / VD / Lookup / Saddle / Rolling / Kicked90）在 en / es 完整且支持插值', () => {
  assert.equal(translate('en', 'bendGuide.showDiagram'), 'Show bend diagram');
  assert.equal(translate('es', 'bendGuide.showDiagram'), 'Mostrar diagrama de doblez');
  assert.equal(translate('es', 'bendGuide.hideDiagram'), 'Ocultar diagrama de doblez');
  assert.equal(
    translate('es', 'benderPicker.specCaptionHook', { r: '6.5', takeUp: '6' }),
    'R 6.5" · recogida 6" (ref.: frente del gancho)',
  );
  assert.equal(translate('es', 'benderPicker.unlockPro'), 'Desbloquear Pro');
  assert.equal(translate('es', 'conduitFill.racewayShort'), 'Conducto');
  assert.equal(translate('es', 'conduitFill.wiresUnitShort'), 'cables');
  assert.equal(
    translate('es', 'conduitFill.maxConductorsHeadline', {
      wire: '12 AWG',
      trade: '3/4',
      raceway: 'EMT',
    }),
    'Máx. 12 AWG THHN en 3/4" EMT',
  );
  assert.equal(translate('es', 'wireSize.terminationLabel'), 'Temperatura de terminales');
  assert.equal(translate('es', 'voltageDrop.oneWayLength'), 'Distancia de ida');
  assert.equal(translate('es', 'lookup.title'), 'Referencia rápida');
  assert.equal(translate('es', 'lookup.stubSection'), 'Recogida de subida de 90° (EMT)');
  assert.equal(translate('es', 'rolling.benderRotationShort'), 'Rotación del doblador');
  assert.equal(
    translate('es', 'kicked90.layoutNote', { distance: '12"', angle: 15 }),
    'Dobla primero 90°, mide 12" a lo largo del conducto desde Marca 1 hasta Marca 2 y luego dobla 15°',
  );
});
