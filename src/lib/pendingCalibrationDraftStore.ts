/**
 * 本地待保存校准草稿仓库（Value-First Try-Before-Buy）。
 *
 * 隐私与存储边界：
 * - 严格仅存本地内存 + AsyncStorage（@cbc:pending-calibration-draft-v1），绝不上传任何数值、管径或档案名称。
 * - 默认有效期 24 小时，过期自动清理并返回 null。
 * - `deltaBucket` 提供无 PII 离散分桶，供埋点安全上报偏差量级。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BenderSpec } from '../constants.ts';
import type { HistoryStorage } from './historyStore.ts';
import type { BenderProfile } from './profile.ts';
import { formatLength, type UnitSystem } from './units.ts';

export const PENDING_CALIBRATION_DRAFT_KEY = '@cbc:pending-calibration-draft-v1';
export const PENDING_CALIBRATION_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type CalibrationDraftMode = 'guided' | 'manual';
export type DeltaBucket = 'zero' | 'small' | 'medium' | 'large';

export interface PendingCalibrationDraft {
  mode: CalibrationDraftMode;
  baseTakeUp: number;
  measuredTakeUp: number;
  deltaInches: number;
  profileName: string;
  profile?: BenderProfile;
  spec?: BenderSpec;
  entrySource: string;
  createdAt: number;
}

export interface PendingCalibrationDraftStore {
  save(draft: PendingCalibrationDraft): Promise<void>;
  load(): Promise<PendingCalibrationDraft | null>;
  clear(): Promise<void>;
  getCached(): PendingCalibrationDraft | null;
}

const EPSILON = 1e-9;

/**
 * 无 PII 离散分桶：
 * |Δ| === 0 → 'zero'，≤ 0.125" → 'small'，≤ 0.25" → 'medium'，> 0.25" → 'large'。
 */
export function deltaBucket(deltaInches: number): DeltaBucket {
  if (!Number.isFinite(deltaInches)) {
    return 'zero';
  }
  const abs = Math.abs(deltaInches);
  if (abs <= EPSILON) {
    return 'zero';
  }
  if (abs <= 0.125 + EPSILON) {
    return 'small';
  }
  if (abs <= 0.25 + EPSILON) {
    return 'medium';
  }
  return 'large';
}

/** 格式化带符号的偏差值（如 `+3/8"`、`−1/8"`、`+3.2 mm`、`0"`）。 */
export function formatSignedDelta(deltaInches: number, unit: UnitSystem): string {
  if (!Number.isFinite(deltaInches) || Math.abs(deltaInches) <= 1e-6) {
    return formatLength(0, unit);
  }
  const sign = deltaInches > 0 ? '+' : '−';
  return `${sign}${formatLength(Math.abs(deltaInches), unit)}`;
}

