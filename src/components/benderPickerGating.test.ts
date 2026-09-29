import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveCustomCreateMode } from './benderPickerGating.ts';

test('unlocked：显示手动创建表单', () => {
  assert.equal(resolveCustomCreateMode('unlocked', true), 'form');
  assert.equal(resolveCustomCreateMode('unlocked', false), 'form');
});

test('locked 且有 onUnlockPro 回调：显示锁定 upsell（隐藏创建表单）', () => {
  assert.equal(resolveCustomCreateMode('locked', true), 'locked');
});

test('locked 且无 onUnlockPro 回调：直接隐藏创建区', () => {
  assert.equal(resolveCustomCreateMode('locked', false), 'hidden');
});
