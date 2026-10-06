/**
 * SEO /shrink 工具页。
 *
 * 产品验证（T62 要求）：
 * 1) 比心算快多少？shrink 心算是「高度 × 每英寸 shrink 表值」（30° = ¼）；
 *    心算单次约 3–5 秒，本页选模式 + 输入 + Calculate 约 2 秒，且自动区分
 *    offset 单次 shrink 与 4 点 saddle 的两次 shrink（现场最容易漏的就是 ×2）。
 * 2) 3 秒能看懂吗？能：Offset / Saddle 两个大模式按钮把「算哪种 shrink」摆在最前，
 *    输入框写明 Offset height，引导句一句话说明。
 *
 * 信息层级（T64）：L1 输入+结果工作区 / L2 模式·角度·单位·历史 /
 *   L3 说明文·shrink 表（浅灰折叠）/ L4 FAQ（灰色手风琴）。
 *
 * 首屏布局（390×844，T66 间距体系 16/24/32）：顶距 16 + 品牌栏 28（含汉堡）+ 16
 *   + 标题/引导约 44 + 16 + 模式/角度输入卡约 472（角度选择 3 列 × 2 行 = 136pt）
 *   = 结果卡顶部约 616pt，落在 ~700pt 手机可视区内；L3/L4 全在结果之后且默认收起。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { calculateOffset } from '../../calculators/offset/offset';
import ImperialInput from '../../components/imperialInput';
import type { OffsetAngle } from '../../constants';
import {
  useCalculatorAnalytics,
  useSeoToolCalculateAnalytics,
} from '../../lib/analytics';
import { buildShrinkCopyText } from '../../lib/copyResult';
import { createSeoHistoryEntry, type SeoHistoryEntry, type ShrinkMode } from '../../lib/seoHistory';
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

const PAGE = getSeoToolPage('shrink');
const DEFAULT_ANGLE: OffsetAngle = 30;
/** GA4 tool_name 口径。 */
const TOOL_NAME = 'shrink' as const;

// v2: preset 接口 —— 本页常用角度预设集中定义。
const ANGLE_PRESETS: readonly SeoQuickPreset[] = DEFAULT_ANGLE_PRESETS;

const MODES = [
  { key: 'offset', labelKey: 'shrink.modeOffset' },
  { key: 'saddle', labelKey: 'shrink.modeSaddle' },
] as const;

interface CommittedShrink {
  heightInches: number;
  angle: OffsetAngle;
  mode: ShrinkMode;
}

