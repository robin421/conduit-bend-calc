import type { HistoryStorage } from './historyStore.ts';

export const AMPLITUDE_API_ENDPOINT = 'https://api2.amplitude.com/2/httpapi';
export const DEFAULT_AMPLITUDE_API_KEY = '4fab693935c6445c2df9ac357fc1f686';
export const AMPLITUDE_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export const AMPLITUDE_DEVICE_ID_KEY = '@conduit_amplitude_device_id';
export const AMPLITUDE_SESSION_KEY = '@conduit_amplitude_session';
export const AMPLITUDE_ACTIVATED_KEY = '@conduit_amplitude_activated';

/** 严格事件属性白名单：禁止上传任何 PII、用户输入尺寸、历史记录或支付凭证。 */
const ALLOWED_EVENT_PROPERTY_KEYS = new Set<string>([
  'bend_type',
  'tool_name',
  'unit_system',
  'platform',
  'screen_name',
  'from',
  'to',
  'trigger_source',
  'source',
  'outcome',
  'scene',
  'action',
]);

const MAX_STRING_VALUE_LEN = 100;
const MAX_EVENT_TYPE_LEN = 64;

export type AmplitudePrimitive = string | number | boolean;
export type AmplitudeEventProperties = Record<string, AmplitudePrimitive | undefined>;

export interface AmplitudeEventPayload {
  device_id: string;
  session_id: number;
  event_type: string;
  time: number;
  platform: string;
  app_version: string;
  language: string;
  event_properties?: Record<string, AmplitudePrimitive>;
}

export interface AmplitudeHttpBody {
  api_key: string;
  events: AmplitudeEventPayload[];
}

export interface AmplitudeSessionState {
  sessionId: number;
  lastActiveAt: number;
}

export interface AmplitudeClientDeps {
  storage: HistoryStorage;
  fetchFn?: typeof fetch;
  now?: () => number;
  apiKey?: string;
  platform?: string;
  appVersion?: string;
  language?: string;
  uuid?: () => string;
}

