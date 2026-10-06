/**
 * SEO /stub-up 工具页。
 *
 * 产品验证（T62 要求）：
 * 1) 比心算快多少？stub 心算是「目标高度 − take-up」，纯减法约 2 秒；本页
 *    选管径（预设 1/2" / 3/4" / 1" 一点即填）+ 输入 + Calculate 约 2 秒。
 *    速度与心算相当，但价值在于「不会拿错 take-up 表值」（1/2" 是 5" 不是 6"，
 *    现场最常见错误），所以交互重点放在管径预设而不是输入本身。
 * 2) 3 秒能看懂吗？能：管径按钮直接显示各自的 take-up，引导句说明先选管径。
 *
 * 信息层级（T64）：L1 输入+结果工作区 / L2 管径预设·单位·历史 /
 *   L3 说明文·take-up 表（浅灰折叠）/ L4 FAQ（灰色手风琴）。
 *
 * 首屏布局（390×844，T66 间距体系 16/24/32）：顶距 16 + 品牌栏 28（含汉堡）+ 16
 *   + 标题/引导约 44 + 16 + 管径预设输入卡约 360 = 结果卡顶部约 504pt，
 *   落在 ~700pt 手机可视区内；L3/L4 全在结果之后且默认收起。
 * 横屏用 SeoCalcLayout 左右分栏。
 *
 * 注：stub 是 90° 弯，没有角度参数，因此本页的「预设」是常用 EMT 管径，
 * 与其它三页的角度预设共用同一个 SeoQuickPreset 接口。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import ImperialInput from '../../components/imperialInput';
import { TAKE_UP_OPTIONS } from '../../constants';
import type { EmtTakeUpSize } from '../../constants';
import {
  useCalculatorAnalytics,
  useSeoToolCalculateAnalytics,
} from '../../lib/analytics';
import { buildStubCopyText } from '../../lib/copyResult';
import { createSeoHistoryEntry, type SeoHistoryEntry } from '../../lib/seoHistory';
import { parseLength } from '../../lib/units';
import { useUnitSystem } from '../../lib/unitStore';
import { useSeoHistory } from '../../lib/useSeoHistory';
import { getSeoToolPage, getSeoToolPageCopy } from '../../seo/toolPages';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme';
import {
  FaqSection,
  formatSeoLength,
  RelatedCalculators,
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
  type SeoQuickPreset,
} from './seoLayout';

const PAGE = getSeoToolPage('stubUp');
const DEFAULT_SIZE: EmtTakeUpSize = '1/2';
/** GA4 tool_name 口径。 */
const TOOL_NAME = 'stub-up' as const;

// v2: preset 接口 —— 本页是常用 EMT 管径；标签/提示在组件内按语言生成。

interface CommittedStub {
  heightInches: number;
  size: EmtTakeUpSize;
}

