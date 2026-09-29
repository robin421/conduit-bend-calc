import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import BigButton from '../components/bigButton';
import {
  buyPro,
  clearProError,
  refreshProIap,
  restorePro,
  useProAccess,
} from '../lib/proStore';
import type { CalcStackParamList } from '../navigation/calcStack';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<CalcStackParamList, 'Paywall'>;

/**
 * Pro 权益：围绕 calibration / accuracy / waste reduction，
 * 不卖"更多计算器"（P0-6）。
 */
const PRO_BENEFITS = [
  'Calibrate your actual bender',
  'Personalized bend measurements',
  'Catch impossible bends',
  'Reduce scrap and rework',
  'Save multiple bender profiles',
];

export default function PaywallScreen({ navigation }: Props) {
  const theme = useTheme();
  const { access, productPrice, initialized, lastError, pendingPurchase } =
    useProAccess();
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 购买成功（access 变 unlocked）后自动关闭付费墙。
  useEffect(() => {
    if (access === 'unlocked') {
      navigation.goBack();
    }
  }, [access, navigation]);

  // 挂载时若产品信息缺失（启动时离线等），刷新一次。
  useEffect(() => {
    if (!initialized || productPrice == null) {
      setRefreshing(true);
      refreshProIap()
        .catch(() => undefined)
        .finally(() => setRefreshing(false));
    }
    // 只在挂载时执行一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = buying || restoring || refreshing;

  async function handleBuy(): Promise<void> {
    if (busy) {
      return;
    }
    clearProError();
    setBuying(true);
    try {
      await buyPro();
      // 购买结果经由购买更新监听送达；access 变 unlocked 后自动 goBack。
    } finally {
      setBuying(false);
    }
  }

  async function handleRestore(): Promise<void> {
    if (busy) {
      return;
    }
    clearProError();
    setRestoring(true);
    try {
      await restorePro();
      // 找到购买记录 → access 变 unlocked → 自动 goBack；
      // 无记录 → lastError 显示 "No previous purchase found."。
    } finally {
      setRestoring(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { padding: theme.spacing.lg, gap: theme.spacing.md },
      ]}
    >
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.fontSize.title,
          fontWeight: theme.fontWeight.semibold,
        }}
      >
        Bend It Right the First Time
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.body,
          lineHeight: 22,
        }}
      >
        Calibrate the app to your actual bender and catch risky bends before cutting
        conduit.
      </Text>

      <View style={{ gap: theme.spacing.sm }}>
        {PRO_BENEFITS.map((benefit) => (
          <View
            key={benefit}
            style={[
              styles.featureRow,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                padding: theme.spacing.md,
                borderRadius: theme.radius,
              },
            ]}
          >
            <Text style={[styles.check, { color: theme.colors.success }]}>✓</Text>
            <Text
              style={{
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.body,
                fontWeight: theme.fontWeight.semibold,
                flex: 1,
              }}
            >
              {benefit}
            </Text>
          </View>
        ))}
      </View>

      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
        }}
      >
        Pro Lifetime — one-time purchase, yours forever.
      </Text>

      {pendingPurchase ? (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
          }}
        >
          Payment pending. Pro will unlock automatically once it completes.
        </Text>
      ) : null}

      {lastError ? (
        <Text
          style={{
            color: theme.colors.error,
            fontSize: theme.fontSize.secondary,
          }}
        >
          {lastError}
        </Text>
      ) : null}

      <BigButton
        title={
          buying ? 'Processing…' : productPrice ? `Unlock Pro Lifetime — ${productPrice}` : 'Unlock Pro Lifetime'
        }
        variant="primary"
        disabled={busy}
        onPress={() => {
          void handleBuy();
        }}
      />
      <BigButton
        title={restoring ? 'Restoring…' : 'Restore Purchase'}
        variant="secondary"
        disabled={busy}
        onPress={() => {
          void handleRestore();
        }}
      />
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => navigation.goBack()}
        style={styles.notNow}
      >
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.body,
            opacity: busy ? 0.4 : 1,
          }}
        >
          Not now
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  featureRow: {
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  check: {
    fontSize: 18,
    fontWeight: '600',
  },
  notNow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
