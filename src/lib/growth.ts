import { logAmplitudeEvent } from './amplitude';
import { logFirebaseGrowthEvent } from './firebase';
import type { GrowthEvent, GrowthEventParams } from './growthEvents';

export function trackGrowthEvent(name: GrowthEvent, params: GrowthEventParams = {}): void {
  logFirebaseGrowthEvent(name, params);
  logAmplitudeEvent(name, { ...params });
}