export default function StubUpToolScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const copy = getSeoToolPageCopy(PAGE, lang);
  const { unit, setUnit } = useUnitSystem();
  const sizePresets: readonly SeoQuickPreset[] = TAKE_UP_OPTIONS.map((option) => ({
    id: option.size,
    label: `${option.size}"`,
    hint: t('stub.takeUpHint', { takeUp: option.takeUpInches }),
  }));
  const [heightText, setHeightText] = useState('');
  const [size, setSize] = useState<EmtTakeUpSize>(DEFAULT_SIZE);
  const [committed, setCommitted] = useState<CommittedStub | null>(null);
  const { entries, loaded, add, clear } = useSeoHistory('stubUp');

  const option = useMemo(
    () => TAKE_UP_OPTIONS.find((entry) => entry.size === size) ?? TAKE_UP_OPTIONS[0],
    [size],
  );
  const takeUp = option.takeUpInches;

  const calculate = useCallback(
    (override?: { size?: EmtTakeUpSize; heightText?: string }) => {
      const nextSize = override?.size ?? size;
      const height = parseLength(override?.heightText ?? heightText, unit);
      if (height === null || height <= 0) {
        setCommitted(null);
        return;
      }
      setCommitted({ heightInches: height, size: nextSize });
    },
    [heightText, size, unit],
  );

  const applySize = useCallback(
    (next: EmtTakeUpSize) => {
      setSize(next);
      calculate({ size: next });
    },
    [calculate],
  );

  const committedTakeUp =
    committed === null
      ? null
      : (TAKE_UP_OPTIONS.find((entry) => entry.size === committed.size) ??
          TAKE_UP_OPTIONS[0]).takeUpInches;
  const mark =
    committed === null || committedTakeUp === null
      ? null
      : committed.heightInches - committedTakeUp;
  const tooShort = mark !== null && mark <= 0;

  const committedSignature = committed
    ? `${committed.heightInches}|${committed.size}`
    : null;

  useCalculatorAnalytics('stub', committedSignature);
  useSeoToolCalculateAnalytics(TOOL_NAME, committedSignature);

  useEffect(() => {
    if (!committed || mark === null || committedTakeUp === null || !committedSignature) {
      return;
    }
    add(
      createSeoHistoryEntry({
        kind: 'stubUp',
        inputSummary: `${formatSeoLength(committed.heightInches, unit)} · ${committed.size}" EMT`,
        summary: tooShort
          ? 'below minimum'
          : `mark ${formatSeoLength(mark, unit)}`,
        params: {
          heightText,
          size: committed.size,
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
      const nextSize = params.size ?? DEFAULT_SIZE;
      setSize(nextSize);
      const height = params.heightText
        ? parseLength(params.heightText, entryUnit)
        : null;
      if (height !== null && height > 0) {
        setCommitted({ heightInches: height, size: nextSize });
      }
    },
    [setUnit],
  );

  const copyText =
    mark !== null && !tooShort && committedTakeUp !== null
      ? buildStubCopyText({
          sizeLabel: `${committed?.size ?? DEFAULT_SIZE}" EMT`,
          takeUp: committedTakeUp,
          mark,
          unit,
        })
      : '';

  const displayTakeUp = committedTakeUp ?? takeUp;

  return (
    <SeoPage activeTool={PAGE.key}>
      <View style={{ gap: theme.spacing.xs }}>
        <SeoHeading level={1} style={{ fontSize: 20 }}>
          {copy.h1}
        </SeoHeading>
        <SeoHint>{t('stub.hint')}</SeoHint>
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
              label={t('stub.heightLabel')}
              value={heightText}
              onChangeText={setHeightText}
              unit={unit}
              placeholder={
                unit === 'metric'
                  ? t('placeholder.mm300')
                  : t('placeholder.inch12')
              }
            />

            <SeoPresetRow
              presets={sizePresets}
              activeId={size}
              toolName={TOOL_NAME}
              onSelect={(preset) => applySize(preset.id as EmtTakeUpSize)}
            />

            <View>
              <SeoCalculateButton onPress={() => calculate()} />
            </View>
          </SeoCard>
        }
        result={
          <View style={{ gap: theme.spacing.md }}>
            <SeoResultCard
              headline={t('stub.markLocation')}
              headlineValue={
                mark !== null && !tooShort ? formatSeoLength(mark, unit) : undefined
              }
              rows={[
                {
                  label: t('stub.targetHeight'),
                  value:
                    committed !== null
                      ? formatSeoLength(committed.heightInches, unit)
                      : '—',
                },
                { label: t('stub.takeUp'), value: `${displayTakeUp}"` },
              ]}
            />
            {tooShort ? (
              <Text
                style={{
                  color: theme.colors.error,
                  fontSize: theme.fontSize.secondary,
                }}
              >
                {t('stub.tooShort', { takeUp: displayTakeUp })}
              </Text>
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

      <SeoCollapsibleSection title={t('stub.whatTitle')}>
        <SeoParagraph>{copy.tagline}</SeoParagraph>
        <SeoParagraph>
          Mark location = target height − take-up. For a 12&quot; stub with
          1/2&quot; EMT: 12&quot; − 5&quot; = 7&quot; from the end. Put the
          bender arrow on the mark, bend to 90°, and the back of the bend lands
          at exactly 12&quot;.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <SeoCollapsibleSection title={t('stub.chartTitle')}>
        <TakeUpTable />
        <SeoParagraph>
          Take-up is a property of the bender head, not a formula — always
          confirm against the markings on the bender in your hands. If every
          stub comes out consistently off, bend one test stub on scrap and apply
          that correction.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <FaqSection page={copy} toolName={TOOL_NAME} />

      <RelatedCalculators current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}