export function generateAnonymousDeviceId(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  const segment = (len: number) =>
    Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${segment(8)}-${segment(4)}-4${segment(3)}-${((8 + Math.floor(Math.random() * 4)).toString(16))}${segment(3)}-${segment(12)}`;
}

export function sanitizeEventType(eventType: string): string {
  const cleaned = String(eventType ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .slice(0, MAX_EVENT_TYPE_LEN);
  return cleaned || 'unknown_event';
}

/** 仅保留白名单内的字段与安全原始值，截断超长字符串。 */
export function sanitizeEventProperties(
  props?: Record<string, unknown>,
): Record<string, AmplitudePrimitive> | undefined {
  if (!props || typeof props !== 'object') {
    return undefined;
  }
  const result: Record<string, AmplitudePrimitive> = {};
  let count = 0;
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_EVENT_PROPERTY_KEYS.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim().slice(0, MAX_STRING_VALUE_LEN);
      if (trimmed.length > 0) {
        result[key] = trimmed;
        count += 1;
      }
    } else if (typeof value === 'number') {
      if (Number.isFinite(value)) {
        result[key] = value;
        count += 1;
      }
    } else if (typeof value === 'boolean') {
      result[key] = value;
      count += 1;
    }
  }
  return count > 0 ? result : undefined;
}

export function parseSessionState(raw: string | null, currentTime: number): AmplitudeSessionState {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<AmplitudeSessionState>;
      if (
        typeof parsed.sessionId === 'number' &&
        Number.isFinite(parsed.sessionId) &&
        typeof parsed.lastActiveAt === 'number' &&
        Number.isFinite(parsed.lastActiveAt) &&
        currentTime - parsed.lastActiveAt <= AMPLITUDE_SESSION_TIMEOUT_MS &&
        currentTime >= parsed.lastActiveAt - 60_000
      ) {
        return { sessionId: parsed.sessionId, lastActiveAt: currentTime };
      }
    } catch {
      /* ignore corrupted session state */
    }
  }
  return { sessionId: currentTime, lastActiveAt: currentTime };
}

export function buildAmplitudeHttpBody(params: {
  apiKey: string;
  deviceId: string;
  sessionId: number;
  eventType: string;
  time: number;
  platform: string;
  appVersion: string;
  language: string;
  eventProperties?: Record<string, unknown>;
}): AmplitudeHttpBody {
  const sanitizedProps = sanitizeEventProperties(params.eventProperties);
  const event: AmplitudeEventPayload = {
    device_id: params.deviceId,
    session_id: params.sessionId,
    event_type: sanitizeEventType(params.eventType),
    time: params.time,
    platform: params.platform,
    app_version: params.appVersion,
    language: params.language,
    ...(sanitizedProps ? { event_properties: sanitizedProps } : {}),
  };
  return {
    api_key: params.apiKey,
    events: [event],
  };
}

export function createAmplitudeClient(deps: AmplitudeClientDeps) {
  const now = deps.now ?? Date.now;
  const fetchFn = deps.fetchFn ?? (typeof fetch === 'function' ? fetch : undefined);
  const apiKey = (deps.apiKey ?? '').trim() || DEFAULT_AMPLITUDE_API_KEY;
  const platform = deps.platform ?? 'unknown';
  const appVersion = deps.appVersion ?? 'unknown';
  const language = deps.language ?? 'en';
  const uuid = deps.uuid ?? generateAnonymousDeviceId;

  let deviceId: string | null = null;
  let session: AmplitudeSessionState | null = null;
  let activated: boolean | null = null;
  let queue: Promise<void> = Promise.resolve();

  function serialize<T>(op: () => Promise<T>): Promise<T> {
    const next = queue.then(op);
    queue = next.then(() => undefined, () => undefined);
    return next;
  }

  async function ensureDeviceAndSession(currentTime: number): Promise<{ deviceId: string; sessionId: number }> {
    if (!deviceId) {
      try {
        const stored = await deps.storage.getItem(AMPLITUDE_DEVICE_ID_KEY);
        if (stored && stored.trim().length >= 8) {
          deviceId = stored.trim();
        }
      } catch {
        /* ignore storage read errors */
      }
      if (!deviceId) {
        deviceId = uuid();
        try {
          await deps.storage.setItem(AMPLITUDE_DEVICE_ID_KEY, deviceId);
        } catch {
          /* ignore storage write errors */
        }
      }
    }

    if (!session) {
      let rawSession: string | null = null;
      try {
        rawSession = await deps.storage.getItem(AMPLITUDE_SESSION_KEY);
      } catch {
        /* ignore */
      }
      session = parseSessionState(rawSession, currentTime);
    } else if (currentTime - session.lastActiveAt > AMPLITUDE_SESSION_TIMEOUT_MS) {
      session = { sessionId: currentTime, lastActiveAt: currentTime };
    } else {
      session = { sessionId: session.sessionId, lastActiveAt: currentTime };
    }

    try {
      await deps.storage.setItem(AMPLITUDE_SESSION_KEY, JSON.stringify(session));
    } catch {
      /* ignore */
    }

    return { deviceId, sessionId: session.sessionId };
  }

  async function sendEventInternal(eventType: string, eventProperties?: Record<string, unknown>): Promise<boolean> {
    if (!fetchFn || !apiKey) return false;
    const currentTime = now();
    const { deviceId: resolvedDeviceId, sessionId } = await ensureDeviceAndSession(currentTime);
    const body = buildAmplitudeHttpBody({
      apiKey,
      deviceId: resolvedDeviceId,
      sessionId,
      eventType,
      time: currentTime,
      platform,
      appVersion,
      language,
      eventProperties,
    });
    try {
      const response = await fetchFn(AMPLITUDE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
        body: JSON.stringify(body),
      });
      return Boolean(response && response.ok);
    } catch {
      return false;
    }
  }

  return {
    init(): Promise<void> {
      return serialize(async () => {
        await ensureDeviceAndSession(now());
      }).catch(() => undefined);
    },
    logEvent(eventType: string, eventProperties?: Record<string, unknown>): Promise<boolean> {
      return serialize(() => sendEventInternal(eventType, eventProperties)).catch(() => false);
    },
    logScreenView(screenName: string): Promise<boolean> {
      return serialize(() =>
        sendEventInternal('screen_view', { screen_name: screenName }),
      ).catch(() => false);
    },
    markActivationIfNeeded(eventProperties?: Record<string, unknown>): Promise<boolean> {
      return serialize(async () => {
        if (activated === true) return false;
        if (activated === null) {
          try {
            const flag = await deps.storage.getItem(AMPLITUDE_ACTIVATED_KEY);
            if (flag === '1') {
              activated = true;
              return false;
            }
          } catch {
            /* proceed best-effort */
          }
        }
        activated = true;
        try {
          await deps.storage.setItem(AMPLITUDE_ACTIVATED_KEY, '1');
        } catch {
          /* ignore */
        }
        return sendEventInternal('activation_completed', eventProperties);
      }).catch(() => false);
    },
  };
}
