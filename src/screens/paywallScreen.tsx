import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProPaywallView from '../components/proPaywallView';
import { buyPro, clearProError, getCurrentProState, refreshProIap, restorePro, useProAccess } from '../lib/proStore';
import { GOOGLE_PLAY_URL } from '../lib/homeContent';
import { trackEvent } from '../lib/analytics';
import { trackGrowthEvent } from '../lib/growth';
import { logFirebaseProPaywallViewed } from '../lib/firebase';
import { normalizeProSource, proIntentForSource, sceneForIntent, type ProScene } from '../lib/proFlow';
import { beginPendingProTask, clearPendingProTask } from '../lib/pendingProIntent';
import { continueProTask } from '../lib/proContinuation';
import { useUnitSystem } from '../lib/unitStore';
import { suspendReviewForSession } from '../lib/inAppReview';
import { createProActionGuard, type ProAction } from '../lib/proActionGuard';
import type { CalcStackParamList } from '../navigation/calcStack';

type Props = NativeStackScreenProps<CalcStackParamList, 'Paywall'>;

export default function PaywallScreen({ route, navigation }: Props) {
  const state = useProAccess();
  const insets = useSafeAreaInsets();
  const { unit } = useUnitSystem();
  const source = normalizeProSource(route.params?.triggerSource ?? 'direct');
  const intent = route.params?.intent ?? proIntentForSource(source);
  const [scene, setScene] = useState<ProScene>(() => sceneForIntent(intent));
  const [actions, setActions] = useState<ReadonlySet<ProAction>>(new Set());
  const [localError, setLocalError] = useState<string | null>(null);
  const running = useRef(createProActionGuard());
  const impressionRef = useRef(false);
  const taskIdRef = useRef<string | undefined>(route.params?.pendingTaskId);

  useEffect(() => {
    suspendReviewForSession();
    if (!impressionRef.current) {
      impressionRef.current = true;
      logFirebaseProPaywallViewed(source);
      trackEvent('pro_paywall_viewed', { trigger_source: source });
    }
    if (Platform.OS !== 'web' && (!getCurrentProState().initialized || !getCurrentProState().productPrice)) {
      void refreshProIap().catch(() => undefined);
    }
  }, [source]);

  async function perform(kind: ProAction): Promise<void> {
    if (!running.current.begin(kind)) return;
    setActions(running.current.snapshot());
    let failed = false;
    setLocalError(null);
    try {
      if (kind === 'continue') {
        await continueProTask(navigation, intent, taskIdRef.current);
      } else if (kind === 'buy' && Platform.OS === 'web') {
        trackEvent('google_play_click', { source: 'pro_preview', scene });
        await Linking.openURL(GOOGLE_PLAY_URL);
      } else if (kind === 'buy') {
        clearProError();
        const { task, persisted } = beginPendingProTask(intent);
        taskIdRef.current = task.id;
        await persisted;
        if (!navigation.isFocused()) { await clearPendingProTask(task.id); return; }
        const result = await buyPro({ source, scene });
        if (!result.ok && !getCurrentProState().pendingPurchase && getCurrentProState().access !== 'unlocked') await clearPendingProTask(task.id);
      } else if (kind === 'restore') {
        clearProError();
        const { task, persisted } = beginPendingProTask(intent);
        taskIdRef.current = task.id;
        await persisted;
        if (!navigation.isFocused()) { await clearPendingProTask(task.id); return; }
        const result = await restorePro();
        if (!result.found) await clearPendingProTask(task.id);
      } else {
        await refreshProIap();
      }
    } catch (error) {
      failed = true;
      setLocalError(error instanceof Error ? error.message : 'Unable to complete this action. Please try again.');
    } finally {
      running.current.end(kind, failed);
      setActions(running.current.snapshot());
    }
  }

  return <ProPaywallView
    scene={scene}
    intent={intent}
    unit={unit}
    phase={actions.has('buy') && state.phase === 'idle' ? 'loading' : state.phase}
    unlocked={Platform.OS !== 'web' && state.access === 'unlocked'}
    available={state.skuAvailability === 'available'}
    price={state.productPrice}
    error={localError ?? state.lastError}
    isWeb={Platform.OS === 'web'}
    continuing={actions.has('continue')}
    checking={actions.has('retry')}
    bottomInset={insets.bottom}
    onSceneChange={(next) => { setScene(next); trackGrowthEvent('pro_preview_changed', { scene: next, source }); }}
    onBuy={() => { void perform('buy'); }}
    onRestore={() => { void perform('restore'); }}
    onRetry={() => { void perform('retry'); }}
    onContinue={() => { void perform('continue'); }}
    onClose={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('CalcHome')}
  />;
}
