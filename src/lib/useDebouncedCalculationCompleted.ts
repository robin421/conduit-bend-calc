import { useCallback, useEffect, useRef } from 'react';
import type { CalculatorSlug } from './analytics.ts';

/**
 * 1000ms 防抖计算完成上报 Hook（卸载时 flush 未上报计算）。
 * 供 Native (firebase.ts) 与 Web (firebase.web.ts) 共享，避免重复逻辑。
 */
export function useDebouncedCalculationCompleted(
  bendType: CalculatorSlug,
  signature: string | null,
  unitSystem: 'imperial' | 'metric',
  onCompleted: (bendType: CalculatorSlug, options: { unitSystem: 'imperial' | 'metric' }) => void,
): void {
  const lastSentRef = useRef<string | null>(null);
  const pendingRef = useRef<{
    signature: string;
    bendType: CalculatorSlug;
    unitSystem: 'imperial' | 'metric';
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onCompleted);
  callbackRef.current = onCompleted;

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending && pending.signature && pending.signature !== lastSentRef.current) {
      lastSentRef.current = pending.signature;
      callbackRef.current(pending.bendType, { unitSystem: pending.unitSystem });
      pendingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (signature === null || signature === lastSentRef.current) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingRef.current = null;
      return;
    }

    pendingRef.current = { signature, bendType, unitSystem };

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      flush();
    }, 1000);
  }, [bendType, signature, unitSystem, flush]);

  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);
}
