import { StyleSheet, Text, View } from 'react-native';

import type { BenderProfile } from '../lib/profile';
import { useTheme } from '../theme';
import BigButton from './bigButton';

interface BenderStatusBannerProps {
  profile: BenderProfile | null;
  /** 是否已购 Pro。 */
  isPro: boolean;
  /** Free 普通计算完成 → 是否显示 [Calibrate My Bender]。 */
  showCalibrateCta: boolean;
  onCalibrate: () => void;
}

/**
 * P0-6 结果页 bender 状态条：
 * - calibrated 档案 → `Using My <name>` 明显标识；
 * - Free 普通计算完成 → `Calculated using standard bender values.` + [Calibrate My Bender]。
 */
export default function BenderStatusBanner({
  profile,
  isPro,
  showCalibrateCta,
  onCalibrate,
}: BenderStatusBannerProps) {
  const theme = useTheme();

  if (profile && profile.source === 'calibrated') {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.success,
            borderRadius: theme.radius,
            padding: theme.spacing.sm,
          },
        ]}
      >
        <Text style={[styles.icon, { color: theme.colors.success }]}>✓</Text>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.fontSize.secondary,
            fontWeight: theme.fontWeight.semibold,
            flex: 1,
          }}
        >
          {`Using ${profile.name}`}
        </Text>
      </View>
    );
  }

  if (profile && profile.source === 'custom') {
    return (
      <View
        style={[
          styles.banner,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: theme.radius,
            padding: theme.spacing.sm,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            flex: 1,
          }}
        >
          {`Using ${profile.name}`}
        </Text>
      </View>
    );
  }

  if (!showCalibrateCta) {
    return null;
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
        }}
      >
        Calculated using standard bender values.
      </Text>
      <BigButton
        title="Calibrate My Bender"
        variant="secondary"
        onPress={onCalibrate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    fontSize: 16,
    fontWeight: '600',
  },
});
