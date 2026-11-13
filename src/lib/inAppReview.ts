import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { useCallback, useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';

import { GOOGLE_PLAY_URL } from './homeContent';
import { createReviewCoordinator } from './reviewCoordinator';
import { trackGrowthEvent } from './growth';

const coordinator = createReviewCoordinator(AsyncStorage, {
  isAvailable: () => Platform.OS === 'android' ? StoreReview.isAvailableAsync() : Promise.resolve(false),
  request: () => StoreReview.requestReview(),
}, { onEvent: trackGrowthEvent });
let suspended = false;
export function suspendReviewForSession(): void { suspended = true; }

/** 首次打开即记录起点；评分请求另外等待用户完成任务并返回首页。 */
export function initInAppReview(): Promise<unknown> {
  return Platform.OS === 'android' ? coordinator.initialize() : Promise.resolve();
}

export function requestReviewWhenIdle(isIdle: () => boolean): Promise<unknown> {
  return Platform.OS === 'android' ? coordinator.requestWhenIdle(() => !suspended && isIdle()) : Promise.resolve();
}

/** 手动入口直接打开商店，不调用可能被限额的原生评分卡。 */
export async function openPlayStoreListing(source = 'manual'): Promise<boolean> {
  try {
    await Linking.openURL(GOOGLE_PLAY_URL);
    trackGrowthEvent('review_store_open', { source });
    return true;
  } catch { return false; }
}

/** 只有用户主动编辑后产生的稳定结果才计数；挂载、回填、单位切换不会计数。 */
export function useReviewOnSuccessfulCalc(
  signature: string | null,
  feasibilityStatus: string | null | undefined,
): (() => void) & { reset(): void } {
  const dirty = useRef(false);
  useEffect(() => {
    if (!signature) { dirty.current = false; return; }
    if (!signature || !dirty.current || feasibilityStatus === 'impossible') return;
    const timer = setTimeout(() => {
      dirty.current = false;
      if (Platform.OS === 'android') void coordinator.noteCalculation(signature, feasibilityStatus).catch(() => undefined);
    }, 900);
    return () => clearTimeout(timer);
  }, [signature, feasibilityStatus]);
  const mark = useCallback(() => { dirty.current = true; }, []);
  const reset = useCallback(() => { dirty.current = false; }, []);
  return Object.assign(mark, { reset });
}
