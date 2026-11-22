import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProPaywallView from '../components/proPaywallView';
import { useI18n } from '../i18n';
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
import {
  buildPaywallBuyTapParams,
  buildPaywallDismissParams,
  buildPaywallRetryTapParams,
  buildPaywallSkuLoadedParams,
  buildPaywallViewedExtra,
  isPaywallSkuPending,
  shouldEmitPaywallDismiss,
  shouldEmitPaywallSkuLoaded,
} from '../lib/paywallTelemetry';
import type { CalcStackParamList } from '../navigation/calcStack';

type Props = NativeStackScreenProps<CalcStackParamList, 'Paywall'>;

export default function PaywallScreen({ route, navigation }: Props) {
  const { t } = useI18n();
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
  const dismissedRef = useRef(false);
  const skuLoadedReportedRef = useRef(false);
  const sawPendingOrUnknownRef = useRef(isPaywallSkuPending(getCurrentProState()));
  const sceneRef = useRef<ProScene>(scene);
  sceneRef.current = scene;
  const taskIdRef = useRef<string | undefined>(route.params?.pendingTaskId);

  useEffect(() => {
    suspendReviewForSession();
    if (!impressionRef.current) {
      const current = getCurrentProState();
      impressionRef.current = true;
      logFirebaseProPaywallViewed(
        source,
        buildPaywallViewedExtra({
          scene: sceneRef.current,
          skuAvailability: current.skuAvailability,
          productPrice: current.productPrice,
        }),
      );
      trackEvent('pro_paywall_viewed', { trigger_source: source });
    }
    if (Platform.OS !== 'web' && (!getCurrentProState().initialized || !getCurrentProState().productPrice)) {
      void refreshProIap().catch(() => undefined);
    }
  }, [source]);

  useEffect(() => {
    if (state.phase === 'loading' || state.skuAvailability === 'unknown') {
      sawPendingOrUnknownRef.current = true;
      return;
    }
    if (
      shouldEmitPaywallSkuLoaded({
        alreadyReported: skuLoadedReportedRef.current,
        sawPendingOrUnknown: sawPendingOrUnknownRef.current,
        snapshot: state,
      })
    ) {
      skuLoadedReportedRef.current = true;
      trackGrowthEvent(
        'pro_paywall_sku_loaded',
        buildPaywallSkuLoadedParams({
          source,
          scene: sceneRef.current,
          skuAvailability: state.skuAvailability,
          productPrice: state.productPrice,
        }),
      );
    }
  }, [source, state]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      const current = getCurrentProState();
      if (shouldEmitPaywallDismiss({ alreadyDismissed: dismissedRef.current, access: current.access })) {
        dismissedRef.current = true;
        trackGrowthEvent(
          'pro_paywall_dismissed',
          buildPaywallDismissParams({
            source,
            scene: sceneRef.current,
            skuAvailability: current.skuAvailability,
            dismissMethod: 'back',
          }),
        );
      }
    });
    return unsubscribe;
  }, [navigation, source]);

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
      setLocalError(error instanceof Error ? error.message : t('paywall.actionError'));
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
    onBuy={() => {
      const current = getCurrentProState();
      trackGrowthEvent(
        'pro_buy_tapped',
        buildPaywallBuyTapParams({
          source,
          scene,
          skuAvailability: current.skuAvailability,
          productPrice: current.productPrice,
        }),
      );
      void perform('buy');
    }}
    onRestore={() => { void perform('restore'); }}
    onRetry={() => {
      const current = getCurrentProState();
      trackGrowthEvent(
        'pro_retry_tapped',
        buildPaywallRetryTapParams({
          source,
          scene,
          skuAvailability: current.skuAvailability,
        }),
      );
      void perform('retry');
    }}
    onContinue={() => { void perform('continue'); }}
    onClose={() => {
      const current = getCurrentProState();
      if (shouldEmitPaywallDismiss({ alreadyDismissed: dismissedRef.current, access: current.access })) {
        dismissedRef.current = true;
        trackGrowthEvent(
          'pro_paywall_dismissed',
          buildPaywallDismissParams({
            source,
            scene,
            skuAvailability: current.skuAvailability,
            dismissMethod: 'button',
          }),
        );
      }
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('CalcHome');
    }}
  />;
}
