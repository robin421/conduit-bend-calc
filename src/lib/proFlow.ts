import type { ConduitType } from './profile.ts';

export type BendScreen = 'Offset' | 'Stub' | 'ThreePointSaddle' | 'FourPointSaddle' | 'RollingOffset' | 'Kicked90';
export type ProIntent =
  | { kind: 'calibration' }
  | { kind: 'feasibility'; screen: BendScreen }
  | { kind: 'history' }
  | { kind: 'export' }
  | { kind: 'bender'; conduitTypeFilter?: ConduitType };
export type ProScene = 'calibration' | 'feasibility' | 'history';
export type PurchasePhase = 'idle' | 'loading' | 'purchasing' | 'pending' | 'restoring' | 'cancelled' | 'error' | 'purchased' | 'restored';

export const PRO_SCENES: readonly { key: ProScene; label: string; title: string; description: string }[] = [
  { key: 'calibration', label: 'My bender', title: 'Match the app to your actual bender', description: 'One test bend helps you use your own take-up instead of the standard value.' },
  { key: 'feasibility', label: 'Bend options', title: 'Find a workable bend before cutting', description: 'See straight-length checks and available alternatives for your current layout.' },
  { key: 'history', label: 'History & export', title: 'Keep recent bends ready for the next job', description: 'View your latest 20 bends and share a text copy with your crew.' },
];

const SOURCE_SCREENS: Record<string, BendScreen> = {
  offset: 'Offset', stub: 'Stub', three_point_saddle: 'ThreePointSaddle',
  four_point_saddle: 'FourPointSaddle', rolling_offset: 'RollingOffset', kicked_90: 'Kicked90',
};

/** 外部深链中的未知来源不作为任意文本上报。 */
export function normalizeProSource(source: string): string {
  const known = ['direct', 'pending_resume', 'history_export', 'history_limit', 'bender_picker', 'calc_home_guidedcalibration', 'calc_home_calibration'];
  if (known.includes(source)) return source;
  for (const prefix of Object.keys(SOURCE_SCREENS)) {
    if (source === `${prefix}_calibration` || source === `${prefix}_feasibility`) return source;
  }
  return 'direct';
}

/** 兼容已发布入口的 triggerSource，新入口优先传入显式 intent。 */
export function proIntentForSource(source: string): ProIntent {
  if (source === 'history_export') return { kind: 'export' };
  if (source === 'history_limit') return { kind: 'history' };
  if (source === 'bender_picker') return { kind: 'bender' };
  if (source.endsWith('_feasibility')) {
    const screen = SOURCE_SCREENS[source.slice(0, -'_feasibility'.length)];
    if (screen) return { kind: 'feasibility', screen };
  }
  return { kind: 'calibration' };
}

export function sceneForIntent(intent: ProIntent): ProScene {
  if (intent.kind === 'feasibility') return 'feasibility';
  if (intent.kind === 'history' || intent.kind === 'export') return 'history';
  return 'calibration';
}

export function proContinueLabel(intent: ProIntent): string {
  switch (intent.kind) {
    case 'calibration': return 'Start bender calibration';
    case 'feasibility': return 'See my bend alternatives';
    case 'history': return 'View my recent bends';
    case 'export': return 'Export my recent bends';
    case 'bender': return 'Continue adding my bender';
  }
}

/** 仅保存后续任务类别，不保存计算输入、付款 token 或收据。 */
export function parseProIntent(raw: string | null): ProIntent | null {
  try {
    const value = JSON.parse(raw ?? 'null') as ProIntent | null;
    if (!value || typeof value !== 'object') return null;
    if (value.kind === 'calibration' || value.kind === 'history' || value.kind === 'export') return { kind: value.kind };
    if (value.kind === 'bender') return value.conduitTypeFilter === 'Rigid' || value.conduitTypeFilter === 'EMT'
      ? { kind: 'bender', conduitTypeFilter: value.conduitTypeFilter } : { kind: 'bender' };
    if (value.kind === 'feasibility' && Object.values(SOURCE_SCREENS).includes(value.screen)) return { kind: 'feasibility', screen: value.screen };
    return null;
  } catch { return null; }
}

export function purchaseBusy(phase: PurchasePhase): boolean {
  return phase === 'loading' || phase === 'purchasing' || phase === 'restoring' || phase === 'pending';
}
