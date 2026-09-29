/**
 * Pro 内购状态仓库：entitlement 单例（AsyncStorage + 进程内缓存 + listeners），
 * 仿照 benderSpecStore.ts 的模式。
 *
 * 顶层绝不 import/require 'react-native-iap'（测试经由 node --test 直接
 * import 本文件）。真网关经由默认懒加载（dynamic import ./rnIapGateway.ts）
 * 获得，测试通过 createProStore 注入内存 storage + 假网关。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import {
  ALREADY_OWNED_CODE,
  NO_PREVIOUS_PURCHASE_MESSAGE,
  PRO_ENTITLEMENT_STORAGE_KEY,
  PRO_SKU,
  SKU_UNAVAILABLE_MESSAGE,
  extractPurchaseErrorCode,
  parseProEntitlement,
  purchaseErrorMessage,
  resolveProAccess,
  serializeProEntitlement,
  type IapGateway,
  type IapPurchaseInfo,
  type ProAccess,
  type SkuAvailability,
} from './iap.ts';
import type { HistoryStorage } from './historyStore.ts';

export interface BuyResult {
  ok: boolean;
  /** 失败时的用户可读英文提示；成功时为 null。 */
  message: string | null;
}

export interface RestoreResult {
  ok: boolean;
  found: boolean;
  /** found=false 或 ok=false 时的用户可读英文提示；成功找到时为 null。 */
  message: string | null;
}

/** useProAccess() 返回的快照。 */
export interface ProAccessState {
  access: ProAccess;
  skuAvailability: SkuAvailability;
  /** fetchProducts 返回的 localizedPrice；未知时为 null。 */
  productPrice: string | null;
  initialized: boolean;
  /** 最近一次购买/恢复错误的英文提示；无错误时为 null。 */
  lastError: string | null;
  /** 有一笔 pending 的购买等待支付完成。 */
  pendingPurchase: boolean;
}

interface InternalState {
  skuAvailability: SkuAvailability;
  purchased: boolean;
  productPrice: string | null;
  initialized: boolean;
  lastError: string | null;
  pendingPurchase: boolean;
}

const INITIAL_STATE: InternalState = {
  skuAvailability: 'unknown',
  purchased: false,
  productPrice: null,
  initialized: false,
  lastError: null,
  pendingPurchase: false,
};

export interface ProStore {
  init(): Promise<void>;
  refresh(): Promise<void>;
  buy(): Promise<BuyResult>;
  restore(): Promise<RestoreResult>;
  getAccess(): ProAccess;
  snapshot(): ProAccessState;
  subscribe(listener: () => void): () => void;
  setGateway(gateway: IapGateway): void;
  clearError(): void;
}

/** 懒网关提供者：默认 dynamic import 真网关，测试注入假网关。 */
export type IapGatewayProvider = () => Promise<IapGateway>;

