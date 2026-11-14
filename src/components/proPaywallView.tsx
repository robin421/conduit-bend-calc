import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { calibrateDeductFromStub } from '../calculators/calibration/calibration';
import { defaultBenderSpec } from '../calculators/geometry/benderSpecs';
import { calculateStubUpMark } from '../calculators/geometry/geometry';
import { offsetFeasibility } from '../calculators/feasibility/feasibility';
import { calculateOffset } from '../calculators/offset/offset';
import { HISTORY_LIMIT } from '../lib/historyStore';
import { TEST_BEND_MARK } from '../lib/guidedCalibrationFlow';
import { formatLength, type UnitSystem } from '../lib/units';
import { PRO_SCENES, proContinueLabel, purchaseBusy, type ProIntent, type ProScene, type PurchasePhase } from '../lib/proFlow';
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

const FAQ = [
  ['Is this a subscription?', 'No. Pro is a one-time purchase for this app. There are no recurring charges.'],
  ['What stays free?', 'All nine calculators, standard bender values, basic diagrams and safety warnings stay free. Pro adds personal calibration, detailed bend options, saved bender profiles and recent-history export.'],
  ['What do I need to calibrate?', 'Bring your bender, scrap conduit and a tape measure. Quick Check uses one finished-height measurement. Full Fingerprint uses both legs of a 90° test bend to derive bend radius.'],
  ['Can I restore my purchase?', 'Yes. On Android, use the same Google Play account and choose Restore purchase. Previously unlocked Pro keeps working offline on this device. Bender profiles and recent history are stored on this device.'],
] as const;

function Caption({ children }: { children: string }) {
  const theme = useTheme();
  return <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary, lineHeight: 20 }}>{children}</Text>;
}

function ExamplePreview({ scene, unit }: { scene: ProScene; unit: UnitSystem }) {
  const theme = useTheme();
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
        Illustrative example · settings unchanged
      </Text>
      {scene === 'calibration' ? <>
        <Caption>{`A test bend marked at ${formatLength(TEST_BEND_MARK, unit)} finishes at ${formatLength(measured, unit)}.`}</Caption>
        <View style={styles.comparison}>
          {[['Standard take-up', base.takeUp], ['Measured take-up', actualTakeUp]].map(([label, value]) => (
            <View key={label} style={{ flex: 1, minWidth: 120, gap: theme.spacing.xs }}>
              <Caption>{String(label)}</Caption>
              <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.title, fontWeight: theme.fontWeight.semibold, fontVariant: ['tabular-nums'] }}>{formatLength(Number(value), unit)}</Text>
            </View>
          ))}
        </View>
        <View style={{ backgroundColor: theme.colors.resultBackground, padding: theme.spacing.md, borderRadius: theme.radius, gap: theme.spacing.xs }}>
          <Text style={{ color: theme.colors.resultLabel, fontSize: theme.fontSize.secondary }}>Mark for the same target stub</Text>
          <Text style={{ color: theme.colors.resultText, fontSize: theme.fontSize.title, fontWeight: theme.fontWeight.semibold, fontVariant: ['tabular-nums'] }}>{`${formatLength(standardMark, unit)} → ${formatLength(personalMark, unit)}`}</Text>
        </View>
        <Caption>Use your own measured result after unlocking. Quick Check changes take-up; Full Fingerprint derives bend radius.</Caption>
      </> : scene === 'feasibility' ? <>
        <Text style={{ color: theme.colors.accentText, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>Example: tight bend clearance</Text>
        <Caption>{risk.messages[0] ?? 'The selected bend needs more space.'}</Caption>
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>Pro adds a next step</Text>
          {risk.suggestions.map((suggestion) => <Text key={suggestion} style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, lineHeight: 22 }}>{suggestion}</Text>)}
        </View>
        <Caption>Preview only. Check your actual dimensions and selected bender; free risk warnings remain visible.</Caption>
      </> : <>
        <View style={styles.comparison}>
          {[['Free', 'Latest 5'], ['Pro', `Latest ${HISTORY_LIMIT}`]].map(([label, value]) => <View key={label} style={{ flex: 1, gap: theme.spacing.xs }}>
            <Caption>{label}</Caption><Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.title, fontWeight: theme.fontWeight.semibold }}>{value}</Text>
          </View>)}
        </View>
        <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>Text export example</Text>
        <View style={{ padding: theme.spacing.md, backgroundColor: theme.colors.resultBackground, borderRadius: theme.radius }}>
          <Text style={{ color: theme.colors.resultText, fontSize: theme.fontSize.body, lineHeight: 24, fontVariant: ['tabular-nums'] }}>{`Offset · ${formatLength(6, unit)} · 30°\nSpacing ${formatLength(12, unit)} · shrink ${formatLength(1.5, unit)}`}</Text>
        </View>
        <Caption>{`The latest ${HISTORY_LIMIT} bends stay on this device. Export before older entries are replaced. No unlimited storage or cloud backup is included.`}</Caption>
      </>}
    </Card>
  );
}

