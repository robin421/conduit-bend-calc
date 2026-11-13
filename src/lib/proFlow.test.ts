import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseProIntent, proContinueLabel, proIntentForSource, purchaseBusy, sceneForIntent } from './proFlow.ts';

test('所有付费来源保留正确后续任务，预览场景与下一步明确区分', () => {
  const screens = { offset: 'Offset', stub: 'Stub', three_point_saddle: 'ThreePointSaddle', four_point_saddle: 'FourPointSaddle', rolling_offset: 'RollingOffset', kicked_90: 'Kicked90' };
  for (const [source, screen] of Object.entries(screens)) {
    assert.deepEqual(proIntentForSource(`${source}_feasibility`), { kind: 'feasibility', screen });
    assert.equal(sceneForIntent(proIntentForSource(`${source}_feasibility`)), 'feasibility');
  }
  for (const [source, kind] of [['history_export', 'export'], ['history_limit', 'history'], ['bender_picker', 'bender'], ['direct', 'calibration']]) {
    const intent = proIntentForSource(source);
    assert.equal(intent.kind, kind);
    assert.ok(proContinueLabel(intent).length > 0);
    assert.deepEqual(parseProIntent(JSON.stringify(intent)), intent);
  }
});

test('恢复意图仅保留任务类型，损坏或伪造目标不会被导航执行', () => {
  assert.equal(parseProIntent('broken'), null);
  assert.equal(parseProIntent('{"kind":"feasibility","screen":"Paywall"}'), null);
  assert.equal(parseProIntent('{"kind":"unknown"}'), null);
  assert.deepEqual(parseProIntent('{"kind":"calibration","purchaseToken":"secret","height":150}'), { kind: 'calibration' });
  assert.ok(purchaseBusy('pending'));
  assert.ok(purchaseBusy('purchasing'));
  assert.equal(purchaseBusy('cancelled'), false);
});
