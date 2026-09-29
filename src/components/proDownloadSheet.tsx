import { useEffect } from 'react';
import {
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Card from './card';
import {
  GOOGLE_PLAY_BADGE_ASPECT_RATIO,
  GOOGLE_PLAY_URL,
} from '../lib/homeContent';
import {
  PRO_DOWNLOAD_COPY,
  type ProDownloadEntryKey,
} from '../lib/proDownloadCopy';
import { useTheme } from '../theme';
import { trackEvent } from '../lib/analytics';

/** 组件内文案映射：key 为首页 Pro 入口的 entry.key。 */
const SHEET_COPY: Record<ProDownloadEntryKey, { title: string; value: string }> =
  PRO_DOWNLOAD_COPY;

interface ProDownloadSheetProps {
  /** 要展示的 Pro 入口；null 时浮层关闭。 */
  entryKey: ProDownloadEntryKey | null;
  onClose: () => void;
}

/**
 * Web 专属下载引导浮层：用户在网页上点击 Pro 功能入口时弹出，
 * 引导去 Google Play 下载 App 解锁。Native 端不使用。
 */
export default function ProDownloadSheet({ entryKey, onClose }: ProDownloadSheetProps) {
  const theme = useTheme();

  // Web 上按 Esc 关闭浮层。
  useEffect(() => {
    if (entryKey === null || Platform.OS !== 'web') {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [entryKey, onClose]);

  const copy = entryKey === null ? null : SHEET_COPY[entryKey];

  return (
    <Modal
      transparent
      visible={entryKey !== null}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close download prompt"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        {copy === null ? null : (
          <Card
            style={[
              styles.card,
              { maxWidth: 420, padding: theme.spacing.lg },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close download prompt"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.fontSize.body,
                }}
              >
                ✕
              </Text>
            </Pressable>
            <View style={styles.headerRow}>
              <Text
                style={[
                  styles.proPill,
                  {
                    backgroundColor: theme.colors.accent,
                    color: theme.colors.onAccent,
                  },
                ]}
              >
                PRO
              </Text>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.fontSize.body,
                  fontWeight: theme.fontWeight.semibold,
                }}
              >
                {copy.title}
              </Text>
            </View>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.secondary,
              }}
            >
              {copy.value}
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.fontSize.secondary,
              }}
            >
              One-time $4.99 Pro unlock in the app
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Get it on Google Play"
              onPress={() => {
                trackEvent('google_play_click', { source: 'paysheet' });
                void Linking.openURL(GOOGLE_PLAY_URL).catch(() => undefined);
              }}
              style={styles.badgePress}
            >
              <Image
                source={require('../../assets/images/google-play-badge.png')}
                resizeMode="contain"
                style={[
                  styles.badge,
                  {
                    width: 200,
                    height: 200 / GOOGLE_PLAY_BADGE_ASPECT_RATIO,
                  },
                ]}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Not now"
              onPress={onClose}
              style={styles.notNow}
            >
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.fontSize.secondary,
                  fontWeight: theme.fontWeight.medium,
                }}
              >
                Not now
              </Text>
            </Pressable>
          </Card>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proPill: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgePress: {
    alignSelf: 'center',
    marginTop: 4,
  },
  badge: {
    // 宽高由 GOOGLE_PLAY_BADGE_ASPECT_RATIO 决定
  },
  notNow: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
