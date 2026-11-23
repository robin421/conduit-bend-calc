/**
 * SEO /conduit-fill 工具页。
 *
 * 信息层级（T64 / T30）：
 *   L1 输入卡（Raceway / Trade Size / Wire Size / Wire Count）+ 结果卡（40pt 最大根数 + 填充率验证）；
 *   L2 最近计算历史 + Value-First App CTA 卡；
 *   L3 NEC 填充原理 + NEC Table C.1 速查表（SeoCollapsibleSection 默认折叠）；
 *   L4 FAQ（灰色手风琴，默认收起）+ RelatedCalculators。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';

import {
  calculateConduitFill,
  maxSameSizeConductors,
} from '../../calculators/conduitFill/conduitFill';
import NumberField, { parseNumberInput } from '../../components/numberField';
import OptionRow from '../../components/optionRow';
import {
  RACEWAY_TYPES,
  TRADE_SIZES,
  WIRE_SIZES,
  wireSizeLabel,
  type RacewayType,
  type TradeSize,
  type WireSize,
} from '../../constants';
import { useI18n } from '../../i18n';
import {
  useCalculatorAnalytics,
  useSeoToolCalculateAnalytics,
} from '../../lib/analytics';
import { buildConduitFillCopyText } from '../../lib/copyResult';
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

const PAGE = getSeoToolPage('conduitFill');
const TOOL_NAME = 'conduit-fill' as const;

const RACEWAY_LABEL: Record<RacewayType, string> = {
  EMT: 'EMT',
  IMC: 'IMC',
  RMC: 'Rigid',
  PVC40: 'PVC',
};

const QUICK_TABLE_TRADES: readonly TradeSize[] = ['1/2', '3/4', '1', '1-1/4', '1-1/2', '2'];
const QUICK_TABLE_WIRES: readonly WireSize[] = ['14', '12', '10', '8', '6'];

/** 防止 "1-1/4" 在连字符处换行。 */
const tradeLabel = (size: TradeSize) => size.replace('-', '\u2011');

interface CommittedFill {
  raceway: RacewayType;
  trade: TradeSize;
  wire: WireSize;
  count?: number;
}

