import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
    <Card style={{ gap: theme.spacing.md, borderColor: theme.colors.controlAccent }}>
      <Text style={{ color: theme.colors.accentText, fontSize: theme.fontSize.secondary, fontWeight: theme.fontWeight.semibold }}>
        Example preview · not your saved settings
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

/** 实际付费页与独立状态预览共用；不含商店调用或授权写入。 */
export default function ProPaywallView(props: ProPaywallViewProps) {
  const theme = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const copy = PRO_SCENES.find((item) => item.key === props.scene)!;
  const busy = purchaseBusy(props.phase);
  const disabled = busy || Boolean(props.continuing);
  const statusText = props.phase === 'pending' ? 'Payment is pending. Pro will unlock when Google Play confirms completion. Do not purchase again.'
    : props.phase === 'purchasing' ? 'Waiting for Google Play. You can return to the free calculators; we will check your purchase when you return.'
    : props.phase === 'restoring' ? 'Checking purchases for your store account…'
    : props.phase === 'loading' ? 'Loading your local price and checking purchases…' : null;
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={[styles.content, { gap: theme.spacing.md, padding: theme.spacing.md }]} keyboardShouldPersistTaps="handled">
        <Caption>WattFlow Pro · Lifetime</Caption>
        {props.unlocked ? <>
          <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.result, fontWeight: theme.fontWeight.semibold }}>
            {props.phase === 'restored' ? 'Pro restored' : props.phase === 'purchased' ? 'Pro unlocked' : 'Your Pro is ready'}
          </Text>
          <Caption>Your calculators and saved inputs are ready. Continue the task you came here to do.</Caption>
          <Card style={{ gap: theme.spacing.md }}>
            <Text style={{ color: theme.colors.success, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>Ready to use on this device</Text>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.title, fontWeight: theme.fontWeight.semibold }}>{proContinueLabel(props.intent)}</Text>
            <Caption>{props.intent.kind === 'calibration' || props.intent.kind === 'bender' ? 'Have your bender, scrap conduit and tape measure ready. Your existing bender settings stay as they are until you save.' : 'Your original calculation or recent history is kept. Continue when you are ready.'}</Caption>
          </Card>
        </> : <>
          <View style={styles.sceneRow}>
            {PRO_SCENES.map((item) => <BigButton key={item.key} title={item.label} variant="option" size="selection" selected={item.key === props.scene} onPress={() => props.onSceneChange(item.key)} style={{ flex: 1 }} />)}
          </View>
          <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.title, fontWeight: theme.fontWeight.semibold, lineHeight: 30 }}>{copy.title}</Text>
          <Caption>{copy.description}</Caption>
          <ExamplePreview scene={props.scene} unit={props.unit ?? 'fractional'} />
          <View style={{ gap: theme.spacing.sm }}>
            <Text accessibilityRole="header" style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>What changes with Pro</Text>
            <Caption>Free: nine calculators, standard values, diagrams and risk warnings.</Caption>
            <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, lineHeight: 22 }}>Pro: personal bender calibration, saved bender profiles, detailed bend options, and recent-history export.</Text>
          </View>
          <View style={{ gap: theme.spacing.xs }}>
            {FAQ.map(([question, answer], index) => <View key={question}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: openFaq === index }} onPress={() => setOpenFaq(openFaq === index ? null : index)} android_ripple={{ color: theme.colors.pressFeedback }} style={{ minHeight: 56, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }}>
                <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, fontWeight: theme.fontWeight.semibold }}>{question} {openFaq === index ? '−' : '+'}</Text>
              </Pressable>
              {openFaq === index ? <View style={{ paddingVertical: theme.spacing.sm }}><Caption>{answer}</Caption></View> : null}
            </View>)}
          </View>
        </>}
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border, padding: theme.spacing.md, paddingBottom: Math.max(props.bottomInset ?? 0, theme.spacing.md), gap: theme.spacing.sm }]}>
        {statusText && !props.unlocked ? <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
          {props.phase !== 'pending' ? <ActivityIndicator color={theme.colors.accentText} /> : null}<View style={{ flex: 1 }}><Caption>{statusText}</Caption></View>
        </View> : null}
        {props.error ? <Text accessibilityLiveRegion="polite" style={{ color: props.phase === 'cancelled' ? theme.colors.textSecondary : theme.colors.error, fontSize: theme.fontSize.secondary, lineHeight: 20 }}>{props.error}</Text> : null}
        {props.unlocked ? <BigButton title={props.continuing ? 'Opening your task…' : proContinueLabel(props.intent)} onPress={props.onContinue} disabled={Boolean(props.continuing)} variant="accent" />
          : props.isWeb ? <><Caption>Pro is available in the Android app. See Google Play for your local one-time price.</Caption><BigButton title="Get the Android app" variant="accent" onPress={props.onBuy} /></>
          : props.phase === 'pending' || props.phase === 'purchasing' ? <BigButton title={props.checking ? 'Checking purchase…' : 'Check purchase status'} variant="secondary" disabled={props.checking} onPress={props.onRetry} />
          : props.available && props.price ? <>
            <Text style={{ color: theme.colors.textPrimary, textAlign: 'center', fontSize: theme.fontSize.title, fontWeight: theme.fontWeight.semibold, fontVariant: ['tabular-nums'] }}>{props.price}</Text>
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', fontSize: theme.fontSize.secondary }}>One-time purchase · No subscription</Text>
            <BigButton title="Unlock Pro Lifetime" variant="accent" onPress={props.onBuy} disabled={disabled} />
          </> : props.phase === 'loading' ? null : <><Caption>Purchase is temporarily unavailable. Retry to load your store price. Your free calculators still work.</Caption><BigButton title="Retry store connection" variant="secondary" onPress={props.onRetry} disabled={disabled} /></>}
        {!props.isWeb && !props.unlocked && !['pending', 'purchasing'].includes(props.phase) ? <BigButton title={props.phase === 'restoring' ? 'Restoring purchase…' : 'Restore purchase'} variant="secondary" onPress={props.onRestore} disabled={disabled} /> : null}
        <Pressable accessibilityRole="button" disabled={Boolean(props.continuing)} onPress={props.onClose} android_ripple={{ color: theme.colors.pressFeedback }} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.primaryText, fontSize: theme.fontSize.body }}>{props.unlocked ? 'Back to calculators' : props.phase === 'pending' || props.phase === 'purchasing' ? 'Continue with free calculators' : 'Not now — keep using Free'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  footer: { width: '100%', maxWidth: 720, alignSelf: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  sceneRow: { flexDirection: 'row', gap: 8 },
  comparison: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
});
