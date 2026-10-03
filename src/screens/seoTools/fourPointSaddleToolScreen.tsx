/**
 * SEO /4-point-saddle 工具页。
 *
 * 产品验证（T62 要求）：
 * 1) 比心算快多少？4 点 saddle 要算「每侧 mark 间距 = 高度 × multiplier」+
 *    「总 shrink = 2 × 单侧 shrink」+ 4 个 mark 相对中心的坐标，心算至少 20–30 秒
 *    且容易记错左右；本页输入长宽、点预设、Calculate，3 秒出全套坐标。
 * 2) 3 秒能看懂吗？能：引导句 "Enter height and width, pick an angle, tap Calculate"，
 *    两个输入框标签分别写明是障碍物的高与宽。
 *
 * 信息层级（T64）：L1 输入+结果工作区 / L2 单位·角度·历史 /
 *   L3 说明文·倍数表（浅灰折叠）/ L4 FAQ（灰色手风琴）。
 *
 * 首屏布局（390×844，T66 间距体系 16/24/32）：顶距 16 + 品牌栏 28（含汉堡）+ 16
 *   + 标题/引导约 44 + 16 + 高/宽输入卡约 372 = 结果卡顶部约 516pt，
 *   落在 ~700pt 手机可视区内；L3/L4 全在结果之后且默认收起。
 * 横屏用 SeoCalcLayout 左右分栏。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { calculateFourPointSaddle } from '../../calculators/saddle/saddle';
import ImperialInput from '../../components/imperialInput';
import type { OffsetAngle } from '../../constants';
import {
  useCalculatorAnalytics,
  useSeoToolCalculateAnalytics,
} from '../../lib/analytics';
import { buildSaddleCopyText } from '../../lib/copyResult';
import { createSeoHistoryEntry, type SeoHistoryEntry } from '../../lib/seoHistory';
import { parseLength } from '../../lib/units';
import { useUnitSystem } from '../../lib/unitStore';
import { useSeoHistory } from '../../lib/useSeoHistory';
import { getSeoToolPage, getSeoToolPageCopy } from '../../seo/toolPages';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme';
import {
  AngleSelector,
  DEFAULT_ANGLE_PRESETS,
  FaqSection,
  formatSeoLength,
  MoreFreeTools,
  OffsetMultiplierTable,
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
  type SeoQuickPreset,
} from './seoLayout';

const PAGE = getSeoToolPage('saddle4');
const DEFAULT_ANGLE: OffsetAngle = 30;
/** GA4 tool_name 口径。 */
const TOOL_NAME = '4-point-saddle' as const;

// v2: preset 接口 —— 本页常用角度预设集中定义。
const ANGLE_PRESETS: readonly SeoQuickPreset[] = DEFAULT_ANGLE_PRESETS;

interface CommittedSaddle {
  heightInches: number;
  widthInches: number;
  angle: OffsetAngle;
}

