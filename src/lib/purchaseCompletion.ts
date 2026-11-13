import type { IapPurchaseInfo } from './iap.ts';

export function purchaseKey(purchase: IapPurchaseInfo): string {
  return `${purchase.productId}:${purchase.purchaseToken ?? purchase.transactionId ?? ''}`;
}

/** 合并同一交易的并发确认；仅在成功后去重，失败允许后续重试。 */
export function createPurchaseFinisher(finish: (purchase: IapPurchaseInfo) => Promise<void>) {
  const completed = new Set<string>();
  const pending = new Map<string, Promise<void>>();
  return (purchase: IapPurchaseInfo): Promise<void> => {
    if (purchase.isPending || purchase.isPurchased === false) return Promise.resolve();
    const key = purchaseKey(purchase);
    if (completed.has(key)) return Promise.resolve();
    const existing = pending.get(key);
    if (existing) return existing;
    const operation = Promise.resolve().then(() => finish(purchase)).then(() => {
      completed.add(key);
    }).finally(() => { pending.delete(key); });
    pending.set(key, operation);
    return operation;
  };
}
