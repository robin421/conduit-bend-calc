import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { BenderSpec } from '../constants.ts';
import {
  createCustomSpecsStore,
  CUSTOM_SPECS_STORAGE_KEY,
} from './customSpecsStore';

export { CUSTOM_SPECS_STORAGE_KEY } from './customSpecsStore';
export type { CustomSpecsStore } from './customSpecsStore';

const store = createCustomSpecsStore(AsyncStorage);

/** 读取全部 Custom 规格（最新在前）。 */
export function loadCustomSpecs(): Promise<BenderSpec[]> {
  return store.load();
}

/** 新增或按 customName 覆盖一条 Custom 规格。 */
export function saveCustomSpec(spec: BenderSpec): Promise<BenderSpec[]> {
  return store.upsert(spec);
}

/**
 * Custom 规格 hook：挂载时从 AsyncStorage 加载，
 * addSpec 持久化并更新列表（同名覆盖）。
 */
export function useCustomSpecs(): {
  specs: BenderSpec[];
  ready: boolean;
  addSpec: (spec: BenderSpec) => Promise<void>;
} {
  const [specs, setSpecs] = useState<BenderSpec[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void store
      .load()
      .then((loaded) => {
        if (!cancelled) {
          setSpecs(loaded);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addSpec = useCallback(async (spec: BenderSpec) => {
    const next = await store.upsert(spec);
    setSpecs(next);
  }, []);

  return { specs, ready, addSpec };
}
