import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n';
import { trackEvent } from '../lib/analytics';
import { logFirebaseUnitSystemChanged } from '../lib/firebase';
import { useUnitSystem } from '../lib/unitStore';
import type { UnitSystem } from '../lib/units';
import { useTheme } from '../theme';

const OPTIONS: ReadonlyArray<{
  key: UnitSystem;
  shortKey:
    | 'common.unit.short.fractional'
    | 'common.unit.short.decimal'
    | 'common.unit.short.metric';
  fullKey:
    | 'common.unit.fractional'
    | 'common.unit.decimal'
    | 'common.unit.metric';
}> = [
  {
    key: 'fractional',
    shortKey: 'common.unit.short.fractional',
    fullKey: 'common.unit.fractional',
  },
  {
    key: 'decimal',
    shortKey: 'common.unit.short.decimal',
    fullKey: 'common.unit.decimal',
  },
  {
    key: 'metric',
    shortKey: 'common.unit.short.metric',
    fullKey: 'common.unit.metric',
  },
];

/**
 * 4 大高频计算器顶部轻量一键单位切换条（Frac / Dec / mm）。
 * 高度紧凑，不破坏首屏空间；切换时同步更新全局单位与分析埋点。
 */
export default function QuickUnitToggle() {
  const theme = useTheme();
  const { t } = useI18n();
  const { unit, setUnit } = useUnitSystem();

  const handleChange = (next: UnitSystem) => {
    if (next !== unit) {
      trackEvent('unit_changed', { unit: next });
      logFirebaseUnitSystemChanged(unit, next);
    }
    setUnit(next);
  };

  return (
    <View style={styles.row}>
      <Text
        numberOfLines={1}
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
          fontWeight: theme.fontWeight.medium,
        }}
      >
        {t('common.units')}
      </Text>
      <View
        style={[
          styles.track,
          {
            backgroundColor: theme.scheme === 'dark' ? theme.colors.background : '#EAF0F6',
            borderColor: theme.colors.border,
            borderRadius: theme.radius,
          },
        ]}
      >
        {OPTIONS.map((opt) => {
          const selected = unit === opt.key;
          return (
            <Pressable
              key={opt.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${t('common.units')}: ${t(opt.fullKey)}`}
              hitSlop={4}
              onPress={() => handleChange(opt.key)}
              style={(state) => {
                const { focused } = state as { focused?: boolean };
                return [
                  styles.item,
                  selected
                    ? {
                        backgroundColor:
                          theme.scheme === 'dark' ? theme.colors.primary : '#FFFFFF',
                        borderColor:
                          theme.scheme === 'dark' ? theme.colors.accent : '#C8D4E0',
                      }
                    : {
                        backgroundColor: 'transparent',
                        borderColor: 'transparent',
                      },
                  Platform.OS === 'web' && focused
                    ? ({
                        outlineStyle: 'solid',
                        outlineWidth: 2,
                        outlineColor: theme.colors.accentText,
                      } as object)
                    : null,
                ];
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: selected ? theme.colors.textPrimary : theme.colors.textSecondary,
                  fontSize: 13,
                  fontWeight: selected ? theme.fontWeight.semibold : theme.fontWeight.medium,
                }}
              >
                {t(opt.shortKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: 240,
    height: 34,
    padding: 2,
    borderWidth: 1,
  },
  item: {
    flex: 1,
    height: '100%',
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