export function createProStore(
  storage: HistoryStorage,
  getGateway: IapGatewayProvider,
): ProStore {
  let state: InternalState = { ...INITIAL_STATE };
  const listeners = new Set<() => void>();
  let initStarted = false;
  let listenersRegistered = false;
  let activeGateway: IapGateway | null = null;
  let gatewayProvider: IapGatewayProvider = getGateway;
  let unsubscribers: Array<() => void> = [];

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function setPatch(patch: Partial<InternalState>): void {
    state = { ...state, ...patch };
    notify();
  }

  function snapshot(): ProAccessState {
    return {
      access: resolveProAccess(state.skuAvailability, state.purchased),
      skuAvailability: state.skuAvailability,
      productPrice: state.productPrice,
      initialized: state.initialized,
      lastError: state.lastError,
      pendingPurchase: state.pendingPurchase,
    };
  }

  async function readStoredEntitlement(): Promise<boolean> {
    try {
      const raw = await storage.getItem(PRO_ENTITLEMENT_STORAGE_KEY);
      return parseProEntitlement(raw).purchased;
    } catch {
      return false;
    }
  }

  async function persistEntitlement(purchased: boolean): Promise<void> {
    try {
      await storage.setItem(
        PRO_ENTITLEMENT_STORAGE_KEY,
        serializeProEntitlement({ purchased }),
      );
    } catch {
      // 持久化失败不影响内存中的授权态。
    }
  }

  function registerListeners(gw: IapGateway): void {
    if (listenersRegistered) {
      return;
    }
    listenersRegistered = true;
    unsubscribers = [
      gw.onPurchaseUpdate((purchase) => {
        void handlePurchaseUpdate(purchase);
      }),
      gw.onPurchaseError((error) => {
        handlePurchaseError(error);
      }),
    ];
  }

  async function handlePurchaseUpdate(purchase: IapPurchaseInfo): Promise<void> {
    if (purchase.productId !== PRO_SKU) {
      return;
    }
    if (purchase.isPending) {
      setPatch({ pendingPurchase: true });
      return;
    }
    setPatch({ purchased: true, pendingPurchase: false, lastError: null });
    await persistEntitlement(true);
    const gw = activeGateway;
    if (gw) {
      try {
        await gw.finishPurchase(purchase);
      } catch {
        // 已授予授权，finish 失败不影响用户。
      }
    }
  }

  function handlePurchaseError(error: { code?: string }): void {
    if (error.code === ALREADY_OWNED_CODE) {
      // 用户已拥有该商品：静默走恢复流程刷新授权。
      void store.restore().catch(() => undefined);
      return;
    }
    setPatch({ lastError: purchaseErrorMessage(error.code), pendingPurchase: false });
  }

  /**
   * 启动时初始化：读本地 entitlement → 连接商店 → fetchProduct 定 SKU
   * 可用性 → getAvailablePurchases 刷新 entitlement。全程 try/catch，
   * 任何异常都 fail-closed：skuAvailability 保持 'unknown'，
   * 未验证购买一律 locked（见 resolveProAccess）。
   *
   * 本地 entitlement=true（此前已验证的购买）+ 本次离线 → 保持 unlocked：
   * 这是"信任上次已验证状态"，不是 fail-open；从未验证过的一律 locked。
   */
  async function init(): Promise<void> {
    if (initStarted) {
      return;
    }
    initStarted = true;
    const stored = await readStoredEntitlement();
    if (stored) {
      setPatch({ purchased: true });
    }
    try {
      const gw = await gatewayProvider();
      activeGateway = gw;
      registerListeners(gw);
      await gw.init();
      let fetched = false;
      let product: { productId: string; localizedPrice: string } | null = null;
      try {
        product = await gw.fetchProduct(PRO_SKU);
        fetched = true;
      } catch {
        fetched = false;
      }
      if (!fetched) {
        // 查询失败（离线/异常/超时）：fail-closed，保持 'unknown' → locked。
      } else if (!product) {
        // 商店解析不到 SKU（商品未建/已下架）：购买入口不可用，保持 locked。
        setPatch({ skuAvailability: 'unavailable' });
      } else {
        setPatch({ skuAvailability: 'available', productPrice: product.localizedPrice });
        try {
          const skus = await gw.getPurchasedSkus();
          if (skus.includes(PRO_SKU)) {
            setPatch({ purchased: true });
            await persistEntitlement(true);
          }
        } catch {
          // 刷新失败：fail-closed，保留本地 entitlement（已验证过的购买仍有效，
          // 从未验证过的不解锁）。
        }
      }
    } catch {
      // 连接商店失败：fail-closed（skuAvailability 保持 'unknown' → locked）。
    } finally {
      setPatch({ initialized: true });
    }
  }

  /** 强制重新走一遍 init（付费墙在产品信息缺失时调用）。 */
  async function refresh(): Promise<void> {
    initStarted = false;
    await init();
  }

  async function buy(): Promise<BuyResult> {
    await init();
    setPatch({ lastError: null });
    // SKU 不可购买（离线/商品未解析）时直接拒绝，不调 requestPurchase。
    if (state.skuAvailability !== 'available') {
      setPatch({ lastError: SKU_UNAVAILABLE_MESSAGE });
      return { ok: false, message: SKU_UNAVAILABLE_MESSAGE };
    }
    let gw: IapGateway;
    try {
      gw = await gatewayProvider();
    } catch {
      const message = purchaseErrorMessage('E_NETWORK_ERROR');
      setPatch({ lastError: message });
      return { ok: false, message };
    }
    activeGateway = gw;
    registerListeners(gw);
    try {
      await gw.requestPurchase(PRO_SKU);
      // 购买结果经由 purchaseUpdatedListener 回调送达（见 handlePurchaseUpdate）。
      return { ok: true, message: null };
    } catch (raw) {
      const code = extractPurchaseErrorCode(raw);
      if (code === ALREADY_OWNED_CODE) {
        const restored = await store.restore();
        return { ok: restored.found, message: restored.message };
      }
      const message = purchaseErrorMessage(code);
      setPatch({ lastError: message });
      return { ok: false, message };
    }
  }

  async function restore(): Promise<RestoreResult> {
    setPatch({ lastError: null });
    try {
      const gw = await gatewayProvider();
      activeGateway = gw;
      await gw.init();
      const skus = await gw.getPurchasedSkus();
      if (skus.includes(PRO_SKU)) {
        setPatch({ purchased: true, pendingPurchase: false });
        await persistEntitlement(true);
        return { ok: true, found: true, message: null };
      }
      setPatch({ lastError: NO_PREVIOUS_PURCHASE_MESSAGE });
      return { ok: true, found: false, message: NO_PREVIOUS_PURCHASE_MESSAGE };
    } catch {
      const message = purchaseErrorMessage('E_NETWORK_ERROR');
      setPatch({ lastError: message });
      return { ok: false, found: false, message };
    }
  }

  function setGateway(gateway: IapGateway): void {
    for (const unsubscribe of unsubscribers) {
      try {
        unsubscribe();
      } catch {
        // 忽略
      }
    }
    unsubscribers = [];
    gatewayProvider = () => Promise.resolve(gateway);
    activeGateway = null;
    listenersRegistered = false;
    initStarted = false;
  }

  const store: ProStore = {
    init,
    refresh,
    buy,
    restore,
    getAccess: () => resolveProAccess(state.skuAvailability, state.purchased),
    snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setGateway,
    clearError: () => setPatch({ lastError: null }),
  };
  return store;
}