/** 计算同目标 stub 高度下的标准标记与实测标记对比（确保标记点始终为正值）。 */
export function computeTakeUpComparison(
  baseTakeUp: number,
  measuredTakeUp: number,
  preferredTargetStub = 12,
): {
  targetStub: number;
  standardMark: number;
  personalMark: number;
  deltaInches: number;
} | null {
  if (
    !Number.isFinite(baseTakeUp) ||
    baseTakeUp <= 0 ||
    !Number.isFinite(measuredTakeUp) ||
    measuredTakeUp <= 0
  ) {
    return null;
  }
  const maxTakeUp = Math.max(baseTakeUp, measuredTakeUp);
  const targetStub =
    maxTakeUp < preferredTargetStub
      ? preferredTargetStub
      : Math.ceil(maxTakeUp + 4);
  const standardMark = targetStub - baseTakeUp;
  const personalMark = targetStub - measuredTakeUp;
  if (standardMark <= 0 || personalMark <= 0) {
    return null;
  }
  return {
    targetStub,
    standardMark,
    personalMark,
    deltaInches: measuredTakeUp - baseTakeUp,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidDraftProfile(value: unknown): value is BenderProfile {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    (value.source === 'calibrated' || value.source === 'custom') &&
    isPositiveFinite(value.bendRadius) &&
    isPositiveFinite(value.takeUp)
  );
}

function isValidDraftSpec(value: unknown): value is BenderSpec {
  if (!isRecord(value)) return false;
  return (
    typeof value.brand === 'string' &&
    value.brand.trim().length > 0 &&
    typeof value.conduit === 'string' &&
    value.conduit.trim().length > 0 &&
    isPositiveFinite(value.centerlineRadius) &&
    isPositiveFinite(value.takeUp)
  );
}

export function isValidPendingCalibrationDraft(value: unknown): value is PendingCalibrationDraft {
  if (!isRecord(value)) return false;
  const mode = value.mode;
  if (mode !== 'guided' && mode !== 'manual') return false;
  if (
    !isPositiveFinite(value.baseTakeUp) ||
    !isPositiveFinite(value.measuredTakeUp) ||
    typeof value.deltaInches !== 'number' ||
    !Number.isFinite(value.deltaInches) ||
    typeof value.profileName !== 'string' ||
    value.profileName.trim().length === 0 ||
    typeof value.entrySource !== 'string' ||
    !isPositiveFinite(value.createdAt)
  ) {
    return false;
  }
  if (mode === 'guided') {
    return isValidDraftProfile(value.profile);
  }
  return isValidDraftSpec(value.spec);
}

export function isDraftExpired(
  draft: PendingCalibrationDraft,
  currentTime: number,
  ttlMs = PENDING_CALIBRATION_DRAFT_TTL_MS,
): boolean {
  return currentTime - draft.createdAt > ttlMs;
}

export function parsePendingCalibrationDraft(
  raw: string | null,
): PendingCalibrationDraft | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidPendingCalibrationDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function createPendingCalibrationDraftStore(
  storage: HistoryStorage,
  now: () => number = Date.now,
): PendingCalibrationDraftStore {
  let cached: PendingCalibrationDraft | null | undefined;
  let writes: Promise<void> = Promise.resolve();

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = writes.then(operation);
    writes = next.then(() => undefined, () => undefined);
    return next;
  }

  async function removeStored(): Promise<void> {
    try {
      await storage.removeItem(PENDING_CALIBRATION_DRAFT_KEY);
    } catch {
      /* local cleanup failure is non-fatal */
    }
  }

  function resolveFresh(draft: PendingCalibrationDraft | null): {
    draft: PendingCalibrationDraft | null;
    expired: boolean;
  } {
    if (!draft) return { draft: null, expired: false };
    if (isDraftExpired(draft, now())) {
      return { draft: null, expired: true };
    }
    return { draft, expired: false };
  }

  return {
    save(draft: PendingCalibrationDraft): Promise<void> {
      if (!isValidPendingCalibrationDraft(draft)) {
        return Promise.resolve();
      }
      cached = draft;
      return serialize(async () => {
        try {
          await storage.setItem(PENDING_CALIBRATION_DRAFT_KEY, JSON.stringify(draft));
        } catch {
          /* in-memory draft remains usable for the active session */
        }
      });
    },

    async load(): Promise<PendingCalibrationDraft | null> {
      await writes;
      if (cached !== undefined) {
        const checked = resolveFresh(cached);
        if (checked.expired) {
          cached = null;
          await serialize(removeStored);
        }
        return checked.draft;
      }
      let parsed: PendingCalibrationDraft | null = null;
      try {
        parsed = parsePendingCalibrationDraft(
          await storage.getItem(PENDING_CALIBRATION_DRAFT_KEY),
        );
      } catch {
        parsed = null;
      }
      const checked = resolveFresh(parsed);
      if (checked.expired) {
        cached = null;
        await serialize(removeStored);
        return null;
      }
      if (cached === undefined) {
        cached = checked.draft;
      }
      return cached;
    },

    clear(): Promise<void> {
      cached = null;
      return serialize(removeStored);
    },

    getCached(): PendingCalibrationDraft | null {
      if (!cached) return null;
      if (isDraftExpired(cached, now())) {
        cached = null;
        void serialize(removeStored);
        return null;
      }
      return cached;
    },
  };
}

export interface ApplyCalibrationDraftDeps {
  loadDraft: () => Promise<PendingCalibrationDraft | null>;
  clearDraft: () => Promise<void>;
  ensureProfilesLoaded: () => Promise<unknown>;
  applyGuidedProfile: (profile: BenderProfile) => void;
  applyManualSpec: (spec: BenderSpec, profileName: string) => void;
  trackAutoApplied: (source: string, mode: CalibrationDraftMode) => void;
  trackCalibrated: (source: 'guided' | 'manual') => void;
  showToast: (profileName: string) => void;
}

/**
 * 购后自动保存并激活本地待保存校准草稿：
 * - guided：写入 calibrated 档案并激活
 * - manual：写入 custom 档案、激活并同步 benderSpecStore
 * 返回已应用的草稿（无草稿或已过期返回 null）。
 */
export async function applyPendingCalibrationDraft(
  deps: ApplyCalibrationDraftDeps,
): Promise<PendingCalibrationDraft | null> {
  const draft = await deps.loadDraft();
  if (!draft) {
    return null;
  }
  await deps.ensureProfilesLoaded();
  if (draft.mode === 'guided' && draft.profile) {
    deps.applyGuidedProfile(draft.profile);
    deps.trackAutoApplied(draft.entrySource, 'guided');
    deps.trackCalibrated('guided');
  } else if (draft.mode === 'manual' && draft.spec) {
    deps.applyManualSpec(draft.spec, draft.profileName);
    deps.trackAutoApplied(draft.entrySource, 'manual');
    deps.trackCalibrated('manual');
  } else {
    return null;
  }
  await deps.clearDraft();
  deps.showToast(draft.profileName);
  return draft;
}

const CALIBRATION_TRANSIENT_ROUTES = new Set(['Paywall', 'GuidedCalibration', 'Calibration']);

/** 计算购后自动应用草稿后应退回的栈深度（跳过校准向导与付费墙，直达原计算器或首页）。 */
export function computePostCalibrationPopCount(
  routeNames: readonly string[],
  currentIndex: number,
): number | null {
  for (let i = currentIndex - 1; i >= 0; i -= 1) {
    const name = routeNames[i];
    if (name && !CALIBRATION_TRANSIENT_ROUTES.has(name)) {
      return currentIndex - i;
    }
  }
  return null;
}

const defaultStore = createPendingCalibrationDraftStore(AsyncStorage);

export const savePendingCalibrationDraft = defaultStore.save;
export const loadPendingCalibrationDraft = defaultStore.load;
export const clearPendingCalibrationDraft = defaultStore.clear;
export const getCachedPendingCalibrationDraft = defaultStore.getCached;
