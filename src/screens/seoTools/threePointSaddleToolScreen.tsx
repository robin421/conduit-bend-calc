/**
 * SEO /3-point-saddle 工具页。
 *
 * 信息层级（T64 / T30）：
 *   L1 输入卡 + 结果卡 + BendDiagram（同属一个 SeoWorkspace 工作区）；
 *   L2 45°/60° 预设·单位·最近计算历史 + Value-First App CTA 卡；
 *   L3 说明文·3点鞍弯对照表（SeoCollapsibleSection 默认折叠）；
 *   L4 FAQ（灰色手风琴，默认收起）+ RelatedCalculators。
 *
 * 首屏布局（390×844，T66 间距体系 16/24/32）：
 *   移动端（<600pt）：顶距 16 + 品牌栏 52 + 16 + 标题/引导约 44 + 16
 *   + 输入卡约 340 = 结果卡顶部约 484pt，40pt 主结果数字落在可视区内。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';

import type { DiagramInput } from '../../calculators/diagrams/diagrams';
import {
  calculateThreePointSaddle,
  saddle3ShrinkPerInch,
  saddle3SpacingMultiplier,
} from '../../calculators/saddle/saddle';
import BendDiagram from '../../components/bendDiagram';
import ImperialInput from '../../components/imperialInput';
import type { OffsetAngle } from '../../constants';
import { useI18n } from '../../i18n';
import {
  useCalculatorAnalytics,
  useSeoToolCalculateAnalytics,
} from '../../lib/analytics';
import { buildThreePointSaddleCopyText } from '../../lib/copyResult';
import { createSeoHistoryEntry, type SeoHistoryEntry } from '../../lib/seoHistory';
import { convertLengthInputText, parseLength, type UnitSystem } from '../../lib/units';
import { useUnitSystem } from '../../lib/unitStore';
import { useSeoHistory } from '../../lib/useSeoHistory';
import { getSeoToolPage, getSeoToolPageCopy } from '../../seo/toolPages';
import { useTheme } from '../../theme';
import {
  FaqSection,
  formatSeoLength,
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
  SeoPresetRow,
  SeoResultCard,
  SeoUnitToggle,
  SeoWorkspace,
  useSeoAmplitudeCalculation,
  type SeoQuickPreset,
} from './seoLayout';

const PAGE = getSeoToolPage('saddle3');
const DEFAULT_ANGLE: OffsetAngle = 45;
const TOOL_NAME = '3-point-saddle' as const;
const SADDLE3_ANGLES: readonly OffsetAngle[] = [45, 60];

interface CommittedSaddle3 {
  heightInches: number;
  angle: OffsetAngle;
}

function formatShrinkFraction(perInch: number): string {
  const sixteenths = Math.round(perInch * 16);
  if (sixteenths % 4 === 0) {
    return `${sixteenths / 4}/4"`;
  }
  return `${sixteenths}/16"`;
}

export default function ThreePointSaddleToolScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const copy = getSeoToolPageCopy(PAGE, lang);
  const { unit, setUnit } = useUnitSystem();
  const [heightText, setHeightText] = useState('');
  const [angle, setAngle] = useState<OffsetAngle>(DEFAULT_ANGLE);
  const [committed, setCommitted] = useState<CommittedSaddle3 | null>(null);
  const { entries, loaded, add, clear } = useSeoHistory('saddle3');

  const anglePresets: readonly SeoQuickPreset[] = useMemo(
    () => [
      { id: '45', label: '45°', hint: t('saddle3.preset45Hint') },
      { id: '60', label: '60°', hint: t('saddle3.preset60Hint') },
    ],
    [t],
  );

  const handleUnitChange = useCallback(
    (nextUnit: UnitSystem) => {
      setHeightText((prev) => convertLengthInputText(prev, unit, nextUnit));
      setUnit(nextUnit);
    },
    [setUnit, unit],
  );

  const calculate = useCallback(
    (override?: {
      angle?: OffsetAngle;
      heightText?: string;
      dismissKeyboard?: boolean;
    }) => {
      if (override?.dismissKeyboard) {
        Keyboard.dismiss();
      }
      const nextAngle = override?.angle ?? angle;
      const height = parseLength(override?.heightText ?? heightText, unit);
      if (height === null || height <= 0) {
        setCommitted(null);
        return;
      }
      setCommitted({ heightInches: height, angle: nextAngle });
    },
    [angle, heightText, unit],
  );

  const applyAngle = useCallback(
    (next: OffsetAngle) => {
      setAngle(next);
      calculate({ angle: next });
    },
    [calculate],
  );

  const preview = useMemo<CommittedSaddle3 | null>(() => {
    const height = parseLength(heightText, unit);
    if (height === null || height <= 0) {
      return null;
    }
    return { heightInches: height, angle };
  }, [angle, heightText, unit]);

  const activeInput = preview ?? committed;

  const result = useMemo(
    () =>
      activeInput
        ? calculateThreePointSaddle(activeInput.heightInches, activeInput.angle)
        : null,
    [activeInput],
  );

  const diagramInput = useMemo<DiagramInput | null>(() => {
    if (!result || !activeInput) {
      return null;
    }
    return {
      kind: 'saddle3',
      unit,
      height: activeInput.heightInches,
      sideSpacingDisplay: result.markSpacingInches,
      thetaDeg: activeInput.angle,
    };
  }, [activeInput, result, unit]);

  const marksLine = result
    ? result.marks
        .map((mark) => {
          if (mark.fromCenterInches === 0) {
            return t('calc.center');
          }
          const side = mark.fromCenterInches < 0 ? 'L' : 'R';
          return `${formatSeoLength(Math.abs(mark.fromCenterInches), unit)}${side}`;
        })
        .join(' · ')
    : '—';

  const committedSignature = committed
    ? `${committed.heightInches}|${committed.angle}`
    : null;

  useCalculatorAnalytics('saddle3', committedSignature, {
    unitSystem: unit === 'metric' ? 'metric' : 'imperial',
  });
  useSeoToolCalculateAnalytics(TOOL_NAME, committedSignature);
  useSeoAmplitudeCalculation({
    calculator: 'saddle3',
    toolName: TOOL_NAME,
    pageSlug: PAGE.slug,
    signature: committedSignature,
    unitMode: unit,
  });

  const committedResult = useMemo(
    () =>
      committed
        ? calculateThreePointSaddle(committed.heightInches, committed.angle)
        : null,
    [committed],
  );

  useEffect(() => {
    if (!committed || !committedResult || !committedSignature) {
      return;
    }
    add(
      createSeoHistoryEntry({
        kind: 'saddle3',
        inputSummary: `${formatSeoLength(committed.heightInches, unit)} @ ${committed.angle}°`,
        summary: `sides ${formatSeoLength(committedResult.markSpacingInches, unit)}, shrink ${formatSeoLength(committedResult.shrinkInches ?? 0, unit)}`,
        params: {
          heightText,
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
      if (params.heightText !== undefined) {
        setHeightText(params.heightText);
      }
      const nextAngle = params.angle ?? DEFAULT_ANGLE;
      setAngle(nextAngle);
      const height = params.heightText
        ? parseLength(params.heightText, entryUnit)
        : null;
      if (height !== null && height > 0) {
        setCommitted({ heightInches: height, angle: nextAngle });
      }
    },
    [setUnit],
  );

  const copyText =
    result && activeInput
      ? buildThreePointSaddleCopyText({
          centerAngle: activeInput.angle,
          sideSpacing: result.markSpacingInches,
          span: result.spanInches,
          shrink: result.shrinkInches ?? 0,
          unit,
        })
      : '';

  const sideAngle = (activeInput?.angle ?? angle) / 2;

  return (
    <SeoPage activeTool={PAGE.key}>
      <View style={{ gap: theme.spacing.xs }}>
        <SeoHeading level={1} style={{ fontSize: 20 }}>
          {copy.h1}
        </SeoHeading>
        <SeoHint>{t('saddle3.seoHint')}</SeoHint>
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
                label={t('saddle3.heightLabel')}
                value={heightText}
                onChangeText={setHeightText}
                onSubmitEditing={() => calculate({ dismissKeyboard: true })}
                unit={unit}
                placeholder={
                  unit === 'metric'
                    ? t('placeholder.mm100')
                    : t('placeholder.inch4')
                }
              />

              <SeoPresetRow
                presets={anglePresets}
                activeId={String(angle)}
                toolName={TOOL_NAME}
                onSelect={(preset) =>
                  applyAngle(Number(preset.id) as OffsetAngle)
                }
              />

              <View>
                <SeoCalculateButton
                  label={t('common.calculate')}
                  onPress={() => calculate({ dismissKeyboard: true })}
                />
              </View>
            </SeoCard>
          }
          result={
            <View style={{ gap: theme.spacing.md }}>
              <SeoResultCard
                headline={t('saddle3.markSpacing')}
                headlineValue={
                  result
                    ? formatSeoLength(result.markSpacingInches, unit)
                    : undefined
                }
                rows={[
                  {
                    label: t('saddle3.centerShrink'),
                    value:
                      result && result.shrinkInches !== undefined
                        ? formatSeoLength(result.shrinkInches, unit)
                        : '—',
                  },
                  {
                    label: t('saddle3.totalSpan'),
                    value: result ? formatSeoLength(result.spanInches, unit) : '—',
                  },
                  {
                    label: t('saddle3.anglesLabel'),
                    value: `${activeInput?.angle ?? angle}° / ${sideAngle}°`,
                  },
                  {
                    label: t('saddle3.marksFromCenter'),
                    value: marksLine,
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

      <SeoCollapsibleSection title={t('saddle3.whatTitle')}>
        <SeoParagraph>{copy.tagline}</SeoParagraph>
        <SeoParagraph>
          Mark the center of the obstacle on the conduit, add center shrink if
          measuring from a fixed point, then mark each side bend at obstacle
          height × 2.5 (for 45°/22.5°) or × 2.0 (for 60°/30°). Bend the center
          mark on the rim notch, then flip the conduit and bend both outer marks
          on the arrow in the opposite direction.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <SeoCollapsibleSection title={t('saddle3.chartTitle')}>
        <SeoDataTable
          columns={[
            t('saddle3.tableCenter'),
            t('saddle3.tableSides'),
            t('table.multiplier'),
            t('table.shrinkPerInch'),
          ]}
          rows={SADDLE3_ANGLES.map((deg) => [
            `${deg}°`,
            `${deg / 2}°`,
            `× ${saddle3SpacingMultiplier(deg).toFixed(1)}`,
            formatShrinkFraction(saddle3ShrinkPerInch(deg)),
          ])}
        />
        <SeoParagraph>
          45° center / 22.5° sides is the everyday trade choice because the 2.5×
          multiplier and 3/16&quot; per inch shrink keep wire pulling smooth.
          Use 60° / 30° only when space on either side of the obstacle is tight.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <FaqSection page={copy} toolName={TOOL_NAME} />

      <RelatedCalculators current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}