function defaultGatewayProvider(): Promise<IapGateway> {
  // 真网关模块懒加载：require 只在 App 内首次调用 init/buy/restore 时执行；
  // node --test 下测试注入假网关，此分支永不执行。
  //（Metro/Hermes 运行时提供 require；tsc 下 @types/node 提供其类型。）
  const m = require('./rnIapGateway.ts') as {
    createRnIapGateway(): IapGateway;
  };
  return Promise.resolve(m.createRnIapGateway());
}

const singleton = createProStore(AsyncStorage, () => {
  if (!defaultGatewayPromise) {
    defaultGatewayPromise = defaultGatewayProvider();
  }
  return defaultGatewayPromise;
});
let defaultGatewayPromise: Promise<IapGateway> | null = null;

/** 供测试/特殊场景替换网关；替换后下一次 init 会重新执行。 */
export function setIapGateway(gateway: IapGateway): void {
  singleton.setGateway(gateway);
}

/** App 启动时调用一次（fire-and-forget）。 */
export function initProIap(): Promise<void> {
  return singleton.init();
}

/** 付费墙在产品信息缺失时调用，强制重查。 */
export function refreshProIap(): Promise<void> {
  return singleton.refresh();
}

export function buyPro(): Promise<BuyResult> {
  return singleton.buy();
}

export function restorePro(): Promise<RestoreResult> {
  return singleton.restore();
}

export function clearProError(): void {
  singleton.clearError();
}

/**
 * Pro 访问态 hook：sku 可用性 / 购买态任一变化即重渲染。
 * 初始快照来自进程内缓存（App 启动时 initProIap 已预热）。
 */
export function useProAccess(): ProAccessState {
  const [state, setState] = useState<ProAccessState>(() => singleton.snapshot());
  useEffect(() => singleton.subscribe(() => setState(singleton.snapshot())), []);
  return state;
}
