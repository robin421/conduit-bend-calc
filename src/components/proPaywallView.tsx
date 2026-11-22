import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { calibrateDeductFromStub } from '../calculators/calibration/calibration';
import { defaultBenderSpec } from '../calculators/geometry/benderSpecs';
import { calculateStubUpMark } from '../calculators/geometry/geometry';
import { offsetFeasibility } from '../calculators/feasibility/feasibility';
import { calculateOffset } from '../calculators/offset/offset';
import { useI18n, type TranslationKey } from '../i18n';
import { HISTORY_LIMIT } from '../lib/historyStore';
import { TEST_BEND_MARK } from '../lib/guidedCalibrationFlow';
import { formatLength, type UnitSystem } from '../lib/units';
import { PRO_SCENES, purchaseBusy, type ProIntent, type ProScene, type PurchasePhase } from '../lib/proFlow';
import { useTheme } from '../theme';
import BigButton from './bigButton';
import Card from './card';

export interface ProPaywallViewProps {
  scene: ProScene;
  intent: ProIntent;
  phase: PurchasePhase;
  unlocked: boolean;
  price: string | null;
  available: boolean;
  isWeb?: boolean;
  error?: string | null;
  continuing?: boolean;
  checking?: boolean;
  bottomInset?: number;
  unit?: UnitSystem;
  onSceneChange(scene: ProScene): void;
  onBuy(): void;
  onRestore(): void;
  onRetry(): void;
  onContinue(): void;
  onClose(): void;
}

const FAQ_KEYS: ReadonlyArray<readonly [TranslationKey, TranslationKey]> = [
  ['paywall.faq1.q', 'paywall.faq1.a'],
  ['paywall.faq2.q', 'paywall.faq2.a'],
  ['paywall.faq3.q', 'paywall.faq3.a'],
  ['paywall.faq4.q', 'paywall.faq4.a'],
];

const SCENE_TITLE_KEYS: Record<ProScene, TranslationKey> = {
  calibration: 'paywall.scene.calibration.title',
  feasibility: 'paywall.scene.feasibility.title',
  history: 'paywall.scene.history.title',
};

const SCENE_TAB_KEYS: Record<ProScene, TranslationKey> = {
  calibration: 'paywall.sceneTab.calibration',
  feasibility: 'paywall.sceneTab.feasibility',
  history: 'paywall.sceneTab.history',
};

const CONTINUE_KEYS: Record<ProIntent['kind'], TranslationKey> = {
  calibration: 'paywall.continue.calibration',
  feasibility: 'paywall.continue.feasibility',
  history: 'paywall.continue.history',
  export: 'paywall.continue.export',
  bender: 'paywall.continue.bender',
};

function Caption({ children }: { children: string }) {
  const theme = useTheme();
  return <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary, lineHeight: 20 }}>{children}</Text>;
}

