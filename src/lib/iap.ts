/**
 * Pro 内购（一次性买断）的纯逻辑层：常量、三态类型、访问判定、
 * entitlement 序列化/解析、错误文案映射。
 *
 * 纯 TypeScript，无任何运行时导入（包括 react-native），
 * 可被 node --test 直接 import。
 */

/** Pro 一次性买断商品 SKU（Google Play / App Store 托管商品，需在控制台创建）。 */
export const PRO_SKU = 'cbc_pro_lifetime';

/** entitlement 在 AsyncStorage 中的存储键。 */
export const PRO_ENTITLEMENT_STORAGE_KEY = '@cbc:pro-entitlement-v1';

/**
 * SKU 可用性三态：
 * - 'available'：商店可解析到该 SKU，走正常购买流程；
 * - 'unavailable'：商店解析不到该 SKU（商品未建/已下架/查询失败但明确无此商品）；
 * - 'unknown'：尚未查询成功（离线/异常/超时）。
 *
 * 安全语义（fail-closed）：'unavailable' / 'unknown' 只影响购买入口的展示，
 * 绝不作为解锁依据。解锁的唯一凭证是已验证的购买（purchased=true）。
 */
export type SkuAvailability = 'available' | 'unavailable' | 'unknown';

/** Pro 功能访问态：'unlocked' 全开，'locked' 锁定 Pro 功能。 */
export type ProAccess = 'unlocked' | 'locked';

/**
 * 访问判定（fail-closed）：
 * 解锁的唯一凭证是已验证的购买（purchased=true），来源只有三处：
 *  1. 商店 getPurchasedSkus/getAvailablePurchases 返回该 SKU；
 *  2. purchaseUpdatedListener 送达该 SKU 的非 pending 购买；
 *  3. 本地 entitlement 缓存（仅由 1/2 写入，用于已购用户离线启动）。
 * SKU 查不到 / 查询失败 / 离线 / 超时 → 一律 locked，绝不自动解锁。
 * sku 参数仅用于购买入口的 UI 展示分支，不参与解锁判定。
 */
export function resolveProAccess(sku: SkuAvailability, purchased: boolean): ProAccess {
  if (purchased) {
    return 'unlocked';
  }
  return 'locked';
}

/** SKU 不可购买时（unknown/unavailable）付费墙的英文提示。 */
export const SKU_UNAVAILABLE_MESSAGE =
  'Purchase temporarily unavailable. Please check your connection and try again.';

/** 本地 entitlement：是否已购买 Pro。 */
export interface ProEntitlement {
  purchased: boolean;
}

/**
 * 解析存储的 entitlement。空值 / 非法 JSON / 形状不对 → 安全回退
 * { purchased: false }，不抛异常（刷新 entitlement 靠商店查询兜底）。
 */
export function parseProEntitlement(raw: string | null): ProEntitlement {
  if (!raw) {
    return { purchased: false };
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as Record<string, unknown>).purchased === 'boolean'
    ) {
      return { purchased: (value as ProEntitlement).purchased };
    }
    return { purchased: false };
  } catch {
    return { purchased: false };
  }
}

export function serializeProEntitlement(entitlement: ProEntitlement): string {
  return JSON.stringify({ purchased: entitlement.purchased === true });
}

/** 网关上报的购买信息（平台无关的最小子集）。 */
export interface IapPurchaseInfo {
  productId: string;
  purchaseToken?: string;
  /** true = 支付尚未完成（如 Android PENDING），此时不解锁。 */
  isPending: boolean;
}

/** 网关上报的购买错误（平台无关的最小子集）。 */
export interface IapPurchaseError {
  /** react-native-iap 的 ErrorCode 字符串，如 'E_USER_CANCELLED'。 */
  code?: string;
  message: string;
}

export type IapUnsubscribe = () => void;

/**
 * IAP 网关接口。真实现见 rnIapGateway.ts（对 'react-native-iap'
 * 只做函数内懒 require），测试用假网关实现此接口。
 */
export interface IapGateway {
  /** 连接商店（Android 必需）。失败时抛异常。 */
  init(): Promise<void>;
  /** 查询单个商品；解析不到返回 null（SKU 未配置）。失败时抛异常。 */
  fetchProduct(sku: string): Promise<{ productId: string; localizedPrice: string } | null>;
  /** 发起购买。购买结果经由 onPurchaseUpdate 回调送达（iOS 可能直接 resolve）。 */
  requestPurchase(sku: string): Promise<void>;
  /** 完成交易（非消耗型：acknowledge）。幂等。 */
  finishPurchase(purchase: IapPurchaseInfo): Promise<void>;
  /** 返回当前用户已拥有的 SKU 列表（用于启动刷新与恢复购买）。 */
  getPurchasedSkus(): Promise<string[]>;
  onPurchaseUpdate(cb: (purchase: IapPurchaseInfo) => void): IapUnsubscribe;
  onPurchaseError(cb: (error: IapPurchaseError) => void): IapUnsubscribe;
}

/** 从未知错误中提取 react-native-iap 的错误码字符串。 */
export function extractPurchaseErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null) {
    const code = (error as Record<string, unknown>).code;
    if (typeof code === 'string' && code !== '') {
      return code;
    }
  }
  return undefined;
}

/** react-native-iap 的 E_ALREADY_OWNED：用户已拥有该商品，走恢复流程即可。 */
export const ALREADY_OWNED_CODE = 'E_ALREADY_OWNED';

/**
 * 购买错误 → 用户可懂的英文提示。
 * 映射依据 react-native-iap v12 的 ErrorCode 枚举。
 */
export function purchaseErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'E_USER_CANCELLED':
      return 'Purchase cancelled.';
    case 'E_NETWORK_ERROR':
    case 'E_REMOTE_ERROR':
    case 'E_SERVICE_ERROR':
    case 'E_IAP_NOT_AVAILABLE':
    case 'E_NOT_PREPARED':
      return 'Network unavailable. Your previous purchase status is kept.';
    case 'E_DEFERRED_PAYMENT':
      return 'Payment pending. Pro will unlock automatically once it completes.';
    default:
      return 'Purchase failed. Please try again.';
  }
}

/** 恢复购买时商店无记录 → 用户可懂的英文提示。 */
export const NO_PREVIOUS_PURCHASE_MESSAGE = 'No previous purchase found.';
