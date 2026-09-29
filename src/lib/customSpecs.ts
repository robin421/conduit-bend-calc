import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BenderSpec } from '../constants.ts';
import {
  createCustomSpecsStore,
  CUSTOM_SPECS_STORAGE_KEY,
} from './customSpecsStore';
import {
  specToProfile,
  profileToSpec,
  useBenderProfiles,
} from './benderProfileStore';
import { upsertProfile } from './benderProfileStore';

export { CUSTOM_SPECS_STORAGE_KEY } from './customSpecsStore';
export type { CustomSpecsStore } from './customSpecsStore';

const store = createCustomSpecsStore(AsyncStorage);

/** 读取全部 Custom 规格（旧存储，仅迁移用；最新在前）。 */
export function loadCustomSpecs(): Promise<BenderSpec[]> {
  return store.load();
}

/** 新增或按 customName 覆盖一条 Custom 规格（旧存储，仅迁移用）。 */
export function saveCustomSpec(spec: BenderSpec): Promise<BenderSpec[]> {
  return store.upsert(spec);
}

/**
 * My Bender 列表 hook（P0-2）：由 BenderProfile 仓库的用户档案驱动，
 * 对 BenderPicker 暴露 BenderSpec 形状。addSpec 会 upsert 为 custom 档案。
 */
export function useCustomSpecs(): {
  specs: BenderSpec[];
  ready: boolean;
  addSpec: (spec: BenderSpec) => Promise<void>;
} {
  const { userProfiles, ready } = useBenderProfiles();
  const specs = userProfiles.map(profileToSpec);
  return {
    specs,
    ready,
    addSpec: async (spec: BenderSpec) => {
      upsertProfile(specToProfile(spec, { source: 'custom' }));
    },
  };
}
