import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createProActionGuard } from './proActionGuard.ts';

test('悬挂购买请求不阻塞状态查询或解锁后的继续操作', () => {
  const guard = createProActionGuard();
  assert.equal(guard.begin('buy'), true);
  assert.equal(guard.begin('buy'), false);
  assert.equal(guard.begin('restore'), false);
  assert.equal(guard.begin('retry'), true);
  guard.end('retry');
  assert.equal(guard.begin('continue'), true);
  guard.end('buy');
  assert.deepEqual([...guard.snapshot()], ['continue'], '旧购买的 finally 不清除当前继续动作');
  guard.end('continue');
  assert.equal(guard.begin('continue'), false, '同一成功页只执行一次');
});

test('继续任务失败允许明确重试，不放开重复支付', () => {
  const guard = createProActionGuard();
  guard.begin('continue');
  assert.equal(guard.begin('buy'), false);
  guard.end('continue', true);
  assert.equal(guard.begin('continue'), true);
});
