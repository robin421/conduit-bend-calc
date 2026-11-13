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
import { createPurchaseFinisher, purchaseKey } from './purchaseCompletion.ts';
import type { PurchasePhase, ProScene } from './proFlow.ts';
import type { GrowthEvent, GrowthEventParams } from './growthEvents.ts';

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
  phase: PurchasePhase;
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
  phase: PurchasePhase;
  skuAvailability: SkuAvailability;
  purchased: boolean;
  productPrice: string | null;
  initialized: boolean;
  lastError: string | null;
  pendingPurchase: boolean;
}

const INITIAL_STATE: InternalState = {
  phase: 'idle',
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
  buy(context?: { source: string; scene: ProScene }): Promise<BuyResult>;
  restore(): Promise<RestoreResult>;
  getAccess(): ProAccess;
  snapshot(): ProAccessState;
  subscribe(listener: () => void): () => void;
  setGateway(gateway: IapGateway): void;
  clearError(): void;
}

/** 懒网关提供者：默认 dynamic import 真网关，测试注入假网关。 */
export type IapGatewayProvider = () => Promise<IapGateway>;

export const PRO_PENDING_STORAGE_KEY = '@cbc:pro-pending-v1';

export function createProStore(
  storage: HistoryStorage,
  getGateway: IapGatewayProvider,
  options: { onEvent?: (name: GrowthEvent, params: GrowthEventParams) => void } = {},
): ProStore {
  let state: InternalState = { ...INITIAL_STATE };
  const listeners = new Set<() => void>();
  let loadPromise: Promise<void> | null = null;
  let checkoutInFlight = false;
  let restoreInFlight: Promise<RestoreResult> | null = null;
  let listenersRegistered = false;
  let activeGateway: IapGateway | null = null;
  let gatewayProvider = getGateway;
  let unsubscribers: Array<() => void> = [];
  const unfinished = new Map<string, IapPurchaseInfo>();
  let purchaseEpoch = 0;
  let queryGeneration = 0;
  let checkoutContext: GrowthEventParams = {};

  function emit(outcome: string): void {
    try { options.onEvent?.('pro_purchase_result', { ...checkoutContext, outcome }); } catch { /* telemetry is best-effort */ }
  }
  function setPatch(patch: Partial<InternalState>): void {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  }
  function snapshot(): ProAccessState {
    const { purchased, ...rest } = state;
    return { ...rest, access: resolveProAccess(state.skuAvailability, purchased) };
  }
  async function persistEntitlement(purchased: boolean): Promise<void> {
    try { await storage.setItem(PRO_ENTITLEMENT_STORAGE_KEY, serializeProEntitlement({ purchased })); } catch { /* retain in-memory entitlement */ }
  }
  async function setPending(pending: boolean): Promise<void> {
    setPatch({ pendingPurchase: pending });
    try { await storage.setItem(PRO_PENDING_STORAGE_KEY, JSON.stringify(pending)); } catch { /* queried again on resume */ }
  }
  const finish = createPurchaseFinisher(async (purchase) => {
    if (!activeGateway) throw new Error('Store connection unavailable');
    await activeGateway.finishPurchase(purchase);
  });
  async function acknowledge(purchase: IapPurchaseInfo): Promise<void> {
    const key = purchaseKey(purchase);
    unfinished.set(key, purchase);
    try { await finish(purchase); unfinished.delete(key); } catch { /* retry on next foreground query */ }
  }
  async function handlePurchaseUpdate(purchase: IapPurchaseInfo, origin: 'listener' | 'startup' | 'refresh' | 'restore' = 'listener'): Promise<void> {
    if (purchase.productId !== PRO_SKU) return;
    purchaseEpoch++;
    if (purchase.isPending) {
      if (!state.purchased) {
        const wasPending = state.pendingPurchase;
        setPatch({ phase: 'pending', lastError: null });
        await setPending(true);
        if (!wasPending) emit('pending');
      }
      return;
    }
    if (purchase.isPurchased === false) return;
    const wasPurchased = state.purchased;
    const newlyCompleted = !wasPurchased && origin !== 'restore' && (origin === 'listener' || state.pendingPurchase || state.phase === 'purchasing');
    setPatch({ purchased: true, pendingPurchase: false, lastError: null,
      phase: origin === 'restore' ? 'restored' : newlyCompleted ? 'purchased' : state.phase === 'purchased' ? 'purchased' : 'idle' });
    await Promise.all([persistEntitlement(true), setPending(false)]);
    if (newlyCompleted) emit('purchased');
    await acknowledge(purchase);
  }
  function handlePurchaseError(error: { code?: string }): void {
    purchaseEpoch++;
    if (error.code === ALREADY_OWNED_CODE) {
      // Clear the checkout phase so the explicit restore operation can run.
      setPatch({ phase: 'idle' });
      void restoreAfterOwned().catch(() => undefined);
      return;
    }
    if (state.purchased) return; // a late error must not undo a completed purchase
    if (error.code === 'E_DEFERRED_PAYMENT' || state.pendingPurchase) {
      setPatch({ phase: 'pending', lastError: error.code === 'E_DEFERRED_PAYMENT' ? null : purchaseErrorMessage(error.code) });
      void setPending(true);
      return;
    }
    const cancelled = error.code === 'E_USER_CANCELLED';
    setPatch({ lastError: purchaseErrorMessage(error.code), phase: cancelled ? 'cancelled' : 'error' });
    void setPending(false);
    emit(cancelled ? 'cancelled' : 'failed');
  }
  function registerListeners(gw: IapGateway): void {
    if (listenersRegistered) return;
    listenersRegistered = true;
    unsubscribers = [
      gw.onPurchaseUpdate((purchase) => { void handlePurchaseUpdate(purchase); }),
      gw.onPurchaseError(handlePurchaseError),
    ];
  }
  async function queryPurchases(gw: IapGateway, origin: 'startup' | 'refresh' | 'restore'): Promise<boolean> {
    const epoch = purchaseEpoch;
    const generation = ++queryGeneration;
    const purchases: IapPurchaseInfo[] = gw.getPurchases
      ? await gw.getPurchases()
      : (await gw.getPurchasedSkus()).map((productId) => ({ productId, isPending: false }));
    // A newer listener/query result wins over an older async store snapshot.
    if (epoch !== purchaseEpoch || generation !== queryGeneration) return state.purchased;
    const pro = purchases.filter((purchase) => purchase.productId === PRO_SKU);
    const complete = pro.filter((purchase) => !purchase.isPending && purchase.isPurchased !== false);
    if (complete.length) {
      for (const purchase of complete) await handlePurchaseUpdate(purchase, origin);
      return true;
    }
    const pending = pro.find((purchase) => purchase.isPending);
    if (pending) await handlePurchaseUpdate(pending, origin);
    else if (state.pendingPurchase) {
      await setPending(false);
      setPatch({ phase: 'idle' });
    }
    return false;
  }
  async function initialize(): Promise<void> {
    const initial = !state.initialized;
    const previousPhase = state.phase;
    if (!['purchasing', 'pending', 'restoring', 'purchased', 'restored'].includes(previousPhase)) setPatch({ phase: 'loading' });
    if (initial) {
      try {
        const [entitlement, pending] = await Promise.all([
          storage.getItem(PRO_ENTITLEMENT_STORAGE_KEY), storage.getItem(PRO_PENDING_STORAGE_KEY),
        ]);
        const purchased = parseProEntitlement(entitlement).purchased;
        setPatch({ purchased: state.purchased || purchased, pendingPurchase: !purchased && pending === 'true' });
      } catch { /* store query below is authoritative for new purchases */ }
    }
    try {
      const gw = await gatewayProvider();
      activeGateway = gw;
      await gw.init();
      registerListeners(gw);
      try {
        const product = await gw.fetchProduct(PRO_SKU);
        setPatch({ skuAvailability: product ? 'available' : 'unavailable', productPrice: product?.localizedPrice?.trim() || null });
      } catch { setPatch({ skuAvailability: 'unknown', productPrice: null }); }
      // Ownership must be queried even if product lookup is unavailable.
      try { await queryPurchases(gw, initial ? 'startup' : 'refresh'); } catch { /* retain offline entitlement / pending state */ }
      for (const purchase of unfinished.values()) await acknowledge(purchase);
    } catch { setPatch({ skuAvailability: 'unknown', productPrice: null }); }
    finally {
      setPatch({ initialized: true, phase: state.pendingPurchase ? 'pending' : state.phase === 'loading' ? 'idle' : state.phase });
    }
  }
  function load(): Promise<void> {
    if (!loadPromise) loadPromise = initialize().finally(() => { loadPromise = null; });
    return loadPromise;
  }
  function init(): Promise<void> { return state.initialized ? Promise.resolve() : load(); }
  function refresh(): Promise<void> { return load(); }

  async function buy(context?: { source: string; scene: ProScene }): Promise<BuyResult> {
    if (checkoutInFlight || restoreInFlight || state.pendingPurchase || state.phase === 'purchasing') {
      return { ok: false, message: state.pendingPurchase ? 'Payment is pending. Do not purchase again.' : 'A store operation is already in progress.' };
    }
    checkoutInFlight = true;
    checkoutContext = context ? { ...context } : {};
    try {
      await (loadPromise ?? init());
      if (state.purchased) return { ok: true, message: null };
      if (state.pendingPurchase) return { ok: false, message: 'Payment is pending. Do not purchase again.' };
      if (state.skuAvailability !== 'available' || !state.productPrice) {
        setPatch({ lastError: SKU_UNAVAILABLE_MESSAGE, phase: 'error' });
        return { ok: false, message: SKU_UNAVAILABLE_MESSAGE };
      }
      const gw = activeGateway ?? await gatewayProvider();
      activeGateway = gw;
      registerListeners(gw);
      setPatch({ phase: 'purchasing', lastError: null });
      purchaseEpoch++;
      try { options.onEvent?.('pro_checkout_started', { ...checkoutContext }); } catch { /* no business impact */ }
      await gw.requestPurchase(PRO_SKU);
      // Resolving requestPurchase only means the store sheet was launched.
      return { ok: true, message: null };
    } catch (raw) {
      const code = extractPurchaseErrorCode(raw);
      if (code === ALREADY_OWNED_CODE) {
        setPatch({ phase: 'idle' });
        const restored = await restoreAfterOwned();
        return { ok: restored.found, message: restored.message };
      }
      handlePurchaseError({ code });
      return { ok: false, message: purchaseErrorMessage(code) };
    } finally { checkoutInFlight = false; }
  }
  async function restoreOperation(): Promise<RestoreResult> {
    if (loadPromise) await loadPromise;
    setPatch({ phase: 'restoring', lastError: null });
    try {
      const gw = activeGateway ?? await gatewayProvider();
      activeGateway = gw;
      await gw.init();
      registerListeners(gw);
      const found = await queryPurchases(gw, 'restore');
      if (found) { emit('restored'); return { ok: true, found: true, message: null }; }
      const message = state.pendingPurchase ? 'Payment pending. Complete payment before restoring Pro.' : NO_PREVIOUS_PURCHASE_MESSAGE;
      setPatch({ phase: state.pendingPurchase ? 'pending' : 'idle', lastError: message });
      return { ok: true, found: false, message };
    } catch {
      const message = purchaseErrorMessage('E_NETWORK_ERROR');
      setPatch({ phase: state.pendingPurchase ? 'pending' : 'error', lastError: message });
      return { ok: false, found: false, message };
    }
  }
  function restore(): Promise<RestoreResult> {
    if (restoreInFlight) return restoreInFlight;
    if (checkoutInFlight || state.phase === 'purchasing') return Promise.resolve({ ok: false, found: false, message: 'A purchase is already in progress.' });
    return restoreAfterOwned();
  }
  function restoreAfterOwned(): Promise<RestoreResult> {
    if (!restoreInFlight) restoreInFlight = restoreOperation().finally(() => { restoreInFlight = null; });
    return restoreInFlight;
  }
  const store: ProStore = {
    init, refresh, buy, restore,
    getAccess: () => resolveProAccess(state.skuAvailability, state.purchased), snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    clearError: () => setPatch({ lastError: null, phase: ['error', 'cancelled'].includes(state.phase) ? 'idle' : state.phase }),
    setGateway(gateway) {
      for (const unsubscribe of unsubscribers) { try { unsubscribe(); } catch { /* ignore */ } }
      unsubscribers = []; activeGateway = null; listenersRegistered = false;
      gatewayProvider = () => Promise.resolve(gateway);
      setPatch({ initialized: false });
    },
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
}, { onEvent: (name, params) => {
  // Keep the native analytics dependency out of pure store tests.
  try { require('./growth').trackGrowthEvent(name, params); } catch { /* best-effort */ }
} });
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

export function buyPro(context?: { source: string; scene: ProScene }): Promise<BuyResult> {
  return singleton.buy(context);
}

export function restorePro(): Promise<RestoreResult> {
  return singleton.restore();
}

export function clearProError(): void {
  singleton.clearError();
}

export function getCurrentProAccess(): ProAccess {
  return singleton.getAccess();
}

export function getCurrentProState(): ProAccessState { return singleton.snapshot(); }

/**
 * Pro 访问态 hook：sku 可用性 / 购买态任一变化即重渲染。
 * 初始快照来自进程内缓存（App 启动时 initProIap 已预热）。
 */
export function useProAccess(): ProAccessState {
  const [state, setState] = useState<ProAccessState>(() => singleton.snapshot());
  useEffect(() => {
    const unsubscribe = singleton.subscribe(() => setState(singleton.snapshot()));
    setState(singleton.snapshot());
    return unsubscribe;
  }, []);
  return state;
}
