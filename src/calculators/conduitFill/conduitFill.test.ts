import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculateConduitFill, maxSameSizeConductors } from './conduitFill.ts';

test('maxSameSizeConductors: 与 NEC Annex C 表 C.1（EMT、THHN）一致', () => {
  assert.equal(maxSameSizeConductors('EMT', '1/2', '14'), 12);
  assert.equal(maxSameSizeConductors('EMT', '1/2', '12'), 9);
  assert.equal(maxSameSizeConductors('EMT', '1/2', '10'), 5);
  assert.equal(maxSameSizeConductors('EMT', '3/4', '12'), 16);
  assert.equal(maxSameSizeConductors('EMT', '3/4', '10'), 10);
  assert.equal(maxSameSizeConductors('EMT', '1', '12'), 26);
  assert.equal(maxSameSizeConductors('EMT', '1', '4'), 4);
});

test('maxSameSizeConductors: Note 7 小数 ≥ 0.8 进位（3/4" EMT 可穿 6 根 #8）', () => {
  // 0.213 / 0.0366 = 5.82 → 6
  assert.equal(maxSameSizeConductors('EMT', '3/4', '8'), 6);
  // 3/4" EMT #14：21.96 → 22
  assert.equal(maxSameSizeConductors('EMT', '3/4', '14'), 22);
});

test('maxSameSizeConductors: 2 根按 31%、1 根按 53%', () => {
  // 1/2" EMT #6：2 根 0.1014 > 31%（0.0942），1 根 OK
  assert.equal(maxSameSizeConductors('EMT', '1/2', '6'), 1);
  // 1/2" EMT 500 kcmil：单根都放不下
  assert.equal(maxSameSizeConductors('EMT', '1/2', '500'), 0);
});

test('calculateConduitFill: 输入根数时给出填充率和是否合规', () => {
  const ok = calculateConduitFill('EMT', '3/4', '12', 9);
  assert.ok(ok);
  assert.equal(ok.fits, true);
  assert.equal(ok.allowedFraction, 0.4);
  assert.ok(Math.abs((ok.fillFraction ?? 0) - (9 * 0.0133) / 0.533) < 1e-12);
  assert.equal(calculateConduitFill('EMT', '1/2', '12', 10)?.fits, false);
});

test('calculateConduitFill: 非法根数返回 null，不抛异常', () => {
  assert.equal(calculateConduitFill('EMT', '1/2', '12', 0), null);
  assert.equal(calculateConduitFill('EMT', '1/2', '12', 2.5), null);
  assert.equal(calculateConduitFill('EMT', '1/2', '12', Number.NaN), null);
});
