/**
 * SEO /rolling-offset 工具页。
 *
 * 信息层级（T64 / T39）：
 *   L1 输入卡（Rise / Roll / Bend Angle）+ 结果卡（40pt Mark Spacing + True Offset / Shrink / Rotation）+ BendDiagram；
 *   L2 角度预设·单位·最近计算历史 + Value-First App CTA 卡；
 *   L3 说明文·倍数与收缩表（SeoCollapsibleSection 默认折叠）；
 *   L4 FAQ（灰色手风琴，默认收起）+ RelatedCalculators。
 *
 * 首屏布局（390×844，T66 间距体系 16/24/32）：
 *   移动端（<600pt）：顶距 16 + 品牌栏 28（含汉堡）+ 16 + 标题/引导约 44 + 16
 *   + 双输入卡约 456 = 结果卡顶部约 576pt，40pt 主结果数字落在可视区内；
 *   L3/L4 全在结果之后且默认收起。横屏由 SeoCalcLayout 自动左右分栏。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';

import type { DiagramInput } from '../../calculators/diagrams/diagrams';
import { calculateRollingOffset } from '../../calculators/rollingOffset/rollingOffset';
import BendDiagram from '../../components/bendDiagram';
import ImperialInput from '../../components/imperialInput';
import type { OffsetAngle } from '../../constants';
import { useI18n } from '../../i18n';
import {
  useCalculatorAnalytics,
  useSeoToolCalculateAnalytics,
} from '../../lib/analytics';
import { buildRollingOffsetCopyText } from '../../lib/copyResult';
import { createSeoHistoryEntry, type SeoHistoryEntry } from '../../lib/seoHistory';
import { convertLengthInputText, parseLength, type UnitSystem } from '../../lib/units';
import { useUnitSystem } from '../../lib/unitStore';
import { useSeoHistory } from '../../lib/useSeoHistory';
import { getSeoToolPage, getSeoToolPageCopy } from '../../seo/toolPages';
import { useTheme } from '../../theme';
import {
  AngleSelector,
  DEFAULT_ANGLE_PRESETS,
  FaqSection,
  formatSeoLength,
  OffsetMultiplierTable,
  RelatedCalculators,
  SeoAppCtaCard,
  SeoCalculateButton,
  SeoCalcLayout,
  SeoCard,
  SeoCollapsibleSection,
  SeoCopyButton,
  SeoHeading,
  SeoHint,
  SeoHistoryList,
  SeoPage,
  SeoParagraph,
  SeoResultCard,
  SeoUnitToggle,
  SeoWorkspace,
  useSeoAmplitudeCalculation,
  type SeoQuickPreset,
} from './seoLayout';

const PAGE = getSeoToolPage('rollingOffset');
const DEFAULT_ANGLE: OffsetAngle = 30;
const TOOL_NAME = 'rolling-offset' as const;
const ANGLE_PRESETS: readonly SeoQuickPreset[] = DEFAULT_ANGLE_PRESETS;

interface CommittedRollingOffset {
  riseInches: number;
  rollInches: number;
  angle: OffsetAngle;
}

function formatDeg(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function RollingOffsetToolScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const copy = getSeoToolPageCopy(PAGE, lang);
  const { unit, setUnit } = useUnitSystem();
  const [riseText, setRiseText] = useState('');
  const [rollText, setRollText] = useState('');
  const [angle, setAngle] = useState<OffsetAngle>(DEFAULT_ANGLE);
  const [committed, setCommitted] = useState<CommittedRollingOffset | null>(null);
  const { entries, loaded, add, clear } = useSeoHistory('rollingOffset');

  const handleUnitChange = useCallback(
    (nextUnit: UnitSystem) => {
      setRiseText((prev) => convertLengthInputText(prev, unit, nextUnit));
      setRollText((prev) => convertLengthInputText(prev, unit, nextUnit));
      setUnit(nextUnit);
    },
    [setUnit, unit],
  );

  const calculate = useCallback(
    (override?: {
      angle?: OffsetAngle;
      riseText?: string;
      rollText?: string;
      dismissKeyboard?: boolean;
    }) => {
      if (override?.dismissKeyboard) {
        Keyboard.dismiss();
      }
      const nextAngle = override?.angle ?? angle;
      const rise = parseLength(override?.riseText ?? riseText, unit);
      const roll = parseLength(override?.rollText ?? rollText, unit);
      if (rise === null || rise <= 0 || roll === null || roll <= 0) {
        setCommitted(null);
        return;
      }
      setCommitted({ riseInches: rise, rollInches: roll, angle: nextAngle });
    },
    [angle, riseText, rollText, unit],
  );

  const applyAngle = useCallback(
    (next: OffsetAngle) => {
      setAngle(next);
      calculate({ angle: next });
    },
    [calculate],
  );

  const preview = useMemo<CommittedRollingOffset | null>(() => {
    const rise = parseLength(riseText, unit);
    const roll = parseLength(rollText, unit);
    if (rise === null || rise <= 0 || roll === null || roll <= 0) {
      return null;
    }
    return { riseInches: rise, rollInches: roll, angle };
  }, [angle, riseText, rollText, unit]);

  const activeInput = preview ?? committed;

  const result = useMemo(
    () =>
      activeInput
        ? calculateRollingOffset(
            activeInput.riseInches,
            activeInput.rollInches,
            activeInput.angle,
          )
        : null,
    [activeInput],
  );

  const diagramInput = useMemo<DiagramInput | null>(() => {
    if (!result || !activeInput) {
      return null;
    }
    return {
      kind: 'rolling',
      unit,
      rise: activeInput.riseInches,
      roll: activeInput.rollInches,
      trueOffset: result.trueOffset,
      rollAngleDeg: result.rollAngleDeg,
      thetaDeg: activeInput.angle,
      spacingDisplay: result.spacingDisplay,
      shrinkDisplay: result.shrinkDisplay,
    };
  }, [activeInput, result, unit]);

  const committedSignature = committed
    ? `${committed.riseInches}|${committed.rollInches}|${committed.angle}`
    : null;

  useCalculatorAnalytics('rolling', committedSignature, {
    unitSystem: unit === 'metric' ? 'metric' : 'imperial',
  });
  useSeoToolCalculateAnalytics(TOOL_NAME, committedSignature);
  useSeoAmplitudeCalculation({
    calculator: 'rolling',
    toolName: TOOL_NAME,
    pageSlug: PAGE.slug,
    signature: committedSignature,
    unitMode: unit,
  });

  const committedResult = useMemo(
    () =>
      committed
        ? calculateRollingOffset(
            committed.riseInches,
            committed.rollInches,
            committed.angle,
          )
        : null,
    [committed],
  );

  useEffect(() => {
    if (!committed || !committedResult || !committedSignature) {
      return;
    }
    add(
      createSeoHistoryEntry({
        kind: 'rollingOffset',
        inputSummary: `${formatSeoLength(committed.riseInches, unit)} × ${formatSeoLength(committed.rollInches, unit)} @ ${committed.angle}°`,
        summary: `spacing ${formatSeoLength(committedResult.spacingDisplay, unit)}, true ${formatSeoLength(committedResult.trueOffset, unit)}`,
        params: {
          riseText,
          rollText,
          angle: committed.angle,
          unit,
        },
        signature: committedSignature,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedSignature]);

  const handleRefill = useCallback(
    (entry: SeoHistoryEntry) => {
      const params = entry.params;
      const entryUnit = params.unit ?? 'fractional';
      setUnit(entryUnit);
      if (params.riseText !== undefined) {
        setRiseText(params.riseText);
      }
      if (params.rollText !== undefined) {
        setRollText(params.rollText);
      }
      const nextAngle = params.angle ?? DEFAULT_ANGLE;
      setAngle(nextAngle);
      const rise = params.riseText ? parseLength(params.riseText, entryUnit) : null;
      const roll = params.rollText ? parseLength(params.rollText, entryUnit) : null;
      if (rise !== null && rise > 0 && roll !== null && roll > 0) {
        setCommitted({ riseInches: rise, rollInches: roll, angle: nextAngle });
      }
    },
    [setUnit],
  );

  const copyText =
    result && activeInput
      ? buildRollingOffsetCopyText({
          angle: activeInput.angle,
          trueOffset: result.trueOffset,
          spacing: result.spacingDisplay,
          shrink: result.shrinkDisplay,
          rollAngleDeg: result.rollAngleDeg,
          unit,
        })
      : '';

  return (
    <SeoPage activeTool={PAGE.key}>
      <View style={{ gap: theme.spacing.xs }}>
        <SeoHeading level={1} style={{ fontSize: 20 }}>
          {copy.h1}
        </SeoHeading>
        <SeoHint>{t('rolling.seoHint')}</SeoHint>
      </View>

      <SeoWorkspace>
        <SeoCalcLayout
          input={
            <SeoCard>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: theme.fontSize.secondary,
                  }}
                >
                  {t('common.units')}
                </Text>
                <SeoUnitToggle
                  value={unit}
                  onChange={handleUnitChange}
                  toolName={TOOL_NAME}
                />
              </View>

              <ImperialInput
                label={t('rolling.riseLabel')}
                value={riseText}
                onChangeText={setRiseText}
                onSubmitEditing={() => calculate({ dismissKeyboard: true })}
                unit={unit}
                placeholder={
                  unit === 'metric'
                    ? t('placeholder.mm150')
                    : t('placeholder.inch6')
                }
              />

              <ImperialInput
                label={t('rolling.rollLabel')}
                value={rollText}
                onChangeText={setRollText}
                onSubmitEditing={() => calculate({ dismissKeyboard: true })}
                unit={unit}
                placeholder={
                  unit === 'metric'
                    ? t('placeholder.mm200')
                    : t('placeholder.inch8')
                }
              />

              <AngleSelector
                value={angle}
                onChange={applyAngle}
                presets={ANGLE_PRESETS}
                toolName={TOOL_NAME}
              />

              <View>
                <SeoCalculateButton
                  onPress={() => calculate({ dismissKeyboard: true })}
                />
              </View>
            </SeoCard>
          }
          result={
            <View style={{ gap: theme.spacing.md }}>
              <SeoResultCard
                headline={t('rolling.markSpacing')}
                headlineValue={
                  result ? formatSeoLength(result.spacingDisplay, unit) : undefined
                }
                rows={[
                  {
                    label: t('rolling.trueOffset'),
                    value: result ? formatSeoLength(result.trueOffset, unit) : '—',
                  },
                  {
                    label: t('rolling.shrinkLabel'),
                    value: result ? formatSeoLength(result.shrinkDisplay, unit) : '—',
                  },
                  {
                    label: t('rolling.rotationAngle'),
                    value: result ? `${formatDeg(result.rollAngleDeg)}°` : '—',
                  },
                ]}
              />
              {diagramInput ? (
                <SeoCard style={{ padding: theme.spacing.sm }}>
                  <BendDiagram input={diagramInput} height={150} />
                </SeoCard>
              ) : null}
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

      <SeoCollapsibleSection title={t('rolling.whatTitle')}>
        <SeoParagraph>{copy.tagline}</SeoParagraph>
        <SeoParagraph>
          Step 1: Find the true offset using √(rise² + roll²). For example, a 6&quot;
          rise and 8&quot; roll gives a 10&quot; true offset. Step 2: Multiply the
          true offset by your bend angle multiplier (2.0 at 30° = 20&quot; mark
          spacing). Step 3: Rotate the conduit in the bender to the calculated
          rotation angle so both bends stay in the same plane without doglegs.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <SeoCollapsibleSection title={t('rolling.chartTitle')}>
        <OffsetMultiplierTable />
        <SeoParagraph>
          Rolling offset shrink is calculated from the true offset, not the rise
          or roll alone. At 30°, multiply true offset by 1/4&quot; per inch and
          add that shrink before cutting.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <FaqSection page={copy} toolName={TOOL_NAME} />

      <RelatedCalculators current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}
