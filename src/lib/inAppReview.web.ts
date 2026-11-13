import { Linking } from 'react-native';
import { GOOGLE_PLAY_URL } from './homeContent';
import { trackGrowthEvent } from './growth';

const noop = () => undefined;
const interaction = Object.assign(noop, { reset: noop });
export function suspendReviewForSession(): void {}
export async function initInAppReview(): Promise<void> {}
export async function requestReviewWhenIdle(_isIdle: () => boolean): Promise<void> {}
export function useReviewOnSuccessfulCalc(_signature: string | null, _status: string | null | undefined): (() => void) & { reset(): void } { return interaction; }
export async function openPlayStoreListing(source = 'manual'): Promise<boolean> {
  try {
    await Linking.openURL(GOOGLE_PLAY_URL);
    trackGrowthEvent('review_store_open', { source });
    return true;
  } catch { return false; }
}
