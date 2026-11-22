import { Share } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { getLang, translate } from '../i18n';
import type { CalcStackParamList } from '../navigation/calcStack';
import type { RootTabParamList } from '../navigation/rootTabs';
import { showAppToast } from './appToast';
import {
  loadBenderProfiles,
  setActiveProfile,
  specToProfile,
  upsertProfile,
} from './benderProfileStore';
import { saveBenderSpec } from './benderSpecStore';
import { formatHistoryTime, loadHistory } from './history';
import {
  applyPendingCalibrationDraft,
  clearPendingCalibrationDraft,
  computePostCalibrationPopCount,
  loadPendingCalibrationDraft,
} from './pendingCalibrationDraftStore';
import { clearPendingProTask } from './pendingProIntent';
import { getCurrentProAccess } from './proStore';
import type { ProIntent } from './proFlow';
import { trackGrowthEvent } from './growth';
import { exportHistoryWhenActive } from './historyExport';

export function exportRecentHistory(isActive = () => true): Promise<boolean> {
  return exportHistoryWhenActive({
    isUnlocked: () => getCurrentProAccess() === 'unlocked', isActive,
    readText: async () => (await loadHistory()).map((e) => `[${formatHistoryTime(e.timestamp)}] ${e.title} - ${e.inputSummary} => ${e.resultSummary}`).join('\n'),
    share: async (message) => { await Share.share({ title: 'Conduit Bend History Export', message }); },
  });
}

/** 仅由用户明确点击成功页或首页继续按钮调用，不在购买回调中自动执行。 */
export async function continueProTask(
  navigation: NativeStackNavigationProp<CalcStackParamList>, intent: ProIntent, taskId?: string,
): Promise<void> {
  if (getCurrentProAccess() !== 'unlocked') throw new Error('Your Pro purchase is not complete yet.');
  trackGrowthEvent('pro_next_step_started', { action: intent.kind });
  if (intent.kind === 'export' && !await exportRecentHistory(() => navigation.isFocused())) return;
  if (taskId) await clearPendingProTask(taskId);
  if (!navigation.isFocused()) return;
  const state = navigation.getState();
  const previous = state.routes[state.index - 1]?.name;
  switch (intent.kind) {
    case 'calibration': {
      const applied = await applyPendingCalibrationDraft({
        loadDraft: loadPendingCalibrationDraft,
        clearDraft: clearPendingCalibrationDraft,
        ensureProfilesLoaded: loadBenderProfiles,
        applyGuidedProfile: (profile) => {
          upsertProfile(profile);
          setActiveProfile(profile.id);
        },
        applyManualSpec: (spec, profileName) => {
          const profile = specToProfile(spec, {
            source: 'custom',
            id: `custom|${spec.customName ?? profileName}`,
            name: spec.customName ?? profileName,
          });
          upsertProfile(profile);
          setActiveProfile(profile.id);
          saveBenderSpec(spec);
        },
        trackAutoApplied: (source, mode) => {
          trackGrowthEvent('calibration_draft_auto_applied', { source, mode });
        },
        trackCalibrated: (source) => {
          trackGrowthEvent('bender_calibrated', { source });
        },
        showToast: (profileName) => {
          showAppToast(translate(getLang(), 'calibration.draftAppliedToast', { name: profileName }));
        },
      });
      if (!navigation.isFocused()) return;
      if (applied) {
        const popCount = computePostCalibrationPopCount(
          state.routes.map((route) => route.name),
          state.index,
        );
        if (popCount && popCount > 0) {
          navigation.pop(popCount);
        } else {
          navigation.navigate('CalcHome');
        }
        break;
      }
      navigation.replace('GuidedCalibration');
      break;
    }
    case 'feasibility':
      if (previous === intent.screen) navigation.goBack();
      else navigation.replace(intent.screen);
      break;
    case 'bender':
      if (previous === 'Bender') navigation.goBack();
      else navigation.replace('Bender', { conduitTypeFilter: intent.conduitTypeFilter, createCustom: true });
      break;
    case 'history':
    case 'export':
      if (navigation.canGoBack()) navigation.goBack();
      navigation.getParent<BottomTabNavigationProp<RootTabParamList>>()?.navigate('History');
      break;
  }
}
