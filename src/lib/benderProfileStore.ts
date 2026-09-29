/**
 * BenderProfile 仓库（P0-2）：userProfiles + activeId 全局单例，
 * AsyncStorage + 进程内缓存 + listeners（仿 benderSpecStore.ts）。
 *
 * 只持久化用户档案（custom / calibrated）；内置 Standard 预设每次实时生成。
 * 首次加载若无档案存储但有旧数据，自动迁移（见 profile.migrateLegacyProfiles）。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { defaultBenderSpec, specKey } from '../calculators/geometry/benderSpecs.ts';
import type { BenderSpec } from '../constants.ts';
import { parseCustomSpecs } from './customSpecsStore.ts';
import type { HistoryStorage } from './historyStore.ts';
import {
  isCalibratedProfile,
  migrateLegacyProfiles,
  profileSpecKey,
  profileToSpec,
  specToProfile,
  standardProfileId,
  standardProfiles,
  type BenderProfile,
} from './profile.ts';

/** 新档案存储键。 */
export const PROFILE_STORAGE_KEY = 'bendcalc:bender-profiles:v1';
/** 旧单规格键（保留不删，可回滚）。 */
export const LEGACY_SPEC_STORAGE_KEY = '@cbc:bender-spec-v1';
/** 旧 Custom 列表键（保留不删，可回滚）。 */
export const LEGACY_CUSTOM_SPECS_KEY = 'bendcalc:customSpecs:v1';

export interface ProfileState {
  version: 1;
  userProfiles: BenderProfile[];
  activeId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isValidProfile(value: unknown): value is BenderProfile {
  if (!isRecord(value)) {
    return false;
  }
  const source = value.source;
  return (
    typeof value.id === 'string' &&
    value.id !== '' &&
    typeof value.name === 'string' &&
    value.name !== '' &&
    (source === 'custom' || source === 'calibrated') &&
    typeof value.bendRadius === 'number' &&
    Number.isFinite(value.bendRadius) &&
    value.bendRadius > 0 &&
    typeof value.takeUp === 'number' &&
    Number.isFinite(value.takeUp) &&
    value.takeUp > 0 &&
    (value.nominalDeduct === null || typeof value.nominalDeduct === 'number') &&
    (value.actualDeduct === null || typeof value.actualDeduct === 'number') &&
    (value.calibrationOffset === undefined ||
      (typeof value.calibrationOffset === 'number' &&
        Number.isFinite(value.calibrationOffset)))
  );
}

/** 解析档案存储，非法/损坏返回 null（由调用方决定迁移或默认）。 */
export function parseProfileState(raw: string | null): ProfileState | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) {
      return null;
    }
    const userProfiles = Array.isArray(parsed.userProfiles)
      ? parsed.userProfiles.filter(isValidProfile).map((profile) => ({
          ...profile,
          calibrationOffset:
            typeof profile.calibrationOffset === 'number' ? profile.calibrationOffset : 0,
          calibrationDate: profile.calibrationDate ?? null,
          gain: profile.gain ?? null,
        }))
      : [];
    if (typeof parsed.activeId !== 'string' || parsed.activeId === '') {
      return null;
    }
    return { version: 1, userProfiles, activeId: parsed.activeId };
  } catch {
    return null;
  }
}

export function serializeProfileState(state: ProfileState): string {
  return JSON.stringify(state);
}

/** 全部档案 = 内置 Standard 预设 + 用户档案。 */
export function allProfiles(userProfiles: readonly BenderProfile[]): BenderProfile[] {
  return [...standardProfiles(), ...userProfiles];
}

function defaultActiveId(): string {
  return standardProfileId(defaultBenderSpec());
}

function parseLegacySpec(raw: string | null): BenderSpec | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }
    if (
      typeof parsed.brand === 'string' &&
      typeof parsed.conduit === 'string' &&
      typeof parsed.centerlineRadius === 'number' &&
      Number.isFinite(parsed.centerlineRadius) &&
      parsed.centerlineRadius > 0 &&
      typeof parsed.takeUp === 'number' &&
      Number.isFinite(parsed.takeUp) &&
      parsed.takeUp > 0
    ) {
      return parsed as unknown as BenderSpec;
    }
    return null;
  } catch {
    return null;
  }
}

/** 从旧键读取并迁移；无旧数据返回 null。 */
export async function loadMigratedState(
  storage: HistoryStorage,
): Promise<ProfileState | null> {
  const legacySpec = parseLegacySpec(await storage.getItem(LEGACY_SPEC_STORAGE_KEY));
  const customRaw = await storage.getItem(LEGACY_CUSTOM_SPECS_KEY);
  const customSpecs = parseCustomSpecs(customRaw);
  if (!legacySpec && customSpecs.length === 0) {
    return null;
  }
  const userProfiles = migrateLegacyProfiles(legacySpec, customSpecs);
  return {
    version: 1,
    userProfiles,
    activeId: userProfiles[0]?.id ?? defaultActiveId(),
  };
}

