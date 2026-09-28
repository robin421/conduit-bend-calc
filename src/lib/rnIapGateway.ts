/**
 * react-native-iap 的真网关实现（IapGateway 接口）。
 *
 * 关键约束：对 'react-native-iap' 只做函数内懒 require，
 * 本文件绝不被单元测试 import（测试用假网关）。
 * `import type` 只是类型擦除，不产生运行时依赖。
 */

import type {
  Product as RniapProduct,
  Purchase as RniapPurchase,
  RequestPurchase as RniapRequest,
} from 'react-native-iap';

import type {
  IapGateway,
  IapPurchaseError,
  IapPurchaseInfo,
  IapUnsubscribe,
} from './iap.ts';

/** typeof import 仅用于类型查询，编译后擦除。 */
type RniapModule = typeof import('react-native-iap');

/**
 * PurchaseStateAndroid.PENDING 的数值（见 react-native-iap 的 types/index.d.ts：
 * UNSPECIFIED_STATE = 0, PURCHASED = 1, PENDING = 2）。
 * pending 的购买不解锁，等支付完成后再经 listener 送达。
 */
const PURCHASE_STATE_PENDING_ANDROID = 2;

function loadNative(): RniapModule {
  // 函数内懒 require：顶层 import 会让 node --test 在无原生模块时崩溃。
  return require('react-native-iap') as RniapModule;
}

export function createRnIapGateway(): IapGateway {
  /** productId → 原生 purchase 对象（供 finishPurchase 使用）。 */
  const nativeByProductId = new Map<string, RniapPurchase>();
  /** 已完成交易的幂等守卫：`${productId}:${purchaseToken ?? ''}`。 */
  const finishedKeys = new Set<string>();
  let updateCallback: ((purchase: IapPurchaseInfo) => void) | null = null;

  function toInfo(native: RniapPurchase): IapPurchaseInfo {
    nativeByProductId.set(native.productId, native);
    const raw = native as { purchaseToken?: unknown; purchaseStateAndroid?: unknown };
    return {
      productId: native.productId,
      purchaseToken: typeof raw.purchaseToken === 'string' ? raw.purchaseToken : undefined,
      isPending: raw.purchaseStateAndroid === PURCHASE_STATE_PENDING_ANDROID,
    };
  }

  function emitUpdate(native: RniapPurchase): void {
    const info = toInfo(native);
    if (updateCallback) {
      updateCallback(info);
    }
  }

  function isPurchaseObject(value: unknown): value is RniapPurchase {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { productId?: unknown }).productId === 'string'
    );
  }

  return {
    async init(): Promise<void> {
      const m = loadNative();
      // v12 签名：initConnection: () => Promise<boolean>；Android 必需。
      const connected = await m.initConnection();
      if (!connected) {
        throw new Error('IAP connection unavailable');
      }
    },

    async fetchProduct(sku: string): Promise<{ productId: string; localizedPrice: string } | null> {
      const m = loadNative();
      // v12 没有 fetchProducts，实际函数是 getProducts({ skus })。
      const products: RniapProduct[] = await m.getProducts({ skus: [sku] });
      const found = products.find((p) => p.productId === sku) ?? null;
      if (!found) {
        return null;
      }
      return { productId: found.productId, localizedPrice: found.localizedPrice };
    },

    async requestPurchase(sku: string): Promise<void> {
      const m = loadNative();
      // v12 签名：requestPurchase(request: RequestPurchase)。
      // Android（Google Play）要求 { skus: [...] }，iOS/Amazon 要求 { sku }；
      // 两个字段都带上，各平台只读自己需要的字段。
      const request = { sku, skus: [sku] } as unknown as RniapRequest;
      const result = await m.requestPurchase(request);
      // iOS 可能直接 resolve 出 purchase；统一走 update 回调，避免两套授权路径。
      const purchase = Array.isArray(result) ? result[0] : result;
      if (isPurchaseObject(purchase)) {
        emitUpdate(purchase);
      }
    },

    async finishPurchase(purchase: IapPurchaseInfo): Promise<void> {
      const key = `${purchase.productId}:${purchase.purchaseToken ?? ''}`;
      if (finishedKeys.has(key)) {
        return;
      }
      finishedKeys.add(key);
      const native = nativeByProductId.get(purchase.productId);
      if (!native) {
        return;
      }
      const m = loadNative();
      // v12 签名：finishTransaction({ purchase, isConsumable?, developerPayloadAndroid? })。
      // 一次性买断商品：isConsumable 必须为 false（acknowledge 而非 consume）。
      await m.finishTransaction({ purchase: native, isConsumable: false });
    },

    async getPurchasedSkus(): Promise<string[]> {
      const m = loadNative();
      const purchases: RniapPurchase[] = await m.getAvailablePurchases();
      for (const p of purchases) {
        nativeByProductId.set(p.productId, p);
      }
      return purchases.map((p) => p.productId);
    },

    onPurchaseUpdate(cb: (purchase: IapPurchaseInfo) => void): IapUnsubscribe {
      updateCallback = cb;
      const m = loadNative();
      const sub = m.purchaseUpdatedListener((native: RniapPurchase) => {
        emitUpdate(native);
      });
      return () => {
        if (updateCallback === cb) {
          updateCallback = null;
        }
        sub.remove();
      };
    },

    onPurchaseError(cb: (error: IapPurchaseError) => void): IapUnsubscribe {
      const m = loadNative();
      const sub = m.purchaseErrorListener((nativeError) => {
        const raw = nativeError as { code?: unknown; message?: unknown };
        cb({
          code: typeof raw.code === 'string' ? raw.code : undefined,
          message: typeof raw.message === 'string' ? raw.message : 'Purchase failed.',
        });
      });
      return () => {
        sub.remove();
      };
    },
  };
}
