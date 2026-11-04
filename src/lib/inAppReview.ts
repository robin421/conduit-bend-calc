import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { useEffect, useRef } from 'react';
import { Linking, Platform } from 'react-native';

import { GOOGLE_PLAY_URL } from './homeContent.ts';
import {
  parseReviewState,
  REVIEW_STORAGE_KEY,
  serializeReviewState,
  shouldRequestInAppReview,
  withReviewRequested,
  withSuccessfulCalc,
  type InAppReviewState,
} from './inAppReviewStore.ts';
import type { FeasibilityStatus } from '../calculators/feasibility/feasibility.ts';

const sessionSeenSignatures = new Set<string>();
let memoryState: InAppReviewState | null = null;
let loadPromise: Promise<InAppReviewState> | null = null;

async function loadState(): Promise<InAppReviewState> {
  if (memoryState) return memoryState;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(REVIEW_STORAGE_KEY);
        memoryState = parseReviewState(raw);
      } catch {
        memoryState = parseReviewState(null);
      }
      return memoryState;
    })();
  }
  return loadPromise;
}

async function saveState(state: InAppReviewState): Promise<void> {
  memoryState = state;
  try {
    await AsyncStorage.setItem(REVIEW_STORAGE_KEY, serializeReviewState(state));
  } catch {
    // ignore — review is best-effort
  }
}

/**
 * After a successful calc with no blocking feasibility, count it and maybe
 * request the native review card. Same signature only counts once per process.
 */
export async function noteSuccessfulCalcAndMaybeRequestReview(
  signature: string,
  feasibilityStatus: FeasibilityStatus | null | undefined,
): Promise<boolean> {
  if (!signature) return false;
  if (feasibilityStatus === 'impossible') return false;

  const isNew = !sessionSeenSignatures.has(signature);
  sessionSeenSignatures.add(signature);

  let state = await loadState();
  if (isNew) {
    state = withSuccessfulCalc(state, true);
    await saveState(state);
  }

  if (!shouldRequestInAppReview(state)) return false;
  if (Platform.OS === 'web') return false;

  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) return false;
    await StoreReview.requestReview();
    state = withReviewRequested(state);
    await saveState(state);
    return true;
  } catch {
    return false;
  }
}

/** Manual "Rate on Google Play" fallback — always opens the listing. */
export async function openPlayStoreListing(): Promise<void> {
  const url = StoreReview.storeUrl() ?? GOOGLE_PLAY_URL;
  try {
    await Linking.openURL(url);
  } catch {
    // ignore
  }
}

/**
 * When `signature` appears for a non-impossible result, count a success and
 * possibly request review (debounced like history save).
 */
export function useReviewOnSuccessfulCalc(
  signature: string | null,
  feasibilityStatus: FeasibilityStatus | null | undefined,
  delayMs = 900,
): void {
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!signature || feasibilityStatus === 'impossible') return;
    if (last.current === signature) return;
    const timer = setTimeout(() => {
      last.current = signature;
      void noteSuccessfulCalcAndMaybeRequestReview(signature, feasibilityStatus);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [signature, feasibilityStatus, delayMs]);
}

/** Test-only reset. */
export function __resetInAppReviewForTests(): void {
  memoryState = null;
  loadPromise = null;
  sessionSeenSignatures.clear();
}