const BENEFITS = [
  ['Personal calibration', 'Use your own take-up and bend radius.'],
  ['Detailed bend checks', 'Check clearance and explore alternatives.'],
  ['History & text export', `Keep your latest ${HISTORY_LIMIT} bends and share them.`],
] as const;
const SCENE_LABELS: Record<ProScene, string> = { calibration: 'Bender', feasibility: 'Bend checks', history: 'History' };

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
  const { height, fontScale } = useWindowDimensions();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [exampleOpen, setExampleOpen] = useState(false);
  const copy = PRO_SCENES.find((item) => item.key === props.scene)!;
  const busy = purchaseBusy(props.phase);
  const disabled = busy || Boolean(props.continuing);
  const waiting = props.phase === 'pending' || props.phase === 'purchasing';
  const loading = props.phase === 'loading' || props.phase === 'restoring';
  // 横屏、小高度或放大字体时，让操作区随整页滚动，避免固定区域吞掉内容。
  const footerInScroll = height < 640 || fontScale > 1.2;
  const statusText = props.phase === 'pending' ? 'Payment pending. Pro unlocks after Google Play confirms it. Please do not buy again.'
    : props.phase === 'purchasing' ? 'Waiting for Google Play. You can keep using the free calculators.'
    : props.phase === 'restoring' ? 'Checking purchases for your store account…'
    : props.phase === 'loading' ? 'Checking your purchase and local price…' : null;
  const footer = <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background, paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm, paddingBottom: Math.max(props.bottomInset ?? 0, theme.spacing.sm), gap: theme.spacing.sm }}>
    {statusText && !props.unlocked ? <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
      {props.phase !== 'pending' ? <ActivityIndicator color={theme.colors.accentText} /> : null}
      <View style={{ flex: 1 }}><Caption>{statusText}</Caption></View>
    </View> : null}
    {props.error ? <Text accessibilityLiveRegion="polite" style={{ color: props.phase === 'cancelled' ? theme.colors.textSecondary : theme.colors.error, fontSize: theme.fontSize.secondary, lineHeight: 20 }}>{props.error}</Text> : null}
    {props.unlocked ? <BigButton title={props.continuing ? 'Opening your task…' : proContinueLabel(props.intent)} onPress={props.onContinue} disabled={Boolean(props.continuing)} variant="accent" />
      : props.isWeb ? <><Caption>Pro is available in the Android app. Google Play shows your local price.</Caption><BigButton title="Get the Android app" variant="accent" onPress={props.onBuy} /></>
      : waiting ? <BigButton title={props.checking ? 'Checking purchase…' : 'Check purchase status'} variant="secondary" disabled={props.checking} onPress={props.onRetry} />
      : loading ? <BigButton title={props.phase === 'restoring' ? 'Restoring purchase…' : 'Loading price…'} variant="accent" disabled onPress={props.onBuy} />
      : props.available && props.price ? <>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.title, fontWeight: theme.fontWeight.semibold, fontVariant: ['tabular-nums'] }}>{props.price}</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: theme.fontSize.secondary }}>One-time · No subscription</Text>
        </View>
        <BigButton title="Unlock Pro Lifetime" variant="accent" onPress={props.onBuy} disabled={disabled} />
      </> : <><Caption>Unable to load your store price. Free calculators are still available.</Caption><BigButton title="Retry store connection" variant="secondary" onPress={props.onRetry} disabled={disabled} /></>}
    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      {!props.isWeb && !props.unlocked && !waiting ? <TextAction title="Restore purchase" onPress={props.onRestore} disabled={disabled} /> : null}
      <TextAction title={props.unlocked ? 'Back to calculators' : waiting ? 'Continue with Free' : 'Not now'} onPress={props.onClose} disabled={Boolean(props.continuing)} />
    </View>
  </View>;

  return <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
      <View style={[styles.content, { padding: theme.spacing.md, gap: theme.spacing.lg }, props.unlocked && !footerInScroll ? { flexGrow: 1, justifyContent: 'center' } : null]}>
        <View style={{ gap: theme.spacing.sm }}>
          <Text style={{ color: theme.colors.accentText, fontSize: theme.fontSize.secondary, fontWeight: theme.fontWeight.semibold }}>PRO · LIFETIME ACCESS</Text>
          <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.title, lineHeight: 30, fontWeight: theme.fontWeight.semibold }}>
            {props.unlocked ? props.phase === 'restored' ? 'Your Pro is restored' : 'Your Pro is ready' : copy.title}
          </Text>
          <Caption>{props.unlocked ? 'Your inputs and saved settings are ready. Continue when you are.' : 'A personal setup for your bender, with more confidence on every job.'}</Caption>
        </View>
        {props.unlocked ? <View style={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text accessible={false} importantForAccessibility="no-hide-descendants" style={{ color: theme.colors.success, fontSize: theme.fontSize.title }}>✓</Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>Ready to use on this device</Text>
          </View>
          <Caption>{props.intent.kind === 'calibration' || props.intent.kind === 'bender' ? 'Have your bender, scrap conduit and tape measure ready. Settings change only when you save.' : 'Your original calculation and recent history are kept.'}</Caption>
        </View> : <>
          <View style={{ gap: theme.spacing.md }}>
            {BENEFITS.map(([title, description]) => <View key={title} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Text accessible={false} importantForAccessibility="no-hide-descendants" style={{ color: theme.colors.accentText, fontSize: theme.fontSize.body, lineHeight: 24 }}>✓</Text>
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, lineHeight: 24, fontWeight: theme.fontWeight.semibold }}>{title}</Text>
                <Caption>{description}</Caption>
              </View>
            </View>)}
            <Caption>All nine calculators and safety warnings stay free.</Caption>
          </View>
          <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border }}>
            <TextAction title={exampleOpen ? 'Hide example −' : 'See Pro in practice +'} expanded={exampleOpen} onPress={() => setExampleOpen(!exampleOpen)} />
            {exampleOpen ? <View style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }}>
                {PRO_SCENES.map((item) => <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: item.key === props.scene }} accessibilityLabel={`${SCENE_LABELS[item.key]} example`}
                  onPress={() => props.onSceneChange(item.key)} android_ripple={{ color: theme.colors.pressFeedback }}
                  style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: theme.size.buttonMinHeight, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xs, borderBottomWidth: 2, borderBottomColor: item.key === props.scene ? theme.colors.accentText : 'transparent', backgroundColor: pressed && Platform.OS !== 'android' ? theme.colors.pressFeedback : 'transparent' })}>
                  <Text style={{ fontSize: theme.fontSize.secondary, fontWeight: theme.fontWeight.semibold, textAlign: 'center', color: item.key === props.scene ? theme.colors.accentText : theme.colors.textSecondary }}>{SCENE_LABELS[item.key]}</Text>
                </Pressable>)}
              </View>
              <ExamplePreview scene={props.scene} unit={props.unit ?? 'fractional'} />
            </View> : null}
          </View>
          <View>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>Good to know</Text>
            {FAQ.map(([question, answer], index) => <View key={question}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: openFaq === index }} onPress={() => setOpenFaq(openFaq === index ? null : index)} android_ripple={{ color: theme.colors.pressFeedback }} style={{ minHeight: theme.size.buttonMinHeight, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, paddingVertical: theme.spacing.sm }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.secondary }}>{question} {openFaq === index ? '−' : '+'}</Text>
              </Pressable>
              {openFaq === index ? <View style={{ paddingVertical: theme.spacing.sm }}><Caption>{answer}</Caption></View> : null}
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
