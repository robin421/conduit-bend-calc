import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { subscribeAppToast, type AppToastPayload } from '../lib/appToast';
import { useTheme } from '../theme';

/** 全局统一底部 Toast 宿主：确保 Android / iOS / Web 均在屏幕底部展示提示。 */
export default function AppToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<AppToastPayload | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeAppToast((next) => {
      if (timer) clearTimeout(timer);
      setToast(next);
      if (next) {
        timer = setTimeout(() => {
          setToast((current) => (current?.id === next.id ? null : current));
        }, next.durationMs);
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  if (!toast) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          bottom: Math.max(insets.bottom, 12) + 16,
          paddingHorizontal: theme.spacing.md,
        },
      ]}
    >
      <View
        accessibilityRole="alert"
        style={[
          styles.pill,
          {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.accent,
            borderRadius: theme.radius,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
        <Text
          numberOfLines={2}
          style={{
            color: theme.colors.onPrimary,
            fontSize: theme.fontSize.secondary,
            fontWeight: theme.fontWeight.semibold,
            flexShrink: 1,
          }}
        >
          {toast.message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
