/**
 * SEO 工具页历史 hook：AsyncStorage（Web 端即 localStorage）注入 + 进程内状态。
 *
 * 纯逻辑在 seoHistory.ts（可 node --test），本文件只做 React 绑定与存储注入。
 * 每个 kind 一个单例 store，避免同一屏多次 mount 反复构造。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import {
  createSeoHistoryStore,
  type SeoHistoryEntry,
  type SeoHistoryKind,
  type SeoHistoryStore,
} from './seoHistory.ts';

const stores = new Map<SeoHistoryKind, SeoHistoryStore>();

function storeFor(kind: SeoHistoryKind): SeoHistoryStore {
  let store = stores.get(kind);
  if (!store) {
    store = createSeoHistoryStore(AsyncStorage, kind);
    stores.set(kind, store);
  }
  return store;
}

export interface UseSeoHistoryResult {
  entries: readonly SeoHistoryEntry[];
  loaded: boolean;
  add: (entry: SeoHistoryEntry) => void;
  clear: () => void;
}

export function useSeoHistory(kind: SeoHistoryKind): UseSeoHistoryResult {
  const [entries, setEntries] = useState<readonly SeoHistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    void storeFor(kind)
      .load()
      .then((loadedEntries) => {
        if (!cancelled) {
          setEntries(loadedEntries);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const add = useCallback(
    (entry: SeoHistoryEntry) => {
      void storeFor(kind)
        .add(entry)
        .then(setEntries)
        .catch(() => undefined);
    },
    [kind],
  );

  const clear = useCallback(() => {
    void storeFor(kind)
      .clear()
      .then(() => setEntries([]))
      .catch(() => undefined);
  }, [kind]);

  return { entries, loaded, add, clear };
}
