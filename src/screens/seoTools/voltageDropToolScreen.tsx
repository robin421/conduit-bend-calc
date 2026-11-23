/**
 * SEO /voltage-drop 工具页。
 *
 * 信息层级（T64 / T39）：
 *   L1 输入卡（Phase / Voltage Presets + Custom / Material / Wire Size / Load Amps / One-way Distance ft or m / Limit 3%·5%）
 *      + 结果卡（40pt Voltage Drop % + Volts Drop / End Voltage / NEC 3%·5% Compliance & Upsize）；
 *   L2 最近计算历史 + Value-First App CTA 卡；
 *   L3 NEC Voltage Drop 公式说明与 Chapter 9 Table 8 电阻表（SeoCollapsibleSection 默认折叠）；
 *   L4 FAQ（灰色手风琴，默认收起）+ RelatedCalculators。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';

import {
  calculateVoltageDrop,
  smallestSizeWithinDrop,
  type Phase,
} from '../../calculators/voltageDrop/voltageDrop';
import NumberField, { parseNumberInput } from '../../components/numberField';
import OptionRow from '../../components/optionRow';
import {
  DC_RESISTANCE_OHM_PER_KFT,
  VOLTAGE_DROP_LIMITS,
  WIRE_SIZES,
  wireSizeLabel,
  type ConductorMetal,
  type WireSize,
} from '../../constants';
import { useI18n } from '../../i18n';
import {
  useCalculatorAnalytics,
  useSeoToolCalculateAnalytics,
} from '../../lib/analytics';
import { buildVoltageDropCopyText } from '../../lib/copyResult';
import { createSeoHistoryEntry, type SeoHistoryEntry } from '../../lib/seoHistory';
import { useSeoHistory } from '../../lib/useSeoHistory';
import { getSeoToolPage, getSeoToolPageCopy } from '../../seo/toolPages';
import { useTheme } from '../../theme';
import {
  FaqSection,
  RelatedCalculators,
  SeoAppCtaCard,
  SeoCalculateButton,
  SeoCalcLayout,
  SeoCard,
  SeoCollapsibleSection,
  SeoCopyButton,
  SeoDataTable,
  SeoHeading,
  SeoHint,
  SeoHistoryList,
  SeoPage,
  SeoParagraph,
  SeoResultCard,
  SeoWorkspace,
  useSeoAmplitudeCalculation,
} from './seoLayout';

const PAGE = getSeoToolPage('voltageDrop');
const TOOL_NAME = 'voltage-drop' as const;
const FT_PER_M = 3.28084;
const VOLTAGE_PRESETS = [120, 208, 240, 277, 480] as const;
const LIMIT_OPTIONS = ['branch', 'total'] as const;
type LimitKey = (typeof LIMIT_OPTIONS)[number];
type DistanceUnit = 'ft' | 'm';

const QUICK_RESISTANCE_SIZES: readonly WireSize[] = [
  '14',
  '12',
  '10',
  '8',
  '6',
  '4',
  '2',
  '1/0',
  '2/0',
  '3/0',
  '4/0',
  '250',
  '500',
];

interface CommittedVoltageDrop {
  phase: Phase;
  volts: number;
  amps: number;
  distance: number;
  distanceUnit: DistanceUnit;
  metal: ConductorMetal;
  size: WireSize;
  limit: LimitKey;
}

export default function VoltageDropToolScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const copy = getSeoToolPageCopy(PAGE, lang);

  const [phase, setPhase] = useState<Phase>(1);
  const [voltsText, setVoltsText] = useState('120');
  const [metal, setMetal] = useState<ConductorMetal>('copper');
  const [size, setSize] = useState<WireSize>('12');
  const [ampsText, setAmpsText] = useState('');
  const [distanceText, setDistanceText] = useState('');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('ft');
  const [limitKey, setLimitKey] = useState<LimitKey>('branch');
  const [committed, setCommitted] = useState<CommittedVoltageDrop | null>(null);
  const { entries, loaded, add, clear } = useSeoHistory('voltageDrop');

  const availableSizes = useMemo(
    () =>
      WIRE_SIZES.filter(
        (s) => DC_RESISTANCE_OHM_PER_KFT[metal][s] !== undefined,
      ),
    [metal],
  );
  const effectiveSize: WireSize = availableSizes.includes(size)
    ? size
    : availableSizes[0];

  const parsedVolts = parseNumberInput(voltsText);
  const parsedAmps = parseNumberInput(ampsText);
  const parsedDistance = parseNumberInput(distanceText);

  const voltsInvalid =
    voltsText.trim() !== '' &&
    (parsedVolts === null || parsedVolts <= 0 || parsedVolts > 1000);
  const ampsInvalid =
    ampsText.trim() !== '' &&
    (parsedAmps === null || parsedAmps <= 0 || parsedAmps > 5000);
  const distanceInvalid =
    distanceText.trim() !== '' &&
    (parsedDistance === null || parsedDistance <= 0 || parsedDistance > 100000);

  const commitSelection = useCallback(
    (override?: {
      phase?: Phase;
      voltsText?: string;
      ampsText?: string;
      distanceText?: string;
      distanceUnit?: DistanceUnit;
      metal?: ConductorMetal;
      size?: WireSize;
      limit?: LimitKey;
      dismissKeyboard?: boolean;
    }) => {
      if (override?.dismissKeyboard) {
        Keyboard.dismiss();
      }
      const nextPhase = override?.phase ?? phase;
      const nextMetal = override?.metal ?? metal;
      const nextSizes = WIRE_SIZES.filter(
        (s) => DC_RESISTANCE_OHM_PER_KFT[nextMetal][s] !== undefined,
      );
      const rawSize = override?.size ?? size;
      const nextSize = nextSizes.includes(rawSize) ? rawSize : nextSizes[0];
      const nextVolts = parseNumberInput(override?.voltsText ?? voltsText);
      const nextAmps = parseNumberInput(override?.ampsText ?? ampsText);
      const nextDistance = parseNumberInput(
        override?.distanceText ?? distanceText,
      );
      const nextDistUnit = override?.distanceUnit ?? distanceUnit;
      const nextLimit = override?.limit ?? limitKey;

      if (
        nextVolts === null ||
        nextVolts <= 0 ||
        nextVolts > 1000 ||
        nextAmps === null ||
        nextAmps <= 0 ||
        nextAmps > 5000 ||
        nextDistance === null ||
        nextDistance <= 0 ||
        nextDistance > 100000
      ) {
        setCommitted(null);
        return;
      }

      setCommitted({
        phase: nextPhase,
        volts: nextVolts,
        amps: nextAmps,
        distance: nextDistance,
        distanceUnit: nextDistUnit,
        metal: nextMetal,
        size: nextSize,
        limit: nextLimit,
      });
    },
    [ampsText, distanceText, distanceUnit, limitKey, metal, phase, size, voltsText],
  );

  const preview = useMemo<CommittedVoltageDrop | null>(() => {
    if (
      parsedVolts === null ||
      parsedVolts <= 0 ||
      parsedVolts > 1000 ||
      parsedAmps === null ||
      parsedAmps <= 0 ||
      parsedAmps > 5000 ||
      parsedDistance === null ||
      parsedDistance <= 0 ||
      parsedDistance > 100000
    ) {
      return null;
    }
    return {
      phase,
      volts: parsedVolts,
      amps: parsedAmps,
      distance: parsedDistance,
      distanceUnit,
      metal,
      size: effectiveSize,
      limit: limitKey,
    };
  }, [
    distanceUnit,
    effectiveSize,
    limitKey,
    metal,
    parsedAmps,
    parsedDistance,
    parsedVolts,
    phase,
  ]);

  const activeInput = preview ?? committed;
  const activeLimit = VOLTAGE_DROP_LIMITS[activeInput?.limit ?? limitKey];
  const activeLimitPercent = Math.round(activeLimit * 100);

  const activeLengthFt = useMemo(() => {
    if (!activeInput) return null;
    return activeInput.distanceUnit === 'm'
      ? activeInput.distance * FT_PER_M
      : activeInput.distance;
  }, [activeInput]);

  const result = useMemo(() => {
    if (!activeInput || activeLengthFt === null) return null;
    return calculateVoltageDrop({
      metal: activeInput.metal,
      size: activeInput.size,
      amps: activeInput.amps,
      lengthFt: activeLengthFt,
      volts: activeInput.volts,
      phase: activeInput.phase,
    });
  }, [activeInput, activeLengthFt]);

  const overLimit = result !== null && result.dropFraction > activeLimit;

  const suggestion = useMemo(() => {
    if (!activeInput || activeLengthFt === null || !overLimit) return null;
    return smallestSizeWithinDrop(
      {
        metal: activeInput.metal,
        amps: activeInput.amps,
        lengthFt: activeLengthFt,
        volts: activeInput.volts,
        phase: activeInput.phase,
      },
      activeLimit,
    );
  }, [activeInput, activeLengthFt, activeLimit, overLimit]);

  const committedResult = useMemo(() => {
    if (!committed) return null;
    const lenFt =
      committed.distanceUnit === 'm'
        ? committed.distance * FT_PER_M
        : committed.distance;
    return calculateVoltageDrop({
      metal: committed.metal,
      size: committed.size,
      amps: committed.amps,
      lengthFt: lenFt,
      volts: committed.volts,
      phase: committed.phase,
    });
  }, [committed]);

  const committedSignature =
    committed && committedResult
      ? `${committed.metal}|${committed.size}|${committed.amps}|${committed.distance}|${committed.distanceUnit}|${committed.volts}|${committed.phase}|${committed.limit}`
      : null;

  useCalculatorAnalytics('voltage_drop', committedSignature, {
    unitSystem: distanceUnit === 'm' ? 'metric' : 'imperial',
  });
  useSeoToolCalculateAnalytics(TOOL_NAME, committedSignature);
  useSeoAmplitudeCalculation({
    calculator: 'voltage_drop',
    toolName: TOOL_NAME,
    pageSlug: PAGE.slug,
    signature: committedSignature,
    unitMode: distanceUnit === 'm' ? 'metric' : 'fractional',
  });

  useEffect(() => {
    if (!committed || !committedResult || !committedSignature) {
      return;
    }
    const phaseStr = committed.phase === 3 ? '3φ' : '1φ';
    const metalShort = committed.metal === 'copper' ? 'Cu' : 'Al';
    add(
      createSeoHistoryEntry({
        kind: 'voltageDrop',
        inputSummary: `${phaseStr} ${committed.volts}V · ${committed.amps} A · ${committed.distance}${committed.distanceUnit} · ${wireSizeLabel(committed.size)} ${metalShort}`,
        summary: `${(committedResult.dropFraction * 100).toFixed(2)}% (${committedResult.dropVolts.toFixed(2)} V)`,
        params: {
          phase: committed.phase,
          voltsText: String(committed.volts),
          ampsText: String(committed.amps),
          distanceText: String(committed.distance),
          distanceUnit: committed.distanceUnit,
          metal: committed.metal,
          wire: committed.size,
          vdLimit: committed.limit,
        },
        signature: committedSignature,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedSignature]);

  const handleRefill = useCallback((entry: SeoHistoryEntry) => {
    const params = entry.params;
    const nextPhase: Phase = params.phase === 3 ? 3 : 1;
    const nextVoltsText = params.voltsText ?? '120';
    const nextAmpsText = params.ampsText ?? '';
    const nextDistanceText = params.distanceText ?? '';
    const nextDistUnit: DistanceUnit = params.distanceUnit === 'm' ? 'm' : 'ft';
    const nextMetal: ConductorMetal = params.metal ?? 'copper';
    const nextWire: WireSize = params.wire ?? '12';
    const nextLimit: LimitKey = params.vdLimit ?? 'branch';

    setPhase(nextPhase);
    setVoltsText(nextVoltsText);
    setAmpsText(nextAmpsText);
    setDistanceText(nextDistanceText);
    setDistanceUnit(nextDistUnit);
    setMetal(nextMetal);
    setSize(nextWire);
    setLimitKey(nextLimit);

    const v = parseNumberInput(nextVoltsText);
    const a = parseNumberInput(nextAmpsText);
    const d = parseNumberInput(nextDistanceText);
    if (v && v > 0 && a && a > 0 && d && d > 0) {
      setCommitted({
        phase: nextPhase,
        volts: v,
        amps: a,
        distance: d,
        distanceUnit: nextDistUnit,
        metal: nextMetal,
        size: nextWire,
        limit: nextLimit,
      });
    }
  }, []);

  const metalDisplay = (m: ConductorMetal) =>
    m === 'copper' ? t('wireSize.copper') : t('wireSize.aluminum');

  const selectedVoltagePreset = VOLTAGE_PRESETS.find(
    (v) => parsedVolts !== null && Math.abs(v - parsedVolts) < 1e-9,
  );

  const copyText =
    result && activeInput
      ? buildVoltageDropCopyText({
          phase: activeInput.phase,
          volts: activeInput.volts,
          amps: activeInput.amps,
          distance: activeInput.distance,
          distanceUnit: activeInput.distanceUnit,
          metalLabel: activeInput.metal === 'copper' ? 'Copper' : 'Aluminum',
          wireLabel: wireSizeLabel(activeInput.size),
          dropPercent: result.dropFraction * 100,
          dropVolts: result.dropVolts,
          endVolts: result.endVolts,
          limitPercent: activeLimitPercent,
          recommendedWire: suggestion ? wireSizeLabel(suggestion) : null,
        })
      : '';

  return (
    <SeoPage activeTool={PAGE.key}>
      <View style={{ gap: theme.spacing.xs }}>
        <SeoHeading level={1} style={{ fontSize: 20 }}>
          {copy.h1}
        </SeoHeading>
        <SeoHint>{t('voltageDrop.seoHint')}</SeoHint>
      </View>

      <SeoWorkspace>
        <SeoCalcLayout
          input={
            <SeoCard>
              <OptionRow
                label={t('voltageDrop.phaseLabel')}
                options={[1, 3] as const}
                value={phase}
                format={(p) =>
                  p === 1 ? t('voltageDrop.phase1') : t('voltageDrop.phase3')
                }
                onChange={(next) => {
                  setPhase(next);
                  commitSelection({ phase: next });
                }}
              />

              <OptionRow
                label={t('voltageDrop.voltageLabel')}
                options={VOLTAGE_PRESETS}
                value={selectedVoltagePreset ?? null}
                perRow={5}
                format={(v) => `${v}V`}
                onChange={(next) => {
                  const text = String(next);
                  setVoltsText(text);
                  commitSelection({ voltsText: text });
                }}
              />

              <NumberField
                label={t('voltageDrop.customVoltageLabel')}
                unit="V"
                value={voltsText}
                onChangeText={setVoltsText}
                placeholder={t('voltageDrop.customVoltagePlaceholder')}
                error={voltsInvalid ? t('voltageDrop.voltageError') : undefined}
              />

              <OptionRow
                label={t('wireSize.metalLabel')}
                options={['copper', 'aluminum'] as const}
                value={metal}
                format={metalDisplay}
                onChange={(next) => {
                  setMetal(next);
                  commitSelection({ metal: next });
                }}
              />

              <OptionRow
                label={t('voltageDrop.wireLabel')}
                options={availableSizes}
                value={effectiveSize}
                perRow={6}
                onChange={(next) => {
                  setSize(next);
                  commitSelection({ size: next });
                }}
              />

              <NumberField
                label={t('voltageDrop.ampsLabel')}
                unit="A"
                value={ampsText}
                onChangeText={setAmpsText}
                placeholder={t('voltageDrop.ampsPlaceholder')}
                error={ampsInvalid ? t('voltageDrop.ampsError') : undefined}
              />

              <OptionRow
                label={t('voltageDrop.distanceUnitLabel')}
                options={['ft', 'm'] as const}
                value={distanceUnit}
                format={(u) => (u === 'ft' ? 'Feet (ft)' : 'Meters (m)')}
                onChange={(next) => {
                  setDistanceUnit(next);
                  commitSelection({ distanceUnit: next });
                }}
              />

              <NumberField
                label={t('voltageDrop.distanceLabel', { unit: distanceUnit })}
                unit={distanceUnit}
                value={distanceText}
                onChangeText={setDistanceText}
                placeholder={
                  distanceUnit === 'm'
                    ? t('voltageDrop.distancePlaceholderM')
                    : t('voltageDrop.distancePlaceholderFt')
                }
                error={
                  distanceInvalid ? t('voltageDrop.distanceError') : undefined
                }
              />

              <OptionRow
                label={t('voltageDrop.limitLabel')}
                options={LIMIT_OPTIONS}
                value={limitKey}
                format={(l) =>
                  l === 'branch'
                    ? t('voltageDrop.limitBranch')
                    : t('voltageDrop.limitTotal')
                }
                onChange={(next) => {
                  setLimitKey(next);
                  commitSelection({ limit: next });
                }}
              />

              <View>
                <SeoCalculateButton
                  onPress={() => commitSelection({ dismissKeyboard: true })}
                />
              </View>
            </SeoCard>
          }
          result={
            <View style={{ gap: theme.spacing.md }}>
              <SeoResultCard
                headline={t('voltageDrop.headline')}
                headlineValue={
                  result ? `${(result.dropFraction * 100).toFixed(2)}%` : undefined
                }
                rows={
                  result
                    ? [
                        {
                          label: t('voltageDrop.dropVoltsRow'),
                          value: `${result.dropVolts.toFixed(2)} V`,
                        },
                        {
                          label: t('voltageDrop.endVoltsRow'),
                          value: `${result.endVolts.toFixed(1)} V`,
                        },
                        {
                          label: t('voltageDrop.statusRow', {
                            limit: activeLimitPercent,
                          }),
                          value: overLimit
                            ? t('voltageDrop.statusFail', {
                                limit: activeLimitPercent,
                              })
                            : t('voltageDrop.statusPass', {
                                limit: activeLimitPercent,
                              }),
                        },
                        ...(overLimit && suggestion
                          ? [
                              {
                                label: t('voltageDrop.upsizeRow', {
                                  limit: activeLimitPercent,
                                }),
                                value: wireSizeLabel(suggestion),
                              },
                            ]
                          : []),
                      ]
                    : [
                        { label: t('voltageDrop.dropVoltsRow'), value: '—' },
                        { label: t('voltageDrop.endVoltsRow'), value: '—' },
                      ]
                }
              />

              {overLimit && activeInput ? (
                <View
                  accessibilityRole="alert"
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.error,
                    borderRadius: theme.radius,
                    padding: theme.spacing.sm,
                    backgroundColor: theme.colors.card,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.error,
                      fontSize: theme.fontSize.secondary,
                      fontWeight: theme.fontWeight.semibold,
                    }}
                  >
                    {suggestion
                      ? t('voltageDrop.overLimitAlert', {
                          limit: activeLimitPercent,
                          wire: wireSizeLabel(suggestion),
                          metal: metalDisplay(activeInput.metal),
                        })
                      : t('voltageDrop.over500Alert', {
                          limit: activeLimitPercent,
                        })}
                  </Text>
                </View>
              ) : null}

              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {t('voltageDrop.necNote')}
              </Text>

              <SeoCopyButton
                text={copyText}
                disabled={!result}
                toolName={TOOL_NAME}
              />
            </View>
          }
        />
      </SeoWorkspace>

      <SeoHistoryList
        entries={entries}
        loaded={loaded}
        onRefill={handleRefill}
        onClear={clear}
        toolName={TOOL_NAME}
      />

      <SeoAppCtaCard toolSlug={PAGE.slug} toolName={TOOL_NAME} />

      <SeoCollapsibleSection title={t('voltageDrop.whatTitle')}>
        <SeoParagraph>{copy.tagline}</SeoParagraph>
        <SeoParagraph>
          Using NEC Chapter 9 Table 8 DC resistance R (ohms per 1,000 ft at
          75°C): Single-phase VD = (2 × L × I × R) ÷ 1,000. Three-phase VD =
          (√3 × L × I × R) ÷ 1,000, where L is one-way conductor distance in
          feet and I is load current in amps. NEC 210.19(A) Informational Note
          recommends ≤ 3% on branch circuits and ≤ 5% combined feeder + branch.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <SeoCollapsibleSection title={t('voltageDrop.chartTitle')}>
        <SeoDataTable
          columns={[
            t('wireSize.tableSize'),
            t('voltageDrop.tableCu'),
            t('voltageDrop.tableAl'),
          ]}
          rows={QUICK_RESISTANCE_SIZES.map((sz) => {
            const cu = DC_RESISTANCE_OHM_PER_KFT.copper[sz];
            const al = DC_RESISTANCE_OHM_PER_KFT.aluminum[sz];
            return [
              wireSizeLabel(sz),
              cu !== undefined ? cu.toFixed(cu < 0.1 ? 4 : 3) : '—',
              al !== undefined ? al.toFixed(al < 0.1 ? 4 : 3) : '—',
            ];
          })}
        />
        <SeoParagraph>
          DC resistance ignores AC inductive reactance; for large conductors (2/0
          AWG and above) at low power factor, check NEC Chapter 9 Table 9
          effective Z values.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <FaqSection page={copy} toolName={TOOL_NAME} />

      <RelatedCalculators current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}