export default function ConduitFillToolScreen() {
  const theme = useTheme();
  const { lang, t } = useI18n();
  const copy = getSeoToolPageCopy(PAGE, lang);

  const [raceway, setRaceway] = useState<RacewayType>('EMT');
  const [trade, setTrade] = useState<TradeSize>('3/4');
  const [wire, setWire] = useState<WireSize>('12');
  const [countText, setCountText] = useState('');
  const [committed, setCommitted] = useState<CommittedFill | null>(null);
  const { entries, loaded, add, clear } = useSeoHistory('conduitFill');

  const parsedCount = parseNumberInput(countText);
  const countInvalid =
    countText.trim() !== '' &&
    (parsedCount === null || !Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 999);
  const validCount =
    countText.trim() === '' || countInvalid ? undefined : (parsedCount ?? undefined);

  const result = useMemo(
    () => calculateConduitFill(raceway, trade, wire, validCount),
    [raceway, trade, wire, validCount],
  );

  const commitSelection = useCallback(
    (override?: {
      raceway?: RacewayType;
      trade?: TradeSize;
      wire?: WireSize;
      countText?: string;
      dismissKeyboard?: boolean;
    }) => {
      if (override?.dismissKeyboard) {
        Keyboard.dismiss();
      }
      const nextRaceway = override?.raceway ?? raceway;
      const nextTrade = override?.trade ?? trade;
      const nextWire = override?.wire ?? wire;
      const nextCountText = override?.countText ?? countText;
      const nextParsed = parseNumberInput(nextCountText);
      const nextValid =
        nextCountText.trim() === ''
          ? undefined
          : nextParsed !== null && Number.isInteger(nextParsed) && nextParsed >= 1 && nextParsed <= 999
            ? nextParsed
            : null;
      if (nextValid === null) {
        return;
      }
      setCommitted({
        raceway: nextRaceway,
        trade: nextTrade,
        wire: nextWire,
        count: nextValid,
      });
    },
    [countText, raceway, trade, wire],
  );

  const committedSignature = committed
    ? `${committed.raceway}|${committed.trade}|${committed.wire}|${committed.count ?? ''}`
    : null;

  useCalculatorAnalytics('conduit_fill', committedSignature, {
    unitSystem: 'imperial',
  });
  useSeoToolCalculateAnalytics(TOOL_NAME, committedSignature);
  useSeoAmplitudeCalculation({
    calculator: 'conduit_fill',
    toolName: TOOL_NAME,
    pageSlug: PAGE.slug,
    signature: committedSignature,
    unitMode: 'fractional',
  });

  const committedResult = useMemo(
    () =>
      committed
        ? calculateConduitFill(
            committed.raceway,
            committed.trade,
            committed.wire,
            committed.count,
          )
        : null,
    [committed],
  );

  useEffect(() => {
    if (!committed || !committedResult || !committedSignature) {
      return;
    }
    const inputSummary = committed.count
      ? `${committed.trade}" ${RACEWAY_LABEL[committed.raceway]} · ${committed.count} × ${wireSizeLabel(committed.wire)}`
      : `${committed.trade}" ${RACEWAY_LABEL[committed.raceway]} · ${wireSizeLabel(committed.wire)} THHN`;
    const summary =
      committedResult.fillFraction !== undefined
        ? `max ${committedResult.maxConductors} · ${(committedResult.fillFraction * 100).toFixed(1)}% (${committedResult.fits ? 'OK' : 'OVER'})`
        : `max ${committedResult.maxConductors} wires`;

    add(
      createSeoHistoryEntry({
        kind: 'conduitFill',
        inputSummary,
        summary,
        params: {
          raceway: committed.raceway,
          trade: committed.trade,
          wire: committed.wire,
          countText: committed.count !== undefined ? String(committed.count) : '',
        },
        signature: committedSignature,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedSignature]);

  const handleRefill = useCallback((entry: SeoHistoryEntry) => {
    const params = entry.params;
    const nextRaceway = params.raceway ?? 'EMT';
    const nextTrade = params.trade ?? '3/4';
    const nextWire = params.wire ?? '12';
    const nextCountText = params.countText ?? '';
    setRaceway(nextRaceway);
    setTrade(nextTrade);
    setWire(nextWire);
    setCountText(nextCountText);
    const parsed = parseNumberInput(nextCountText);
    const nextCount =
      nextCountText.trim() !== '' &&
      parsed !== null &&
      Number.isInteger(parsed) &&
      parsed >= 1 &&
      parsed <= 999
        ? parsed
        : undefined;
    setCommitted({
      raceway: nextRaceway,
      trade: nextTrade,
      wire: nextWire,
      count: nextCount,
    });
  }, []);

  const copyText = result
    ? buildConduitFillCopyText({
        racewayLabel: RACEWAY_LABEL[raceway],
        tradeSize: trade,
        wireLabel: wireSizeLabel(wire),
        maxConductors: result.maxConductors,
        count: validCount,
        fillPercent:
          result.fillFraction !== undefined ? result.fillFraction * 100 : undefined,
        allowedPercent:
          result.allowedFraction !== undefined
            ? Math.round(result.allowedFraction * 100)
            : undefined,
        fits: result.fits,
      })
    : '';

  const rows = result
    ? [
        ...(result.fillFraction !== undefined && validCount !== undefined
          ? [
              {
                label: t('conduitFill.yourFill', { count: validCount }),
                value: `${(result.fillFraction * 100).toFixed(1)}%`,
              },
              {
                label: t('conduitFill.allowedFill'),
                value: `${Math.round((result.allowedFraction ?? 0) * 100)}%`,
              },
            ]
          : []),
        {
          label: t('conduitFill.racewayArea'),
          value: `${result.racewayAreaSqIn.toFixed(3)} in²`,
        },
        {
          label: t('conduitFill.wireArea'),
          value: `${result.wireAreaSqIn.toFixed(4)} in²`,
        },
      ]
    : [];

  return (
    <SeoPage activeTool={PAGE.key}>
      <View style={{ gap: theme.spacing.xs }}>
        <SeoHeading level={1} style={{ fontSize: 20 }}>
          {copy.h1}
        </SeoHeading>
        <SeoHint>{t('conduitFill.seoHint')}</SeoHint>
      </View>

      <SeoWorkspace>
        <SeoCalcLayout
          input={
            <SeoCard>
              <OptionRow
                label={t('conduitFill.racewayLabel')}
                options={RACEWAY_TYPES}
                value={raceway}
                format={(r) => RACEWAY_LABEL[r]}
                onChange={(next) => {
                  setRaceway(next);
                  commitSelection({ raceway: next });
                }}
              />
              <OptionRow
                label={t('conduitFill.tradeLabel')}
                options={TRADE_SIZES}
                value={trade}
                perRow={5}
                format={tradeLabel}
                onChange={(next) => {
                  setTrade(next);
                  commitSelection({ trade: next });
                }}
              />
              <OptionRow
                label={t('conduitFill.wireLabel')}
                options={WIRE_SIZES}
                value={wire}
                perRow={6}
                onChange={(next) => {
                  setWire(next);
                  commitSelection({ wire: next });
                }}
              />
              <NumberField
                label={t('conduitFill.countLabel')}
                value={countText}
                onChangeText={(next) => {
                  setCountText(next);
                  commitSelection({ countText: next });
                }}
                placeholder={t('conduitFill.countPlaceholder')}
                integer
                error={countInvalid ? t('conduitFill.countError') : undefined}
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
                headline={t('conduitFill.maxConductorsHeadline', {
                  wire: wireSizeLabel(wire),
                  trade,
                  raceway: RACEWAY_LABEL[raceway],
                })}
                headlineValue={
                  result
                    ? t('conduitFill.wiresUnit', { count: result.maxConductors })
                    : undefined
                }
                rows={rows}
              />
              {result?.fits === false && validCount !== undefined ? (
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
                    {t('conduitFill.overfilled', {
                      count: validCount,
                      wire: wireSizeLabel(wire),
                      allowed: Math.round((result.allowedFraction ?? 0.4) * 100),
                      trade,
                      raceway: RACEWAY_LABEL[raceway],
                    })}
                  </Text>
                </View>
              ) : null}
              {result && result.maxConductors === 0 ? (
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
                    {t('conduitFill.zeroFit')}
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
                {t('conduitFill.necNote')}
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

      <SeoCollapsibleSection title={t('conduitFill.whatTitle')}>
        <SeoParagraph>{copy.tagline}</SeoParagraph>
        <SeoParagraph>
          NEC Chapter 9 Table 1 sets maximum fill at 53% for one conductor, 31%
          for two conductors, and 40% for three or more conductors. For same-size
          conductors, Chapter 9 Note 7 lets you round up when the decimal
          remainder is 0.8 or greater — matching NEC Annex C Table C.1.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <SeoCollapsibleSection title={t('conduitFill.chartTitle')}>
        <SeoDataTable
          columns={[
            t('conduitFill.tableTrade'),
            ...QUICK_TABLE_WIRES.map((w) => `#${w}`),
          ]}
          rows={QUICK_TABLE_TRADES.map((sz) => [
            `${sz}"`,
            ...QUICK_TABLE_WIRES.map((w) =>
              String(maxSameSizeConductors('EMT', sz, w) ?? '—'),
            ),
          ])}
        />
        <SeoParagraph>
          Values above are maximum THHN / THWN-2 copper or aluminum conductors
          in EMT per NEC 2023 Annex C Table C.1. Always verify conductor
          ampacity derating per NEC 310.15(C)(1) when bundling more than 3
          current-carrying conductors.
        </SeoParagraph>
      </SeoCollapsibleSection>

      <FaqSection page={copy} toolName={TOOL_NAME} />

      <RelatedCalculators current={PAGE} toolName={TOOL_NAME} />
    </SeoPage>
  );
}
