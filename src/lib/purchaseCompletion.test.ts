import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPurchaseFinisher } from './purchaseCompletion.ts';

const purchase = { productId: 'pro', purchaseToken: 'a', isPending: false };

test('交易确认失败可重试，成功后才去重', async () => {
  let attempts = 0;
  const finish = createPurchaseFinisher(async () => { attempts++; if (attempts === 1) throw new Error('offline'); });
  await assert.rejects(finish(purchase));
  await finish(purchase);
  await finish(purchase);
  assert.equal(attempts, 2);
});

test('相同 token 的并发确认合并，不同 token 分别完成', async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const finish = createPurchaseFinisher(async () => { calls++; await gate; });
  const a = finish(purchase);
  const duplicate = finish(purchase);
  const b = finish({ ...purchase, purchaseToken: 'b' });
  assert.equal(a, duplicate);
  release();
  await Promise.all([a, duplicate, b]);
  assert.equal(calls, 2);
});

test('待支付和未知状态不做交易确认，iOS 不同 transactionId 分开处理', async () => {
  let calls = 0;
  const finish = createPurchaseFinisher(async () => { calls++; });
  await finish({ ...purchase, isPending: true });
  await finish({ ...purchase, isPurchased: false });
  await finish({ productId: 'pro', transactionId: 'ios-1', isPending: false });
  await finish({ productId: 'pro', transactionId: 'ios-2', isPending: false });
  assert.equal(calls, 2);
});
