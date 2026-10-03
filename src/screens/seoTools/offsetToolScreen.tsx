/**
 * SEO /offset 工具页。
 *
 * 产品验证（T62 要求，实现时自问自答）：
 * 1) 比心算快多少？30° 时心算是「高度 ×2 = mark 间距、高度 ×¼ = shrink」，
 *    熟练电工约 5–8 秒；本页输入高度后一点 30° 预设再点 Calculate，约 2–3 秒，
 *    而且顺带给出一对 mark 的绝对位置（心算还要再加一次）。22.5°/45° 这类
 *    非整数倍角度，心算几乎必查表，本页 1 秒出结果，差距更大。
 * 2) 3 秒能看懂吗？能：h1 下一句 "Enter height → pick angle → Calculate"，
 *    按钮就叫 Calculate，输入框标签是 "Offset height (rise)"。
 *
 * 首屏布局（390×844，黄金路径 = 输入 → 计算 → 结果）：
 *   12 顶距 + 标题/引导约 53 + 12 + 输入卡约 366（含折叠的起点输入）+ 12 +
 *   结果卡约 153 + 8 + 复制按钮 48 ≈ 664pt < 手机可视高度（~700pt）。
 *   说明文、对照表、FAQ 全部排在结果区之后，首屏无需滚动。
 *
 * 横屏：SeoCalcLayout 在宽 ≥600 且宽 > 高时把输入卡与结果卡左右并排。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { calculateOffset } from '../../calculators/offset/offset';
import ImperialInput from '../../components/imperialInput';
import type { OffsetAngle } from '../../constants';
import {
  useCalculatorAnalytics,
  useSeoToolCalculateAnalytics,
} from '../../lib/analytics';
import { buildOffsetCopyText } from '../../lib/copyResult';
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

const PAGE = getSeoToolPage('offset');
const DEFAULT_ANGLE: OffsetAngle = 30;
/** GA4 tool_name 口径。 */
const TOOL_NAME = 'offset' as const;

// v2: preset 接口 —— 把本页的常用角度预设集中在这里；以后加场景预设只动这个数组。
const ANGLE_PRESETS: readonly SeoQuickPreset[] = DEFAULT_ANGLE_PRESETS;

interface CommittedOffset {
  heightInches: number;
  startInches: number | null;
  angle: OffsetAngle;
}

