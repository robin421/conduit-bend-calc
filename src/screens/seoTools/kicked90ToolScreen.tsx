/**
 * SEO /kicked-90 工具页。
 *
 * 信息层级（T64 / T39）：
 *   L1 输入卡（EMT Trade Size / Stub Height / Kick Height / Kick Angle）+ 结果卡（40pt Kick Mark + Stub Mark / Take-Up / Gain）+ BendDiagram；
 *   L2 管径与角度预设·单位·最近计算历史 + Value-First App CTA 卡；
 *   L3 说明文·Kick 倍数与 EMT Take-Up 表（SeoCollapsibleSection 默认折叠）；
 *   L4 FAQ（灰色手风琴，默认收起）+ RelatedCalculators。
 *
 * 首屏布局（390×844，T66 间距体系 16/24/32）：
 *   移动端（<600pt）：顶距 16 + 品牌栏 28（含汉堡）+ 16 + 标题/引导约 44 + 16
 *   + 输入卡约 496 = 结果卡顶部约 616pt，40pt 主结果数字落在可视区内；
 *   L3/L4 全在结果之后且默认收起。横屏由 SeoCalcLayout 自动左右分栏。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';

import type { DiagramInput } from '../../calculators/diagrams/diagrams';
import { calculateKicked90 } from '../../calculators/kicked90/kicked90';
import BendDiagram from '../../components/bendDiagram';
import ImperialInput from '../../components/imperialInput';
import {
  OFFSET_CONSTANTS,
  TAKE_UP_OPTIONS,
  type EmtTakeUpSize,
  type OffsetAngle,
} from '../../constants';
import { useI18n } from '../../i18n';
import {
  useCalculatorAnalytics,
  useSeoToolCalculateAnalytics,
} from '../../lib/analytics';
import { buildKicked90CopyText } from '../../lib/copyResult';
import { createSeoHistoryEntry, type SeoHistoryEntry } from '../../lib/seoHistory';
import {
  convertLengthInputText,
  formatLength,
  parseLength,
  type UnitSystem,
} from '../../lib/units';
import { useUnitSystem } from '../../lib/unitStore';
import { useSeoHistory } from '../../lib/useSeoHistory';
import { getSeoToolPage, getSeoToolPageCopy } from '../../seo/toolPages';
import { useTheme } from '../../theme';
import {
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
  SeoPresetRow,
  SeoResultCard,
  SeoUnitToggle,
  SeoWorkspace,
  TakeUpTable,
  useSeoAmplitudeCalculation,
  type SeoQuickPreset,
} from './seoLayout';

const PAGE = getSeoToolPage('kicked90');
const DEFAULT_SIZE: EmtTakeUpSize = '1/2';
const DEFAULT_KICK_ANGLE: OffsetAngle = 30;
const TOOL_NAME = 'kicked-90' as const;

const KICK_ANGLES: readonly OffsetAngle[] = [10, 15, 22.5, 30, 45];

/** 与 BENDER_SPECS 对应的常用手弯 EMT 中心线半径 R（英寸）。 */
const EMT_RADIUS_BY_SIZE: Record<EmtTakeUpSize, number> = {
  '1/2': 4.3125,
  '3/4': 5.25,
  '1': 7.375,
};

interface CommittedKicked90 {
  stubInches: number;
  kickInches: number;
  size: EmtTakeUpSize;
  kickAngle: OffsetAngle;
}