function ExamplePreview({ scene, unit }: { scene: ProScene; unit: UnitSystem }) {
  const theme = useTheme();
  const { t } = useI18n();
  const base = defaultBenderSpec();
  // Illustrative fixture, not an assumed correction for the user's bender.
  const measured = 17.375;
  const actualTakeUp = calibrateDeductFromStub(TEST_BEND_MARK, measured)!;
  const standardMark = calculateStubUpMark(TEST_BEND_MARK, base)!;
  const personalMark = calculateStubUpMark(TEST_BEND_MARK, { ...base, takeUp: actualTakeUp })!;
  const sampleOffset = calculateOffset(3, 45, base.centerlineRadius)!;
  const risk = offsetFeasibility(sampleOffset.geometry.vertexSpacing, 45, base, unit);
  return (
    <Card style={{ gap: theme.spacing.md, borderColor: theme.colors.border }}>
      <Text style={{ color: theme.colors.accentText, fontSize: theme.fontSize.secondary, fontWeight: theme.fontWeight.semibold }}>
        {t('paywall.exampleHeader')}
      </Text>
      {scene === 'calibration' ? <>
        <Caption>{t('paywall.exampleCalibrationIntro', { mark: formatLength(TEST_BEND_MARK, unit), measured: formatLength(measured, unit) })}</Caption>
        <View style={styles.comparison}>
          {([[t('paywall.exampleStandardTakeUp'), base.takeUp], [t('paywall.exampleMeasuredTakeUp'), actualTakeUp]] as const).map(([label, value]) => (
            <View key={label} style={{ flex: 1, minWidth: 120, gap: theme.spacing.xs }}>
              <Caption>{label}</Caption>
              <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.title, fontWeight: theme.fontWeight.semibold, fontVariant: ['tabular-nums'] }}>{formatLength(value, unit)}</Text>
            </View>
          ))}
        </View>
        <View style={{ backgroundColor: theme.colors.resultBackground, padding: theme.spacing.md, borderRadius: theme.radius, gap: theme.spacing.xs }}>
          <Text style={{ color: theme.colors.resultLabel, fontSize: theme.fontSize.secondary }}>{t('paywall.exampleMarkLabel')}</Text>
          <Text style={{ color: theme.colors.resultText, fontSize: theme.fontSize.title, fontWeight: theme.fontWeight.semibold, fontVariant: ['tabular-nums'] }}>{`${formatLength(standardMark, unit)} → ${formatLength(personalMark, unit)}`}</Text>
        </View>
        <Caption>{t('paywall.exampleCalibrationNote')}</Caption>
      </> : scene === 'feasibility' ? <>
        <Text style={{ color: theme.colors.accentText, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>{t('paywall.exampleFeasibilityTitle')}</Text>
        <Caption>{risk.messages[0] ?? t('paywall.exampleFeasibilityFallback')}</Caption>
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>{t('paywall.exampleFeasibilityNext')}</Text>
          {risk.suggestions.map((suggestion) => <Text key={suggestion} style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, lineHeight: 22 }}>{suggestion}</Text>)}
        </View>
        <Caption>{t('paywall.exampleFeasibilityNote')}</Caption>
      </> : <>
        <View style={styles.comparison}>
          {([
            [t('paywall.exampleFreeLabel'), t('paywall.exampleFreeValue')],
            [t('paywall.exampleProLabel'), t('paywall.exampleProValue', { limit: HISTORY_LIMIT })],
          ] as const).map(([label, value]) => <View key={label} style={{ flex: 1, gap: theme.spacing.xs }}>
            <Caption>{label}</Caption><Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.title, fontWeight: theme.fontWeight.semibold }}>{value}</Text>
          </View>)}
        </View>
        <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>{t('paywall.exampleExportTitle')}</Text>
        <View style={{ padding: theme.spacing.md, backgroundColor: theme.colors.resultBackground, borderRadius: theme.radius }}>
          <Text style={{ color: theme.colors.resultText, fontSize: theme.fontSize.body, lineHeight: 24, fontVariant: ['tabular-nums'] }}>
            {t('paywall.exampleExportSample', { height: formatLength(6, unit), spacing: formatLength(12, unit), shrink: formatLength(1.5, unit) })}
          </Text>
        </View>
        <Caption>{t('paywall.exampleHistoryNote', { limit: HISTORY_LIMIT })}</Caption>
      </>}
    </Card>
  );
}

function TextAction({ title, onPress, disabled = false, expanded }: { title: string; onPress(): void; disabled?: boolean; expanded?: boolean }) {
  const theme = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled, expanded }} disabled={disabled} onPress={onPress}
    android_ripple={{ color: theme.colors.pressFeedback }}
    style={({ pressed }) => ({ minHeight: theme.size.buttonMinHeight, flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius, overflow: 'hidden', opacity: disabled ? 0.4 : 1, backgroundColor: pressed && Platform.OS !== 'android' ? theme.colors.pressFeedback : 'transparent' })}>
    <Text style={{ color: theme.colors.primaryText, fontSize: theme.fontSize.secondary, fontWeight: theme.fontWeight.medium, textAlign: 'center' }}>{title}</Text>
  </Pressable>;
}

