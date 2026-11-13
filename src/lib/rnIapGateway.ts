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
import { createPurchaseFinisher, purchaseKey } from './purchaseCompletion.ts';

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

export function createRnIapGateway(
  nativeLoader: () => RniapModule = loadNative,
  platform: 'android' | 'ios' = require('react-native').Platform.OS,
): IapGateway {
  /** productId → 原生 purchase 对象（供 finishPurchase 使用）。 */
  const nativeByKey = new Map<string, RniapPurchase>();
  let updateCallback: ((purchase: IapPurchaseInfo) => void) | null = null;

  function toInfo(native: RniapPurchase): IapPurchaseInfo {
    const raw = native as { purchaseToken?: unknown; purchaseStateAndroid?: unknown };
    const info: IapPurchaseInfo = {
      productId: native.productId,
      purchaseToken: typeof raw.purchaseToken === 'string' ? raw.purchaseToken : undefined,
      transactionId: native.transactionId,
      isPurchased: platform === 'ios' || raw.purchaseStateAndroid === 1,
      isPending: raw.purchaseStateAndroid === PURCHASE_STATE_PENDING_ANDROID,
    };
    nativeByKey.set(purchaseKey(info), native);
    return info;
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

  const finish = createPurchaseFinisher(async (purchase) => {
    const native = nativeByKey.get(purchaseKey(purchase));
    if (!native) throw new Error('Purchase details unavailable; query purchases before retrying.');
    if (native.isAcknowledgedAndroid === true) {
      nativeByKey.delete(purchaseKey(purchase));
      return;
    }
    await nativeLoader().finishTransaction({ purchase: native, isConsumable: false });
    nativeByKey.delete(purchaseKey(purchase));
  });

  async function getPurchases(): Promise<IapPurchaseInfo[]> {
    const purchases = await nativeLoader().getAvailablePurchases();
    return purchases.map(toInfo);
  }

  return {
    async init(): Promise<void> {
      const m = nativeLoader();
      // v12 签名：initConnection: () => Promise<boolean>；Android 必需。
      const connected = await m.initConnection();
      if (!connected) {
        throw new Error('IAP connection unavailable');
      }
    },

    async fetchProduct(sku: string): Promise<{ productId: string; localizedPrice: string } | null> {
      const m = nativeLoader();
      // v12 没有 fetchProducts，实际函数是 getProducts({ skus })。
      const products: RniapProduct[] = await m.getProducts({ skus: [sku] });
      const found = products.find((p) => p.productId === sku) ?? null;
      if (!found) {
        return null;
      }
      return { productId: found.productId, localizedPrice: found.localizedPrice };
    },

    async requestPurchase(sku: string): Promise<void> {
      const m = nativeLoader();
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

    finishPurchase: finish,

    getPurchases,

    async getPurchasedSkus(): Promise<string[]> {
      const purchases = await getPurchases();
      return purchases.filter((p) => p.isPurchased && !p.isPending).map((p) => p.productId);
    },

    onPurchaseUpdate(cb: (purchase: IapPurchaseInfo) => void): IapUnsubscribe {
      updateCallback = cb;
      const m = nativeLoader();
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
      const m = nativeLoader();
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