async function loadInitialState(storage: HistoryStorage): Promise<ProfileState> {
  const raw = await storage.getItem(PROFILE_STORAGE_KEY);
  const parsed = parseProfileState(raw);
  if (parsed) {
    return parsed;
  }
  const migrated = await loadMigratedState(storage);
  if (migrated) {
    try {
      await storage.setItem(PROFILE_STORAGE_KEY, serializeProfileState(migrated));
    } catch {
      // 迁移落盘失败不影响本次使用。
    }
    return migrated;
  }
  return { version: 1, userProfiles: [], activeId: defaultActiveId() };
}

/* ---------- 全局单例 ---------- */

const storage: HistoryStorage = AsyncStorage;

let cachedState: ProfileState | null = null;
let loadPromise: Promise<ProfileState> | null = null;
const listeners = new Set<(state: ProfileState) => void>();

function notify(state: ProfileState): void {
  for (const listener of listeners) {
    listener(state);
  }
}

function persist(state: ProfileState): void {
  cachedState = state;
  notify(state);
  void storage.setItem(PROFILE_STORAGE_KEY, serializeProfileState(state)).catch(() => undefined);
}

async function ensureLoaded(): Promise<ProfileState> {
  if (cachedState) {
    return cachedState;
  }
  if (!loadPromise) {
    loadPromise = loadInitialState(storage).then((state) => {
      if (!cachedState) {
        cachedState = state;
      }
      return cachedState;
    });
  }
  return loadPromise;
}

/** 当前内存快照（可能尚未加载完成，返回 null）。 */
export function getProfileState(): ProfileState | null {
  return cachedState;
}

export function setActiveProfile(id: string): void {
  const state = cachedState;
  if (!state || state.activeId === id) {
    return;
  }
  persist({ ...state, activeId: id });
}

/** 新增或按 id / 名称覆盖一条用户档案。 */
export function upsertProfile(profile: BenderProfile): void {
  const state = cachedState ?? {
    version: 1 as const,
    userProfiles: [],
    activeId: defaultActiveId(),
  };
  const rest = state.userProfiles.filter(
    (item) => item.id !== profile.id && item.name !== profile.name,
  );
  persist({ ...state, userProfiles: [profile, ...rest] });
}

export function removeProfile(id: string): void {
  const state = cachedState;
  if (!state) {
    return;
  }
  const userProfiles = state.userProfiles.filter((item) => item.id !== id);
  const activeId = state.activeId === id ? defaultActiveId() : state.activeId;
  persist({ ...state, userProfiles, activeId });
}

/** Expected→Actual / Guided Calibration 落点：更新累积校正量。 */
export function setProfileCalibrationOffset(id: string, offset: number, now: number): void {
  const state = cachedState;
  if (!state) {
    return;
  }
  const userProfiles = state.userProfiles.map((item) =>
    item.id === id ? { ...item, calibrationOffset: offset, calibrationDate: now } : item,
  );
  persist({ ...state, userProfiles });
}

export interface UseBenderProfilesResult {
  profiles: BenderProfile[];
  userProfiles: BenderProfile[];
  activeProfile: BenderProfile;
  ready: boolean;
  setActive: (id: string) => void;
  upsert: (profile: BenderProfile) => void;
  remove: (id: string) => void;
}

export function useBenderProfiles(): UseBenderProfilesResult {
  const [state, setState] = useState<ProfileState | null>(() => cachedState);
  const [ready, setReady] = useState(cachedState !== null);

  useEffect(() => {
    let cancelled = false;
    const listener = (next: ProfileState) => {
      if (!cancelled) {
        setState(next);
      }
    };
    listeners.add(listener);
    void ensureLoaded()
      .then((value) => {
        if (!cancelled) {
          setState(value);
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
      listeners.delete(listener);
    };
  }, []);

  const current =
    state ?? { version: 1 as const, userProfiles: [] as BenderProfile[], activeId: defaultActiveId() };
  const profiles = allProfiles(current.userProfiles);
  const activeProfile =
    profiles.find((profile) => profile.id === current.activeId) ??
    profiles.find((profile) => profile.id === defaultActiveId()) ??
    profiles[0];

  const setActive = useCallback((id: string) => setActiveProfile(id), []);
  const upsert = useCallback((profile: BenderProfile) => upsertProfile(profile), []);
  const remove = useCallback((id: string) => removeProfile(id), []);

  return { profiles, userProfiles: current.userProfiles, activeProfile, ready, setActive, upsert, remove };
}

/** 选中档案对应的计算引擎规格。 */
export function activeSpec(activeProfile: BenderProfile): BenderSpec {
  return profileToSpec(activeProfile);
}

/** 按 specKey 选中已有档案；找不到则 upsert 为 custom 并选中。 */
export function selectSpecByValue(spec: BenderSpec): void {
  const state = cachedState;
  const key = specKey(spec);
  const candidates = allProfiles(state?.userProfiles ?? []);
  const match = candidates.find((profile) => profileSpecKey(profile) === key);
  if (match) {
    setActiveProfile(match.id);
    return;
  }
  const profile = specToProfile(spec, { source: 'custom' });
  upsertProfile(profile);
  setActiveProfile(profile.id);
}

export { isCalibratedProfile };
export { profileToSpec, specToProfile } from './profile.ts';
