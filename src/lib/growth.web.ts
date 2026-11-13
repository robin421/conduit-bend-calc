import { trackEvent } from './analytics';
import type { GrowthEvent, GrowthEventParams } from './growthEvents';

export function trackGrowthEvent(name: GrowthEvent, params: GrowthEventParams = {}): void {
  trackEvent(name, { ...params });
}