/** 只负责展示：沿用购买状态和显式继续任务，不写授权或调用商店。 */
export default function ProPaywallView(props: ProPaywallViewProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { height, fontScale } = useWindowDimensions();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [exampleOpen, setExampleOpen] = useState(true);
  const busy = purchaseBusy(props.phase);
  const disabled = busy || Boolean(props.continuing);
  const waiting = props.phase === 'pending' || props.phase === 'purchasing';
  const loading = props.phase === 'loading' || props.phase === 'restoring';
  // 横屏、小高度或放大字体时，让操作区随整页滚动，避免固定区域吞掉内容。
  const footerInScroll = height < 640 || fontScale > 1.2;
  const statusText = props.phase === 'pending' ? t('paywall.statusPending')
    : props.phase === 'purchasing' ? t('paywall.statusPurchasing')
    : props.phase === 'restoring' ? t('paywall.statusRestoring')
    : props.phase === 'loading' ? t('paywall.statusLoading') : null;
  const benefits: ReadonlyArray<readonly [string, string]> = [
    [t('paywall.benefit1.title'), t('paywall.benefit1.desc')],
    [t('paywall.benefit2.title'), t('paywall.benefit2.desc')],
    [t('paywall.benefit3.title'), t('paywall.benefit3.desc', { limit: HISTORY_LIMIT })],
  ];
  const footer = <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm, paddingBottom: Math.max(props.bottomInset ?? 0, theme.spacing.sm), gap: theme.spacing.sm }}>
    {statusText && !props.unlocked ? <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
      {props.phase !== 'pending' ? <ActivityIndicator color={theme.colors.accentText} /> : null}
      <View style={{ flex: 1 }}><Caption>{statusText}</Caption></View>
    </View> : null}
    {props.error ? <Text accessibilityLiveRegion="polite" style={{ color: props.phase === 'cancelled' ? theme.colors.textSecondary : theme.colors.error, fontSize: theme.fontSize.secondary, lineHeight: 20 }}>{props.error}</Text> : null}
    {props.unlocked ? <BigButton title={props.continuing ? t('paywall.openingTask') : t(CONTINUE_KEYS[props.intent.kind])} onPress={props.onContinue} disabled={Boolean(props.continuing)} variant="accent" />
      : props.isWeb ? <><Caption>{t('paywall.webCaption')}</Caption><BigButton title={t('paywall.getAndroidApp')} variant="accent" onPress={props.onBuy} /></>
      : waiting ? <BigButton title={props.checking ? t('paywall.checkingPurchase') : t('paywall.checkPurchaseStatus')} variant="secondary" disabled={props.checking} onPress={props.onRetry} />
      : loading ? <BigButton title={props.phase === 'restoring' ? t('paywall.restoringPurchase') : t('paywall.loadingPrice')} variant="accent" disabled onPress={props.onBuy} />
      : props.available && props.price ? <>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.title, fontWeight: theme.fontWeight.semibold, fontVariant: ['tabular-nums'] }}>{props.price}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>{t('paywall.oneTimeNote')}</Text>
        </View>
        <BigButton title={t('paywall.unlockCta')} variant="accent" onPress={props.onBuy} disabled={disabled} />
      </> : <><Caption>{t('paywall.storeUnavailableCaption')}</Caption><BigButton title={t('paywall.retryStore')} variant="secondary" onPress={props.onRetry} disabled={disabled} /></>}
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      {!props.isWeb && !props.unlocked && !waiting ? <TextAction title={t('paywall.restorePurchase')} onPress={props.onRestore} disabled={disabled} /> : null}
      <TextAction title={props.unlocked ? t('paywall.backToCalculators') : waiting ? t('paywall.continueWithFree') : t('paywall.notNow')} onPress={props.onClose} disabled={Boolean(props.continuing)} />
    </View>
  </View>;

  return <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
      <View style={[styles.content, { padding: theme.spacing.md, gap: theme.spacing.lg }, props.unlocked && !footerInScroll ? { flexGrow: 1, justifyContent: 'center' } : null]}>
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.accentText, fontSize: theme.fontSize.secondary, fontWeight: theme.fontWeight.semibold }}>{t('paywall.eyebrow')}</Text>
          <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.title, lineHeight: 30, fontWeight: theme.fontWeight.semibold }}>
            {props.unlocked ? (props.phase === 'restored' ? t('paywall.unlockedRestoredTitle') : t('paywall.unlockedReadyTitle')) : t(SCENE_TITLE_KEYS[props.scene])}
          </Text>
          <Caption>{props.unlocked ? t('paywall.unlockedSubtitle') : t('paywall.defaultSubtitle')}</Caption>
        </View>
        {props.unlocked ? <View style={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text accessible={false} importantForAccessibility="no-hide-descendants" style={{ color: theme.colors.success, fontSize: theme.fontSize.title }}>✓</Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>{t('paywall.readyOnDevice')}</Text>
          </View>
          <Caption>{props.intent.kind === 'calibration' || props.intent.kind === 'bender' ? t('paywall.readyCalibrationNote') : t('paywall.readyDefaultNote')}</Caption>
        </View> : <>
          <View style={{ gap: theme.spacing.md }}>
            {benefits.map(([title, description]) => <View key={title} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Text accessible={false} importantForAccessibility="no-hide-descendants" style={{ color: theme.colors.accentText, fontSize: theme.fontSize.body, lineHeight: 24 }}>✓</Text>
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, lineHeight: 24, fontWeight: theme.fontWeight.semibold }}>{title}</Text>
                <Caption>{description}</Caption>
              </View>
            </View>)}
            <Caption>{t('paywall.freePromise')}</Caption>
          </View>
          <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border }}>
            <TextAction title={exampleOpen ? t('paywall.hideExample') : t('paywall.showExample')} expanded={exampleOpen} onPress={() => setExampleOpen(!exampleOpen)} />
            {exampleOpen ? <View style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }}>
                {PRO_SCENES.map((item) => {
                  const tabLabel = t(SCENE_TAB_KEYS[item.key]);
                  return <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: item.key === props.scene }} accessibilityLabel={t('paywall.sceneTabA11y', { label: tabLabel })}
                    onPress={() => props.onSceneChange(item.key)} android_ripple={{ color: theme.colors.pressFeedback }}
                    style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: theme.size.buttonMinHeight, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xs, borderBottomWidth: 2, borderBottomColor: item.key === props.scene ? theme.colors.accentText : 'transparent', backgroundColor: pressed && Platform.OS !== 'android' ? theme.colors.pressFeedback : 'transparent' })}>
                    <Text style={{ fontSize: theme.fontSize.secondary, fontWeight: theme.fontWeight.semibold, textAlign: 'center', color: item.key === props.scene ? theme.colors.accentText : theme.colors.textSecondary }}>{tabLabel}</Text>
                  </Pressable>;
                })}
              </View>
              <ExamplePreview scene={props.scene} unit={props.unit ?? 'fractional'} />
            </View> : null}
          </View>
          <View>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>{t('paywall.faqHeading')}</Text>
            {FAQ_KEYS.map(([questionKey, answerKey], index) => <View key={questionKey}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: openFaq === index }} onPress={() => setOpenFaq(openFaq === index ? null : index)} android_ripple={{ color: theme.colors.pressFeedback }} style={{ minHeight: theme.size.buttonMinHeight, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, paddingVertical: theme.spacing.sm }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.secondary }}>{t(questionKey)} {openFaq === index ? '−' : '+'}</Text>
              </Pressable>
              {openFaq === index ? <View style={{ paddingVertical: theme.spacing.sm }}><Caption>{t(answerKey)}</Caption></View> : null}
            </View>)}
          </View>
        </>}
      </View>
      {footerInScroll ? <View style={styles.footer}>{footer}</View> : null}
    </ScrollView>
    {!footerInScroll ? <View style={styles.footer}>{footer}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  footer: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  comparison: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
});
