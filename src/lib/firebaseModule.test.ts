import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadConfiguredFirebaseModule } from './firebaseModule.ts';

test('没有默认 Firebase 配置时不加载会在导入阶段抛错的 SDK', () => {
  let loaded = false;
  const load = () => { loaded = true; throw new Error('SDK import would fail'); };
  assert.equal(loadConfiguredFirebaseModule(() => [], load), null);
  assert.equal(loadConfiguredFirebaseModule(() => [{ name: 'secondary' }], load), null);
  assert.equal(loaded, false);
});

test('已有默认 App 时加载 SDK；初始化或加载失败不影响业务', () => {
  const sdk = { ready: true };
  assert.equal(loadConfiguredFirebaseModule(() => [{ name: '[DEFAULT]' }], () => sdk), sdk);
  assert.equal(loadConfiguredFirebaseModule(() => { throw new Error('native unavailable'); }, () => sdk), null);
  assert.equal(loadConfiguredFirebaseModule(() => [{ name: '[DEFAULT]' }], () => { throw new Error('module unavailable'); }), null);
});