export default function FourPointSaddleToolScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const copy = getSeoToolPageCopy(PAGE, lang);
  const { unit, setUnit } = useUnitSystem();
  const [heightText, setHeightText] = useState('');
  const [widthText, setWidthText] = useState('');
  const [angle, setAngle] = useState<OffsetAngle>(DEFAULT_ANGLE);
  const [committed, setCommitted] = useState<CommittedSaddle | null>(null);
  const { entries, loaded, add, clear } = useSeoHistory('saddle4');

  const calculate = useCallback(
    (override?: {
      angle?: OffsetAngle;
      heightText?: string;
      widthText?: string;
    }) => {
      const heightTextValue = override?.heightText ?? heightText;
      const widthTextValue = override?.widthText ?? widthText;
      const nextAngle = override?.angle ?? angle;
      const height = parseLength(heightTextValue, unit);
      const width = parseLength(widthTextValue, unit);
      if (height === null || height <= 0 || width === null || width <= 0) {
        setCommitted(null);
        return;
      }
      setCommitted({ heightInches: height, widthInches: width, angle: nextAngle });
    },
    [angle, heightText, widthText, unit],
  );

  const applyAngle = useCallback(
    (next: OffsetAngle) => {
      setAngle(next);
      calculate({ angle: next });
    },
    [calculate],
  );

  const result = useMemo(
    () =>
      committed
        ? calculateFourPointSaddle(
            committed.heightInches,
            committed.widthInches,
            committed.angle,
          )
        : null,
    [committed],
  );

  const marksLine = result
    ? result.marks
        .map((mark) => {
          const side =
            mark.fromCenterInches < 0
              ? 'L'
              : mark.fromCenterInches > 0
                ? 'R'
                : '';
          return `${formatSeoLength(Math.abs(mark.fromCenterInches), unit)}${side}`;
        })
        .join(' · ')
    : '—';

  const committedSignature = committed
    ? `${committed.heightInches}|${committed.widthInches}|${committed.angle}`
    : null;

  useCalculatorAnalytics('saddle4', committedSignature);
  useSeoToolCalculateAnalytics(TOOL_NAME, committedSignature);

  useEffect(() => {
    if (!committed || !result || !committedSignature) {
      return;
    }
    add(
      createSeoHistoryEntry({
        kind: 'saddle4',
        inputSummary: `${formatSeoLength(committed.heightInches, unit)} × ${formatSeoLength(committed.widthInches, unit)} @ ${committed.angle}°`,
        summary: `span ${formatSeoLength(result.spanInches, unit)}, spacing ${formatSeoLength(result.markSpacingInches, unit)}`,
        params: {
          heightText,
          widthText,
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
      if (params.widthText !== undefined) {
        setWidthText(params.widthText);
      }
      const nextAngle = params.angle ?? DEFAULT_ANGLE;
      setAngle(nextAngle);
      const height = params.heightText
        ? parseLength(params.heightText, entryUnit)
        : null;
      const width = params.widthText
        ? parseLength(params.widthText, entryUnit)
        : null;
      if (height !== null && height > 0 && width !== null && width > 0) {
        setCommitted({ heightInches: height, widthInches: width, angle: nextAngle });
      }
    },
    [setUnit],
  );

  const copyText =
    result && committed
      ? buildSaddleCopyText({
          angle: committed.angle,
          markSpacing: result.markSpacingInches,
          span: result.spanInches,
          totalShrink: result.totalShrinkInches ?? null,
          unit,
        })
      : '';

  return (
    <SeoPage activeTool={PAGE.key}>
      <View style={{ gap: theme.spacing.xs }}>
        <SeoHeading level={1} style={{ fontSize: 20 }}>
          {copy.h1}
        </SeoHeading>
        <SeoHint>{t('saddle.hint')}</SeoHint>
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
              <SeoUnitToggle value={unit} onChange={setUnit} toolName={TOOL_NAME} />
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <ImperialInput
                style={{ flex: 1 }}
                label={t('saddle.heightLabel')}
                value={heightText}
                onChangeText={setHeightText}
                unit={unit}
                placeholder={
                  unit === 'metric'
                    ? t('placeholder.mm150')
                    : t('placeholder.inch6')
                }
              />
              <ImperialInput
                style={{ flex: 1 }}
                label={t('saddle.widthLabel')}
                value={widthText}
                onChangeText={setWidthText}
                unit={unit}
                placeholder={
                  unit === 'metric'
                    ? t('placeholder.mm100')
                    : t('placeholder.inch4')
                }
              />
            </View>

            <AngleSelector
              value={angle}
              onChange={applyAngle}
              presets={ANGLE_PRESETS}
              toolName={TOOL_NAME}
            />

            <View>
              <SeoCalculateButton onPress={() => calculate()} />
            </View>
          </SeoCard>
        }
        result={
          <View style={{ gap: theme.spacing.md }}>
            <SeoResultCard
              headline={t('saddle.markSpacing')}
              headlineValue={
                result ? formatSeoLength(result.markSpacingInches, unit) : undefined
              }
              rows={[
                {
                  label: t('saddle.span'),
                  value: result ? formatSeoLength(result.spanInches, unit) : '—',
                },
                {
                  label: t('saddle.totalShrink'),
                  value:
                    result && result.totalShrinkInches !== undefined
                      ? formatSeoLength(result.totalShrinkInches, unit)
                      : '—',
                },
                {
                  label: t('saddle.marksFromCenter'),
                  value: marksLine,
                },
              ]}
            />
            <SeoCopyButton text={copyText} disabled={!result} toolName={TOOL_NAME} />
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

      <SeoCollapsibleSection title={t('saddle.whatTitle')}>
        <SeoParagraph>{copy.tagline}</SeoParagraph>
        <SeoParagraph>
          Each half is a standard offset, so the outer marks sit one mark
          spacing outside each obstacle edge and the inner marks land on the
          edges. Mark all four points before bending, keep the same angle on all
          four bends so both ends stay parallel, and test-fit before the final
          cut.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <SeoCollapsibleSection title={t('saddle.chartTitle')}>
        <OffsetMultiplierTable />
        <SeoParagraph>
          A 4-point saddle shrinks twice — once per offset. Two 4&quot; offsets
          at 30° eat 2 × (4 × 1/4&quot;) = 2&quot; of run length, so add the
          total shrink to your cut length.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <FaqSection page={copy} toolName={TOOL_NAME} />

      <MoreFreeTools current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}
