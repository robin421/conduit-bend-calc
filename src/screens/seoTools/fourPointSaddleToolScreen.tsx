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
 * 首屏布局（390×844）：12 + 标题/引导 53 + 12 + 输入卡约 310（高/宽并排）+ 12
 *   + 结果卡约 189 + 8 + 复制按钮 48 ≈ 644pt，落在手机可视高度内；说明文/表格/FAQ 全在下方。
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
import { getSeoToolPage } from '../../seo/toolPages';
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
  SeoCopyButton,
  SeoHeading,
  SeoHint,
  SeoHistoryList,
  SeoPage,
  SeoParagraph,
  SeoResultCard,
  SeoSection,
  SeoUnitToggle,
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
    <SeoPage>
      <View style={{ gap: 4 }}>
        <SeoHeading level={1}>{PAGE.h1}</SeoHeading>
        <SeoHint>Enter height and width, pick an angle, tap Calculate.</SeoHint>
      </View>

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
                Units
              </Text>
              <SeoUnitToggle value={unit} onChange={setUnit} toolName={TOOL_NAME} />
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <ImperialInput
                style={{ flex: 1 }}
                label="Obstruction height"
                value={heightText}
                onChangeText={setHeightText}
                unit={unit}
                placeholder={unit === 'metric' ? 'e.g. 150 mm' : 'e.g. 6"'}
              />
              <ImperialInput
                style={{ flex: 1 }}
                label="Obstruction width"
                value={widthText}
                onChangeText={setWidthText}
                unit={unit}
                placeholder={unit === 'metric' ? 'e.g. 100 mm' : 'e.g. 4"'}
              />
            </View>

            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.secondary,
              }}
            >
              Bend angle
            </Text>
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
          <View style={{ gap: theme.spacing.sm }}>
            <SeoResultCard
              headline="Mark spacing (obstacle edge ↔ bend)"
              headlineValue={
                result ? formatSeoLength(result.markSpacingInches, unit) : undefined
              }
              rows={[
                {
                  label: 'Mark 1 → Mark 4 (total span)',
                  value: result ? formatSeoLength(result.spanInches, unit) : '—',
                },
                {
                  label: 'Total shrink (add to cut length)',
                  value:
                    result && result.totalShrinkInches !== undefined
                      ? formatSeoLength(result.totalShrinkInches, unit)
                      : '—',
                },
                {
                  label: 'Marks left → right of center',
                  value: marksLine,
                },
              ]}
            />
            <SeoCopyButton text={copyText} disabled={!result} toolName={TOOL_NAME} />
          </View>
        }
      />

      <SeoHistoryList
        entries={entries}
        loaded={loaded}
        onRefill={handleRefill}
        onClear={clear}
        toolName={TOOL_NAME}
      />

      <SeoSection title="What is a 4-point saddle?">
        <SeoParagraph>{PAGE.tagline}</SeoParagraph>
        <SeoParagraph>
          Each half is a standard offset, so the outer marks sit one mark
          spacing outside each obstacle edge and the inner marks land on the
          edges. Mark all four points before bending, keep the same angle on all
          four bends so both ends stay parallel, and test-fit before the final
          cut.
        </SeoParagraph>
      </SeoSection>

      <SeoSection title="Multiplier and shrink chart">
        <OffsetMultiplierTable />
        <SeoParagraph>
          A 4-point saddle shrinks twice — once per offset. Two 4&quot; offsets
          at 30° eat 2 × (4 × 1/4&quot;) = 2&quot; of run length, so add the
          total shrink to your cut length.
        </SeoParagraph>
      </SeoSection>

      <FaqSection page={PAGE} toolName={TOOL_NAME} />

      <MoreFreeTools current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}
