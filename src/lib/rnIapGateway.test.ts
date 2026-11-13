import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRnIapGateway } from './rnIapGateway.ts';

function fixture(purchases: Array<{ productId: string; purchaseToken: string; purchaseStateAndroid?: number; isAcknowledgedAndroid?: boolean }>, failures = 0) {
  const finished: string[] = [];
  const native = {
    getAvailablePurchases: async () => purchases,
    finishTransaction: async ({ purchase }: { purchase: { purchaseToken: string } }) => {
      finished.push(purchase.purchaseToken);
      if (failures-- > 0) throw new Error('offline');
    },
  };
  return { gateway: createRnIapGateway(() => native as unknown as typeof import('react-native-iap'), 'android'), finished };
}

test('原生 PURCHASED 才进入已购列表，未知和 PENDING 不误授权', async () => {
  const { gateway } = fixture([0, 1, 2].map((state) => ({ productId: `sku-${state}`, purchaseToken: String(state), purchaseStateAndroid: state })));
  const purchases = await gateway.getPurchases!();
  assert.deepEqual(purchases.map((p) => [p.isPurchased, p.isPending]), [[false, false], [true, false], [false, true]]);
  assert.deepEqual(await gateway.getPurchasedSkus(), ['sku-1']);
});

test('Android 缺少购买状态时不会按 iOS 交易误授权', async () => {
  const { gateway } = fixture([{ productId: 'pro', purchaseToken: 'unknown' }]);
  const [purchase] = await gateway.getPurchases!();
  assert.equal(purchase.isPurchased, false);
  assert.deepEqual(await gateway.getPurchasedSkus(), []);
});

test('恢复已确认交易不再次调用 native finishTransaction', async () => {
  const { gateway, finished } = fixture([{ productId: 'pro', purchaseToken: 'done', purchaseStateAndroid: 1, isAcknowledgedAndroid: true }]);
  const [purchase] = await gateway.getPurchases!();
  await gateway.finishPurchase(purchase);
  await gateway.finishPurchase(purchase);
  assert.deepEqual(finished, []);
});

test('原生确认失败保留原始交易供重试，同 SKU 不同 token 不互相覆盖', async () => {
  const { gateway, finished } = fixture(['a', 'b'].map((token) => ({ productId: 'pro', purchaseToken: token, purchaseStateAndroid: 1 })), 1);
  const [a, b] = await gateway.getPurchases!();
  await assert.rejects(gateway.finishPurchase(a));
  await Promise.all([gateway.finishPurchase(a), gateway.finishPurchase(a), gateway.finishPurchase(b)]);
  assert.deepEqual(finished, ['a', 'a', 'b']);
});