export default function ShrinkToolScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const copy = getSeoToolPageCopy(PAGE, lang);
  const { unit, setUnit } = useUnitSystem();
  const [heightText, setHeightText] = useState('');
  const [angle, setAngle] = useState<OffsetAngle>(DEFAULT_ANGLE);
  const [mode, setMode] = useState<ShrinkMode>('offset');
  const [committed, setCommitted] = useState<CommittedShrink | null>(null);
  const { entries, loaded, add, clear } = useSeoHistory('shrink');

  const calculate = useCallback(
    (override?: {
      angle?: OffsetAngle;
      mode?: ShrinkMode;
      heightText?: string;
    }) => {
      const nextAngle = override?.angle ?? angle;
      const nextMode = override?.mode ?? mode;
      const height = parseLength(override?.heightText ?? heightText, unit);
      if (height === null || height <= 0) {
        setCommitted(null);
        return;
      }
      setCommitted({ heightInches: height, angle: nextAngle, mode: nextMode });
    },
    [angle, heightText, mode, unit],
  );

  const applyAngle = useCallback(
    (next: OffsetAngle) => {
      setAngle(next);
      calculate({ angle: next });
    },
    [calculate],
  );

  const applyMode = useCallback(
    (next: ShrinkMode) => {
      setMode(next);
      calculate({ mode: next });
    },
    [calculate],
  );

  const result = useMemo(
    () => (committed ? calculateOffset(committed.heightInches, committed.angle) : null),
    [committed],
  );

  const perInch =
    result && committed ? result.shrink / committed.heightInches : null;
  const totalShrink =
    result === null || committed === null
      ? null
      : committed.mode === 'saddle'
        ? result.shrink * 2
        : result.shrink;

  const committedSignature = committed
    ? `${committed.heightInches}|${committed.angle}|${committed.mode}`
    : null;

  useCalculatorAnalytics('shrink', committedSignature);
  useSeoToolCalculateAnalytics(TOOL_NAME, committedSignature);

  useEffect(() => {
    if (!committed || !result || !committedSignature) {
      return;
    }
    add(
      createSeoHistoryEntry({
        kind: 'shrink',
        inputSummary: `${formatSeoLength(committed.heightInches, unit)} @ ${committed.angle}° · ${committed.mode}`,
        summary: `shrink ${formatSeoLength(result.shrink * (committed.mode === 'saddle' ? 2 : 1), unit)}`,
        params: {
          heightText,
          angle: committed.angle,
          mode: committed.mode,
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
      const nextMode = params.mode ?? 'offset';
      setAngle(nextAngle);
      setMode(nextMode);
      const height = params.heightText
        ? parseLength(params.heightText, entryUnit)
        : null;
      if (height !== null && height > 0) {
        setCommitted({ heightInches: height, angle: nextAngle, mode: nextMode });
      }
    },
    [setUnit],
  );

  const copyText =
    result && committed && totalShrink !== null
      ? buildShrinkCopyText({
          mode: committed.mode,
          angle: committed.angle,
          shrink: totalShrink,
          unit,
        })
      : '';

  return (
    <SeoPage activeTool={PAGE.key}>
      <View style={{ gap: theme.spacing.xs }}>
        <SeoHeading level={1} style={{ fontSize: 20 }}>
          {copy.h1}
        </SeoHeading>
        <SeoHint>{t('shrink.hint')}</SeoHint>
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

            <View style={styles.modeRow}>
              {MODES.map((option) => {
                const selected = option.key === mode;
                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => applyMode(option.key)}
                    style={[
                      styles.modeButton,
                      {
                        backgroundColor: selected
                          ? theme.colors.accent
                          : theme.colors.background,
                        borderColor: selected
                          ? theme.colors.accent
                          : theme.colors.border,
                        borderRadius: theme.radius,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected
                          ? theme.colors.onAccent
                          : theme.colors.textPrimary,
                        fontSize: theme.fontSize.secondary,
                        fontWeight: theme.fontWeight.semibold,
                      }}
                    >
                      {t(option.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View>
              <ImperialInput
                label={t('shrink.heightLabel')}
                value={heightText}
                onChangeText={setHeightText}
                unit={unit}
                placeholder={
                  unit === 'metric'
                    ? t('placeholder.mm150')
                    : t('placeholder.inch6')
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
              headline={
                mode === 'saddle'
                  ? t('shrink.totalShrink')
                  : t('shrink.shrink')
              }
              headlineValue={
                totalShrink !== null ? formatSeoLength(totalShrink, unit) : undefined
              }
              rows={[
                {
                  label: t('shrink.perInch'),
                  value: perInch !== null ? formatSeoLength(perInch, unit) : '—',
                },
                {
                  label: t('shrink.lengthToAdd'),
                  value:
                    totalShrink !== null ? formatSeoLength(totalShrink, unit) : '—',
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

      <SeoCollapsibleSection title={t('shrink.whatTitle')}>
        <SeoParagraph>{copy.tagline}</SeoParagraph>
        <SeoParagraph>
          Multiply the offset height by the shrink per inch for your angle. A
          6&quot; offset at 30° shrinks 6 × 1/4&quot; = 1.5&quot;. Shrink is not
          the same as take-up: take-up is where the bend starts before the mark,
          shrink is the run length the bend eats.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <SeoCollapsibleSection title={t('shrink.chartTitle')}>
        <OffsetMultiplierTable />
        <SeoParagraph>
          Saddle mode doubles the offset shrink because a 4-point saddle is two
          offsets. A 3-point saddle uses its own smaller center shrink.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <FaqSection page={copy} toolName={TOOL_NAME} />

      <RelatedCalculators current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    minHeight: 48,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
