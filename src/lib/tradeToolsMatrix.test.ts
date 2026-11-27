import assert from 'node:assert/strict';
import test from 'node:test';

import { translate } from '../i18n/dictionaries.ts';
import {
  BILLIN_TRADE_TOOLS,
  CONDUIT_BENDER_PACKAGE_ID,
  CROSS_PROMO_MEDIUM,
  CROSS_PROMO_SOURCE,
  buildTradeToolPlayUrl,
} from './tradeToolsMatrix.ts';

test('BILLIN_TRADE_TOOLS lists all 6 sibling offline trade apps without self-linking', () => {
  assert.equal(BILLIN_TRADE_TOOLS.length, 6);
  const packages = BILLIN_TRADE_TOOLS.map((t) => t.packageId);
  assert.equal(new Set(packages).size, 6, 'package IDs must be unique');
  assert.ok(!packages.includes(CONDUIT_BENDER_PACKAGE_ID), 'must not self-link ConduitBender');
  assert.deepEqual(packages, [
    'com.firstbend.firstbend',
    'com.snapproof.jobreport',
    'com.squarefoot.jobcalc',
    'com.measurequote.blueprint',
    'com.hvacgauge.ptpro',
    'com.wrenchquote.autoro',
  ]);
});

test('buildTradeToolPlayUrl generates valid Google Play links with cross-promo UTM referrer', () => {
  assert.equal(CROSS_PROMO_SOURCE, 'conduitbender');
  assert.equal(CROSS_PROMO_MEDIUM, 'cross_promo');
  for (const tool of BILLIN_TRADE_TOOLS) {
    const url = buildTradeToolPlayUrl(tool.packageId);
    assert.equal(
      url,
      `https://play.google.com/store/apps/details?id=${tool.packageId}&referrer=utm_source%3Dconduitbender%26utm_medium%3Dcross_promo`,
    );
    const parsed = new URL(url);
    assert.equal(parsed.origin, 'https://play.google.com');
    assert.equal(parsed.pathname, '/store/apps/details');
    assert.equal(parsed.searchParams.get('id'), tool.packageId);
    assert.equal(
      parsed.searchParams.get('referrer'),
      'utm_source=conduitbender&utm_medium=cross_promo',
    );
  }
});

test('tradeTools EN & ES copy is complete, localized, and natural', () => {
  assert.equal(translate('en', 'tradeTools.title'), 'More Offline Trade Tools by Billin');
  assert.equal(
    translate('es', 'tradeTools.title'),
    'Más herramientas de oficio sin conexión de Billin',
  );
  for (const tool of BILLIN_TRADE_TOOLS) {
    const enDesc = translate('en', tool.descriptionKey);
    const esDesc = translate('es', tool.descriptionKey);
    assert.ok(enDesc.length > 10, `missing EN description for ${tool.id}`);
    assert.ok(esDesc.length > 10, `missing ES description for ${tool.id}`);
    assert.notEqual(enDesc, esDesc, `ES description should be localized for ${tool.id}`);
  }
});