export default function OffsetToolScreen() {
  const theme = useTheme();
  const { unit, setUnit } = useUnitSystem();
  const [riseText, setRiseText] = useState('');
  const [startText, setStartText] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [angle, setAngle] = useState<OffsetAngle>(DEFAULT_ANGLE);
  const [committed, setCommitted] = useState<CommittedOffset | null>(null);
  const { entries, loaded, add, clear } = useSeoHistory('offset');

  const calculate = useCallback(
    (override?: {
      angle?: OffsetAngle;
      heightText?: string;
      startText?: string;
    }) => {
      const heightText = override?.heightText ?? riseText;
      const start = override?.startText ?? startText;
      const nextAngle = override?.angle ?? angle;
      const height = parseLength(heightText, unit);
      if (height === null || height <= 0) {
        setCommitted(null);
        return;
      }
      const startInches =
        start.trim() === '' ? null : parseLength(start, unit);
      setCommitted({ heightInches: height, startInches, angle: nextAngle });
    },
    [angle, riseText, startText, unit],
  );

  // 单点触发的选择（角度）立即重算；文本输入才需要按 Calculate 确认。
  const applyAngle = useCallback(
    (next: OffsetAngle) => {
      setAngle(next);
      calculate({ angle: next });
    },
    [calculate],
  );

  const result = useMemo(
    () => (committed ? calculateOffset(committed.heightInches, committed.angle) : null),
    [committed],
  );

  const spacing = result ? result.distanceBetweenBends : null;
  const mark1 = committed ? (committed.startInches ?? 0) : 0;
  const mark2 = spacing !== null ? mark1 + spacing : null;

  const committedSignature = committed
    ? `${committed.heightInches}|${committed.startInches ?? ''}|${committed.angle}`
    : null;

  useCalculatorAnalytics('offset', committedSignature);
  useSeoToolCalculateAnalytics(TOOL_NAME, committedSignature);

  // 按下 Calculate 得到有效结果后写入历史（相同输入不重复写）。
  useEffect(() => {
    if (!committed || !result || !committedSignature) {
      return;
    }
    add(
      createSeoHistoryEntry({
        kind: 'offset',
        inputSummary: `${formatSeoLength(committed.heightInches, unit)} @ ${committed.angle}°`,
        summary: `spacing ${formatSeoLength(result.distanceBetweenBends, unit)}, shrink ${formatSeoLength(result.shrink, unit)}`,
        params: {
          heightText: riseText,
          startText,
          angle: committed.angle,
          unit,
          startTextOpen: startOpen,
        },
        signature: committedSignature,
      }),
    );
    // 只在新的有效计算出现时写一次；unit/文案变化由 store 去重。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedSignature]);

  const handleRefill = useCallback(
    (entry: SeoHistoryEntry) => {
      const params = entry.params;
      const entryUnit = params.unit ?? 'fractional';
      setUnit(entryUnit);
      if (params.heightText !== undefined) {
        setRiseText(params.heightText);
      }
      if (params.startText !== undefined) {
        setStartText(params.startText);
      }
      if (params.startTextOpen !== undefined) {
        setStartOpen(params.startTextOpen);
      }
      const nextAngle = params.angle ?? DEFAULT_ANGLE;
      setAngle(nextAngle);
      const height = params.heightText
        ? parseLength(params.heightText, entryUnit)
        : null;
      if (height !== null && height > 0) {
        const startInches =
          params.startText && params.startText.trim() !== ''
            ? parseLength(params.startText, entryUnit)
            : null;
        setCommitted({ heightInches: height, startInches, angle: nextAngle });
      }
    },
    [setUnit],
  );

  const copyText =
    result && committed
      ? buildOffsetCopyText({
          angle: committed.angle,
          spacing: result.distanceBetweenBends,
          shrink: result.shrink,
          mark1,
          mark2,
          unit,
        })
      : '';

  return (
    <SeoPage>
      <View style={{ gap: 4 }}>
        <SeoHeading level={1}>{PAGE.h1}</SeoHeading>
        <SeoHint>Enter height, pick an angle, tap Calculate.</SeoHint>
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

            <ImperialInput
              label="Offset height (rise)"
              value={riseText}
              onChangeText={setRiseText}
              unit={unit}
              placeholder={unit === 'metric' ? 'e.g. 150 mm' : 'e.g. 6"'}
            />

            {startOpen ? (
              <View>
                <ImperialInput
                  label="Start of offset from conduit end (optional)"
                  value={startText}
                  onChangeText={setStartText}
                  unit={unit}
                  placeholder={unit === 'metric' ? 'e.g. 300 mm' : 'e.g. 12"'}
                />
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: startOpen }}
              onPress={() => setStartOpen((open) => !open)}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <Text
                style={{
                  color: theme.colors.primaryText,
                  fontSize: theme.fontSize.secondary,
                  fontWeight: theme.fontWeight.semibold,
                  textDecorationLine: 'underline',
                }}
              >
                {startOpen ? '− Hide start position' : '+ Add start position (optional)'}
              </Text>
            </Pressable>

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
              headline="Mark spacing"
              headlineValue={
                spacing !== null ? formatSeoLength(spacing, unit) : undefined
              }
              rows={[
                {
                  label: 'Shrink (add to cut length)',
                  value: result ? formatSeoLength(result.shrink, unit) : '—',
                },
                {
                  label: 'Mark 1 → Mark 2',
                  value:
                    result && mark2 !== null
                      ? `${formatSeoLength(mark1, unit)} → ${formatSeoLength(mark2, unit)}`
                      : '—',
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

      <SeoSection title="What is an offset bend?">
        <SeoParagraph>{PAGE.tagline}</SeoParagraph>
        <SeoParagraph>
          Mark spacing equals the offset height multiplied by the multiplier for
          your angle. At 30° the multiplier is 2.0, so a 6&quot; offset needs
          12&quot; between marks. Bend the first mark to 30°, flip the bender
          180°, line the arrow up with the second mark, and bend back to 30°.
        </SeoParagraph>
      </SeoSection>

      <SeoSection title="Offset multiplier and shrink chart">
        <OffsetMultiplierTable />
        <SeoParagraph>
          30° is the everyday choice: the math is a clean ×2 and shrink stays
          moderate. Go to 22.5° or 10° when shrink must be minimized, and to
          45° or 60° when a tall obstacle has to be cleared in a short distance.
        </SeoParagraph>
      </SeoSection>

      <FaqSection page={PAGE} toolName={TOOL_NAME} />

      <MoreFreeTools current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}