export default function Kicked90ToolScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const copy = getSeoToolPageCopy(PAGE, lang);
  const { unit, setUnit } = useUnitSystem();

  const [size, setSize] = useState<EmtTakeUpSize>(DEFAULT_SIZE);
  const [stubText, setStubText] = useState('');
  const [kickText, setKickText] = useState('');
  const [kickAngle, setKickAngle] = useState<OffsetAngle>(DEFAULT_KICK_ANGLE);
  const [committed, setCommitted] = useState<CommittedKicked90 | null>(null);
  const { entries, loaded, add, clear } = useSeoHistory('kicked90');

  const sizePresets: readonly SeoQuickPreset[] = useMemo(
    () =>
      TAKE_UP_OPTIONS.map((option) => ({
        id: option.size,
        label: `${option.size}"`,
        hint: t('stub.takeUpHintFormatted', {
          takeUp: formatLength(option.takeUpInches, unit),
        }),
      })),
    [t, unit],
  );

  const anglePresets: readonly SeoQuickPreset[] = useMemo(
    () =>
      KICK_ANGLES.map((deg) => ({
        id: String(deg),
        label: `${deg}°`,
        hint: `× ${OFFSET_CONSTANTS[deg].multiplier}`,
      })),
    [],
  );

  const handleUnitChange = useCallback(
    (nextUnit: UnitSystem) => {
      setStubText((prev) => convertLengthInputText(prev, unit, nextUnit));
      setKickText((prev) => convertLengthInputText(prev, unit, nextUnit));
      setUnit(nextUnit);
    },
    [setUnit, unit],
  );

  const calculate = useCallback(
    (override?: {
      size?: EmtTakeUpSize;
      kickAngle?: OffsetAngle;
      stubText?: string;
      kickText?: string;
      dismissKeyboard?: boolean;
    }) => {
      if (override?.dismissKeyboard) {
        Keyboard.dismiss();
      }
      const nextSize = override?.size ?? size;
      const nextAngle = override?.kickAngle ?? kickAngle;
      const stub = parseLength(override?.stubText ?? stubText, unit);
      const kick = parseLength(override?.kickText ?? kickText, unit);
      if (stub === null || stub <= 0 || kick === null || kick <= 0) {
        setCommitted(null);
        return;
      }
      setCommitted({
        stubInches: stub,
        kickInches: kick,
        size: nextSize,
        kickAngle: nextAngle,
      });
    },
    [kickAngle, kickText, size, stubText, unit],
  );

  const applySize = useCallback(
    (next: EmtTakeUpSize) => {
      setSize(next);
      calculate({ size: next });
    },
    [calculate],
  );

  const applyAngle = useCallback(
    (next: OffsetAngle) => {
      setKickAngle(next);
      calculate({ kickAngle: next });
    },
    [calculate],
  );

  const preview = useMemo<CommittedKicked90 | null>(() => {
    const stub = parseLength(stubText, unit);
    const kick = parseLength(kickText, unit);
    if (stub === null || stub <= 0 || kick === null || kick <= 0) {
      return null;
    }
    return { stubInches: stub, kickInches: kick, size, kickAngle };
  }, [kickAngle, kickText, size, stubText, unit]);

  const activeInput = preview ?? committed;

  const activeTakeUp = useMemo(() => {
    const targetSize = activeInput?.size ?? size;
    return (
      TAKE_UP_OPTIONS.find((entry) => entry.size === targetSize) ??
      TAKE_UP_OPTIONS[0]
    ).takeUpInches;
  }, [activeInput?.size, size]);

  const stubMark = activeInput ? activeInput.stubInches - activeTakeUp : null;
  const stubTooShort = stubMark !== null && stubMark <= 0;

  const kickMarkFromBack = useMemo(() => {
    if (!activeInput) return null;
    return activeInput.kickInches * OFFSET_CONSTANTS[activeInput.kickAngle].multiplier;
  }, [activeInput]);

  const kickShrink = useMemo(() => {
    if (!activeInput) return null;
    return activeInput.kickInches * OFFSET_CONSTANTS[activeInput.kickAngle].shrinkPerInch;
  }, [activeInput]);

  const engineResult = useMemo(() => {
    if (!activeInput || kickMarkFromBack === null || stubTooShort) {
      return null;
    }
    return calculateKicked90(
      activeInput.kickAngle,
      kickMarkFromBack,
      EMT_RADIUS_BY_SIZE[activeInput.size],
    );
  }, [activeInput, kickMarkFromBack, stubTooShort]);

  const diagramInput = useMemo<DiagramInput | null>(() => {
    if (!engineResult || !activeInput || kickMarkFromBack === null) {
      return null;
    }
    return {
      kind: 'kicked90',
      unit,
      kickAngleDeg: activeInput.kickAngle,
      straightLength: kickMarkFromBack,
      totalGain: engineResult.totalGain,
    };
  }, [activeInput, engineResult, kickMarkFromBack, unit]);

  const committedTakeUp = committed
    ? (TAKE_UP_OPTIONS.find((entry) => entry.size === committed.size) ??
        TAKE_UP_OPTIONS[0]).takeUpInches
    : null;
  const committedStubMark =
    committed && committedTakeUp !== null
      ? committed.stubInches - committedTakeUp
      : null;
  const committedTooShort =
    committedStubMark !== null && committedStubMark <= 0;

  const committedSignature = committed
    ? `${committed.stubInches}|${committed.kickInches}|${committed.size}|${committed.kickAngle}`
    : null;
  const validCommittedSignature =
    committedSignature && !committedTooShort ? committedSignature : null;

  useCalculatorAnalytics('kicked90', validCommittedSignature, {
    unitSystem: unit === 'metric' ? 'metric' : 'imperial',
  });
  useSeoToolCalculateAnalytics(TOOL_NAME, validCommittedSignature);
  useSeoAmplitudeCalculation({
    calculator: 'kicked90',
    toolName: TOOL_NAME,
    pageSlug: PAGE.slug,
    signature: validCommittedSignature,
    unitMode: unit,
  });

  useEffect(() => {
    if (
      !committed ||
      committedStubMark === null ||
      committedTooShort ||
      !committedSignature
    ) {
      return;
    }
    const committedKickDist =
      committed.kickInches * OFFSET_CONSTANTS[committed.kickAngle].multiplier;
    add(
      createSeoHistoryEntry({
        kind: 'kicked90',
        inputSummary: `${formatSeoLength(committed.stubInches, unit)} stub · ${formatSeoLength(committed.kickInches, unit)} kick @ ${committed.kickAngle}°`,
        summary: `kick ${formatSeoLength(committedKickDist, unit)}, stub ${formatSeoLength(committedStubMark, unit)}`,
        params: {
          heightText: stubText,
          kickText,
          size: committed.size,
          angle: committed.kickAngle,
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
      if (params.heightText !== undefined) {
        setStubText(params.heightText);
      }
      if (params.kickText !== undefined) {
        setKickText(params.kickText);
      }
      const nextSize = params.size ?? DEFAULT_SIZE;
      const nextAngle = params.angle ?? DEFAULT_KICK_ANGLE;
      setSize(nextSize);
      setKickAngle(nextAngle);
      const stub = params.heightText
        ? parseLength(params.heightText, entryUnit)
        : null;
      const kick = params.kickText
        ? parseLength(params.kickText, entryUnit)
        : null;
      if (stub !== null && stub > 0 && kick !== null && kick > 0) {
        setCommitted({
          stubInches: stub,
          kickInches: kick,
          size: nextSize,
          kickAngle: nextAngle,
        });
      }
    },
    [setUnit],
  );

  const copyText =
    engineResult &&
    activeInput &&
    stubMark !== null &&
    !stubTooShort &&
    kickMarkFromBack !== null
      ? buildKicked90CopyText({
          sizeLabel: `${activeInput.size}" EMT`,
          stubMark,
          takeUp: activeTakeUp,
          kickAngle: activeInput.kickAngle,
          kickMarkFromBack,
          totalGain: engineResult.totalGain,
          unit,
        })
      : '';

  return (
    <SeoPage activeTool={PAGE.key}>
      <View style={{ gap: theme.spacing.xs }}>
        <SeoHeading level={1} style={{ fontSize: 20 }}>
          {copy.h1}
        </SeoHeading>
        <SeoHint>{t('kicked90.seoHint')}</SeoHint>
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

              <SeoPresetRow
                presets={sizePresets}
                activeId={size}
                toolName={TOOL_NAME}
                onSelect={(preset) => applySize(preset.id as EmtTakeUpSize)}
              />

              <ImperialInput
                label={t('kicked90.stubHeightLabel')}
                value={stubText}
                onChangeText={setStubText}
                onSubmitEditing={() => calculate({ dismissKeyboard: true })}
                unit={unit}
                placeholder={
                  unit === 'metric'
                    ? t('placeholder.mm300')
                    : t('placeholder.inch12')
                }
              />

              <ImperialInput
                label={t('kicked90.kickHeightLabel')}
                value={kickText}
                onChangeText={setKickText}
                onSubmitEditing={() => calculate({ dismissKeyboard: true })}
                unit={unit}
                placeholder={
                  unit === 'metric'
                    ? t('placeholder.mm100')
                    : t('placeholder.inch4')
                }
              />

              <View style={{ gap: theme.spacing.xs }}>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: theme.fontSize.secondary,
                  }}
                >
                  {t('kicked90.kickAngleLabel')}
                </Text>
                <SeoPresetRow
                  presets={anglePresets}
                  activeId={String(kickAngle)}
                  toolName={TOOL_NAME}
                  onSelect={(preset) =>
                    applyAngle(Number(preset.id) as OffsetAngle)
                  }
                />
              </View>

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
                headline={t('kicked90.kickMarkHeadline')}
                headlineValue={
                  kickMarkFromBack !== null && !stubTooShort
                    ? formatSeoLength(kickMarkFromBack, unit)
                    : undefined
                }
                rows={[
                  {
                    label: t('kicked90.stubMarkRow'),
                    value:
                      stubMark !== null && !stubTooShort
                        ? formatSeoLength(stubMark, unit)
                        : '—',
                  },
                  {
                    label: t('kicked90.takeUpRow'),
                    value: formatLength(activeTakeUp, unit),
                  },
                  {
                    label: t('kicked90.totalGainRow'),
                    value: engineResult
                      ? formatSeoLength(engineResult.totalGain, unit)
                      : '—',
                  },
                  {
                    label: t('kicked90.kickShrinkRow'),
                    value:
                      kickShrink !== null && !stubTooShort
                        ? formatSeoLength(kickShrink, unit)
                        : '—',
                  },
                ]}
              />
              {stubTooShort ? (
                <Text
                  style={{
                    color: theme.colors.error,
                    fontSize: theme.fontSize.secondary,
                  }}
                >
                  {t('stub.tooShortFormatted', {
                    takeUp: formatLength(activeTakeUp, unit),
                  })}
                </Text>
              ) : null}
              {diagramInput ? (
                <SeoCard style={{ padding: theme.spacing.sm }}>
                  <BendDiagram input={diagramInput} height={150} />
                </SeoCard>
              ) : null}
              <SeoCopyButton
                text={copyText}
                disabled={!copyText}
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

      <SeoCollapsibleSection title={t('kicked90.whatTitle')}>
        <SeoParagraph>{copy.tagline}</SeoParagraph>
        <SeoParagraph>
          1) Mark your 90° stub at target stub height minus bender take-up and
          bend to 90°. 2) Measure from the back of the 90° by kick height ×
          multiplier (for a 4&quot; kick at 30°, 4&quot; × 2.0 = 8&quot; from
          the back of the 90°). 3) Place the bender arrow on the kick mark and
          bend to your chosen kick angle while keeping the stub square to the
          wall or panel.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <SeoCollapsibleSection title={t('kicked90.chartTitle')}>
        <OffsetMultiplierTable />
        <TakeUpTable />
        <SeoParagraph>
          Always confirm take-up stamped on your hand bender shoe before cutting.
          For Rigid or IMC conduit, check your specific bender deduct (typically
          6&quot; for 1/2&quot;, 8&quot; for 3/4&quot;, and 11&quot; for 1&quot;).
        </SeoParagraph>
      </SeoCollapsibleSection>

      <FaqSection page={copy} toolName={TOOL_NAME} />

      <RelatedCalculators current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}
