/**
 * SEO /wire-size 工具页。
 *
 * 信息层级（T64 / T39）：
 *   L1 输入卡（Load Amps / Copper or Aluminum / 60°C·75°C·90°C / 125% Continuous）+ 结果卡（40pt Recommended AWG + Ampacity / Design Load + NEC 240.4(D) 提醒）；
 *   L2 最近计算历史 + Value-First App CTA 卡；
 *   L3 NEC Table 310.16 原理与载流量速查表（SeoCollapsibleSection 默认折叠）；
 *   L4 FAQ（灰色手风琴，默认收起）+ RelatedCalculators。
 *
 * 首屏布局（390×844，T66 间距体系 16/24/32）：
 *   移动端（<600pt）：顶距 16 + 品牌栏 28 + 16 + 标题/引导约 44 + 16
 *   + 输入卡约 432 = 结果卡顶部约 552pt，40pt 主结果数字落在可视区内。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';

import {
  calculateWireSize,
  defaultTempColumn,
} from '../../calculators/wireSize/wireSize';
import NumberField, { parseNumberInput } from '../../components/numberField';
import OptionRow from '../../components/optionRow';
import {
  AMPACITY_310_16,
  CONTINUOUS_LOAD_FACTOR,
  TEMP_COLUMNS,
  wireSizeLabel,
  type ConductorMetal,
  type TempColumn,
  type WireSize,
} from '../../constants';
import { useI18n } from '../../i18n';
import {
  useCalculatorAnalytics,
  useSeoToolCalculateAnalytics,
} from '../../lib/analytics';
import { buildWireSizeCopyText } from '../../lib/copyResult';
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

const PAGE = getSeoToolPage('wireSize');
const TOOL_NAME = 'wire-size' as const;

const COLUMN_CHOICES = ['auto', ...TEMP_COLUMNS] as const;
type ColumnChoice = (typeof COLUMN_CHOICES)[number];

const QUICK_TABLE_SIZES: readonly WireSize[] = [
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
  '350',
  '500',
];

interface CommittedWireSize {
  amps: number;
  metal: ConductorMetal;
  continuous: boolean;
  column: ColumnChoice;
}

function formatAmps(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function WireSizeToolScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const copy = getSeoToolPageCopy(PAGE, lang);

  const [ampsText, setAmpsText] = useState('');
  const [metal, setMetal] = useState<ConductorMetal>('copper');
  const [continuous, setContinuous] = useState<boolean>(false);
  const [column, setColumn] = useState<ColumnChoice>('auto');
  const [committed, setCommitted] = useState<CommittedWireSize | null>(null);
  const { entries, loaded, add, clear } = useSeoHistory('wireSize');

  const parsedAmps = parseNumberInput(ampsText);
  const ampsInvalid =
    ampsText.trim() !== '' &&
    (parsedAmps === null || parsedAmps <= 0 || parsedAmps > 2000);

  const commitSelection = useCallback(
    (override?: {
      ampsText?: string;
      metal?: ConductorMetal;
      continuous?: boolean;
      column?: ColumnChoice;
      dismissKeyboard?: boolean;
    }) => {
      if (override?.dismissKeyboard) {
        Keyboard.dismiss();
      }
      const nextAmpsText = override?.ampsText ?? ampsText;
      const nextMetal = override?.metal ?? metal;
      const nextContinuous = override?.continuous ?? continuous;
      const nextColumn = override?.column ?? column;
      const nextAmps = parseNumberInput(nextAmpsText);
      if (nextAmps === null || nextAmps <= 0 || nextAmps > 2000) {
        setCommitted(null);
        return;
      }
      setCommitted({
        amps: nextAmps,
        metal: nextMetal,
        continuous: nextContinuous,
        column: nextColumn,
      });
    },
    [ampsText, column, continuous, metal],
  );

  const preview = useMemo<CommittedWireSize | null>(() => {
    if (parsedAmps === null || parsedAmps <= 0 || parsedAmps > 2000) {
      return null;
    }
    return { amps: parsedAmps, metal, continuous, column };
  }, [column, continuous, metal, parsedAmps]);

  const activeInput = preview ?? committed;

  const result = useMemo(() => {
    if (!activeInput) return null;
    return calculateWireSize({
      metal: activeInput.metal,
      amps: activeInput.amps,
      continuous: activeInput.continuous,
      column: activeInput.column === 'auto' ? undefined : activeInput.column,
    });
  }, [activeInput]);

  const committedResult = useMemo(() => {
    if (!committed) return null;
    return calculateWireSize({
      metal: committed.metal,
      amps: committed.amps,
      continuous: committed.continuous,
      column: committed.column === 'auto' ? undefined : committed.column,
    });
  }, [committed]);

  const committedSignature =
    committed && committedResult
      ? `${committed.metal}|${committed.amps}|${committed.continuous}|${committed.column}|${committedResult.size}`
      : null;

  useCalculatorAnalytics('wire_sizing', committedSignature, {
    unitSystem: 'imperial',
  });
  useSeoToolCalculateAnalytics(TOOL_NAME, committedSignature);
  useSeoAmplitudeCalculation({
    calculator: 'wire_sizing',
    toolName: TOOL_NAME,
    pageSlug: PAGE.slug,
    signature: committedSignature,
    unitMode: 'fractional',
  });

  useEffect(() => {
    if (!committed || !committedResult || !committedSignature) {
      return;
    }
    const metalShort = committed.metal === 'copper' ? 'Cu' : 'Al';
    const contTag = committed.continuous ? ' ×125%' : '';
    add(
      createSeoHistoryEntry({
        kind: 'wireSize',
        inputSummary: `${formatAmps(committed.amps)} A${contTag} · ${metalShort} · ${committedResult.column}°C`,
        summary: `${wireSizeLabel(committedResult.size)} (${committedResult.ampacity} A)`,
        params: {
          ampsText: String(committed.amps),
          metal: committed.metal,
          continuous: committed.continuous,
          tempColumn: committed.column,
        },
        signature: committedSignature,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedSignature]);

  const handleRefill = useCallback((entry: SeoHistoryEntry) => {
    const params = entry.params;
    const nextAmpsText = params.ampsText ?? '';
    const nextMetal = params.metal ?? 'copper';
    const nextContinuous = params.continuous ?? false;
    const nextColumn = params.tempColumn ?? 'auto';
    setAmpsText(nextAmpsText);
    setMetal(nextMetal);
    setContinuous(nextContinuous);
    setColumn(nextColumn);
    const parsed = parseNumberInput(nextAmpsText);
    if (parsed !== null && parsed > 0 && parsed <= 2000) {
      setCommitted({
        amps: parsed,
        metal: nextMetal,
        continuous: nextContinuous,
        column: nextColumn,
      });
    }
  }, []);

  const metalDisplay = (m: ConductorMetal) =>
    m === 'copper' ? t('wireSize.copper') : t('wireSize.aluminum');

  const autoColumnLabel =
    parsedAmps !== null && parsedAmps > 0
      ? t('wireSize.tempAuto', {
          col: defaultTempColumn(
            continuous ? parsedAmps * CONTINUOUS_LOAD_FACTOR : parsedAmps,
          ),
        })
      : t('wireSize.tempAutoDefault');

  const copyText =
    result && activeInput
      ? buildWireSizeCopyText({
          metalLabel: activeInput.metal === 'copper' ? 'Copper' : 'Aluminum',
          wireLabel: wireSizeLabel(result.size),
          amps: activeInput.amps,
          requiredAmps: result.requiredAmps,
          continuous: activeInput.continuous,
          column: result.column,
          ampacity: result.ampacity,
        })
      : '';

  return (
    <SeoPage activeTool={PAGE.key}>
      <View style={{ gap: theme.spacing.xs }}>
        <SeoHeading level={1} style={{ fontSize: 20 }}>
          {copy.h1}
        </SeoHeading>
        <SeoHint>{t('wireSize.seoHint')}</SeoHint>
      </View>

      <SeoWorkspace>
        <SeoCalcLayout
          input={
            <SeoCard>
              <NumberField
                label={t('wireSize.ampsLabel')}
                unit="A"
                value={ampsText}
                onChangeText={setAmpsText}
                placeholder={t('wireSize.ampsPlaceholder')}
                error={ampsInvalid ? t('wireSize.ampsError') : undefined}
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
                label={t('wireSize.continuousLabel')}
                options={['no', 'yes'] as const}
                value={continuous ? 'yes' : 'no'}
                format={(v) =>
                  v === 'yes'
                    ? t('wireSize.continuousYes')
                    : t('wireSize.continuousNo')
                }
                onChange={(next) => {
                  const nextBool = next === 'yes';
                  setContinuous(nextBool);
                  commitSelection({ continuous: nextBool });
                }}
              />

              <OptionRow
                label={t('wireSize.tempLabel')}
                options={COLUMN_CHOICES}
                value={column}
                format={(c) => (c === 'auto' ? autoColumnLabel : `${c}°C`)}
                onChange={(next) => {
                  setColumn(next);
                  commitSelection({ column: next });
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
                headline={t('wireSize.headline')}
                headlineValue={result ? wireSizeLabel(result.size) : undefined}
                rows={
                  result && activeInput
                    ? [
                        {
                          label: t('wireSize.ampacityRow', {
                            col: result.column,
                          }),
                          value: `${result.ampacity} A`,
                        },
                        {
                          label: t('wireSize.designLoadRow'),
                          value: `${formatAmps(result.requiredAmps)} A`,
                        },
                        {
                          label: t('wireSize.materialRow'),
                          value: `${metalDisplay(activeInput.metal)} · ${result.column}°C`,
                        },
                      ]
                    : [
                        {
                          label: t('wireSize.ampacityRow', {
                            col: column === 'auto' ? 75 : column,
                          }),
                          value: '—',
                        },
                        { label: t('wireSize.designLoadRow'), value: '—' },
                      ]
                }
              />

              {activeInput && !result ? (
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
                    {t('wireSize.over500Error')}
                  </Text>
                </View>
              ) : null}

              {result?.smallConductorRuleApplied ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius,
                    padding: theme.spacing.sm,
                    backgroundColor: theme.colors.card,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: theme.fontSize.secondary,
                    }}
                  >
                    {t('wireSize.smallRuleNote')}
                  </Text>
                </View>
              ) : null}

              {result?.column === 90 ? (
                <View
                  accessibilityRole="alert"
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.accent,
                    borderRadius: theme.radius,
                    padding: theme.spacing.sm,
                    backgroundColor: theme.colors.card,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontSize: theme.fontSize.secondary,
                      fontWeight: theme.fontWeight.semibold,
                    }}
                  >
                    {t('wireSize.temp90Warning')}
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
                {t('wireSize.necNote')}
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

      <SeoCollapsibleSection title={t('wireSize.whatTitle')}>
        <SeoParagraph>{copy.tagline}</SeoParagraph>
        <SeoParagraph>
          NEC Table 310.16 rates insulated conductors for up to three
          current-carrying conductors in a raceway at 30°C (86°F) ambient.
          Per NEC 110.14(C)(1), circuits 100 A or less default to the 60°C
          column unless terminations are rated 75°C; circuits over 100 A use
          the 75°C column. Continuous loads (3+ hours) require multiplying load
          amps by 125% (NEC 210.19(A)(1)).
        </SeoParagraph>
      </SeoCollapsibleSection>

      <SeoCollapsibleSection title={t('wireSize.chartTitle')}>
        <SeoDataTable
          columns={[
            t('wireSize.tableSize'),
            'Cu 60°C',
            'Cu 75°C',
            'Cu 90°C',
            'Al 75°C',
          ]}
          rows={QUICK_TABLE_SIZES.map((sz) => {
            const cu = AMPACITY_310_16.copper[sz];
            const al = AMPACITY_310_16.aluminum[sz];
            return [
              wireSizeLabel(sz),
              cu ? `${cu[0]} A` : '—',
              cu ? `${cu[1]} A` : '—',
              cu ? `${cu[2]} A` : '—',
              al ? `${al[1]} A` : '—',
            ];
          })}
        />
        <SeoParagraph>
          NEC 240.4(D) limits standard overcurrent protection to 15 A for 14 AWG
          Cu, 20 A for 12 AWG Cu (15 A Al), and 30 A for 10 AWG Cu (25 A Al).
          For long conduit runs, always verify voltage drop under 3%.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <FaqSection page={copy} toolName={TOOL_NAME} />

      <RelatedCalculators current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}
