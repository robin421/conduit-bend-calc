/**
 * Billin offline trade tools cross-promotion matrix (pure, node-testable).
 *
 * All Play Store links carry strict Install Referrer UTM attribution:
 *   utm_source=conduitbender&utm_medium=cross_promo
 */
import type { TranslationKey } from '../i18n/dictionaries.ts';

export const CROSS_PROMO_SOURCE = 'conduitbender';
export const CROSS_PROMO_MEDIUM = 'cross_promo';
export const CONDUIT_BENDER_PACKAGE_ID = 'com.robin421.conduitbendcalc';

export interface TradeToolEntry {
  id: 'firstbend' | 'snapproof' | 'squarefootage' | 'measurequote' | 'hvacgauge' | 'wrenchquote';
  packageId: string;
  title: string;
  descriptionKey: TranslationKey;
}

export const BILLIN_TRADE_TOOLS: readonly TradeToolEntry[] = [
  {
    id: 'firstbend',
    packageId: 'com.firstbend.firstbend',
    title: 'FirstBend: Press Brake Setups',
    descriptionKey: 'tradeTools.firstbend.desc',
  },
  {
    id: 'snapproof',
    packageId: 'com.snapproof.jobreport',
    title: 'SnapProof: Job Photo Reports',
    descriptionKey: 'tradeTools.snapproof.desc',
  },
  {
    id: 'squarefootage',
    packageId: 'com.squarefoot.jobcalc',
    title: 'Square Footage Calc & Estimate',
    descriptionKey: 'tradeTools.squarefootage.desc',
  },
  {
    id: 'measurequote',
    packageId: 'com.measurequote.blueprint',
    title: 'MeasureQuote: Blueprint Calc',
    descriptionKey: 'tradeTools.measurequote.desc',
  },
  {
    id: 'hvacgauge',
    packageId: 'com.hvacgauge.ptpro',
    title: 'HvacGauge: HVAC Charge & P-T',
    descriptionKey: 'tradeTools.hvacgauge.desc',
  },
  {
    id: 'wrenchquote',
    packageId: 'com.wrenchquote.autoro',
    title: 'WrenchQuote: Flat Rate Labor',
    descriptionKey: 'tradeTools.wrenchquote.desc',
  },
] as const;

export function buildTradeToolPlayUrl(
  packageId: string,
  source = CROSS_PROMO_SOURCE,
  medium = CROSS_PROMO_MEDIUM,
): string {
  const referrer = `utm_source=${source}&utm_medium=${medium}`;
  return `https://play.google.com/store/apps/details?id=${packageId}&referrer=${encodeURIComponent(referrer)}`;
}
