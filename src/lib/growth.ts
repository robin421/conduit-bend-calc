import type { GrowthEvent, GrowthEventParams } from './growthEvents';
import { logFirebaseGrowthEvent } from './firebase';

export function trackGrowthEvent(name: GrowthEvent, params: GrowthEventParams = {}): void {
  logFirebaseGrowthEvent(name, params);
}
