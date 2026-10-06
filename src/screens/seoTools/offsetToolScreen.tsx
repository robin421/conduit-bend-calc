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
 * 信息层级（T64）：
 *   L1 输入卡 + 结果卡（同属一个 SeoWorkspace 工作区）；
 *   L2 单位切换 / 角度预设 / 最近计算历史，紧贴 L1；
 *   L3 说明文、倍数表 → SeoCollapsibleSection，浅灰底、小字、默认收起；
 *   L4 FAQ → 灰色手风琴，默认收起。
 *
 * 首屏布局（390×844，黄金路径 = 输入 → 计算 → 结果）：
 *   T66 间距体系：区块间距统一 16/24/32（8pt 网格）。
 *   移动端（<600pt）：顶距 16 + 品牌栏 28（含汉堡）+ 16 + 标题/引导约 44 + 16
 *   + 输入卡约 460（16pt 内距 / 16pt 行距；角度选择为 3 列 × 2 行 = 136pt）= 结果卡顶部约 604pt，
 *   标题 + 40pt 结果数字落在 ~700pt 手机可视区内。
 *   桌面端（≥600pt）再多一条切换条（+ 16 + 34）。L3/L4 全部在结果区之后且默认收起，不占首屏。
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
import { getSeoToolPage, getSeoToolPageCopy } from '../../seo/toolPages';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme';
import {
  AngleSelector,
  DEFAULT_ANGLE_PRESETS,
  FaqSection,
  formatSeoLength,
  RelatedCalculators,
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
  const { lang, t } = useI18n();
  const copy = getSeoToolPageCopy(PAGE, lang);
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
    <SeoPage activeTool={PAGE.key}>
      <View style={{ gap: theme.spacing.xs }}>
        <SeoHeading level={1} style={{ fontSize: 20 }}>
          {copy.h1}
        </SeoHeading>
        <SeoHint>{t('offset.hint')}</SeoHint>
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

            <ImperialInput
              label={t('offset.heightLabel')}
              value={riseText}
              onChangeText={setRiseText}
              unit={unit}
              placeholder={
                unit === 'metric'
                  ? t('placeholder.mm150')
                  : t('placeholder.inch6')
              }
            />

            {startOpen ? (
              <View>
                <ImperialInput
                  label={t('offset.startLabel')}
                  value={startText}
                  onChangeText={setStartText}
                  unit={unit}
                  placeholder={
                    unit === 'metric'
                      ? t('placeholder.mm300')
                      : t('placeholder.inch12')
                  }
                />
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: startOpen }}
              onPress={() => setStartOpen((open) => !open)}
              style={{ minHeight: 40, justifyContent: 'center' }}
            >
              <Text
                style={{
                  color: theme.colors.primaryText,
                  fontSize: theme.fontSize.secondary,
                  fontWeight: theme.fontWeight.semibold,
                  textDecorationLine: 'underline',
                }}
              >
                {startOpen ? t('offset.hideStart') : t('offset.addStart')}
              </Text>
            </Pressable>

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
              headline={t('offset.markSpacing')}
              headlineValue={
                spacing !== null ? formatSeoLength(spacing, unit) : undefined
              }
              rows={[
                {
                  label: t('offset.shrinkLabel'),
                  value: result ? formatSeoLength(result.shrink, unit) : '—',
                },
                {
                  label: t('offset.mark1to2'),
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
      </SeoWorkspace>

      <SeoHistoryList
        entries={entries}
        loaded={loaded}
        onRefill={handleRefill}
        onClear={clear}
        toolName={TOOL_NAME}
      />

      <SeoCollapsibleSection title={t('offset.whatTitle')}>
        <SeoParagraph>{copy.tagline}</SeoParagraph>
        <SeoParagraph>
          Mark spacing equals the offset height multiplied by the multiplier for
          your angle. At 30° the multiplier is 2.0, so a 6&quot; offset needs
          12&quot; between marks. Bend the first mark to 30°, flip the bender
          180°, line the arrow up with the second mark, and bend back to 30°.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <SeoCollapsibleSection title={t('offset.chartTitle')}>
        <OffsetMultiplierTable />
        <SeoParagraph>
          30° is the everyday choice: the math is a clean ×2 and shrink stays
          moderate. Go to 22.5° or 10° when shrink must be minimized, and to
          45° or 60° when a tall obstacle has to be cleared in a short distance.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <FaqSection page={copy} toolName={TOOL_NAME} />

      <RelatedCalculators current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}
