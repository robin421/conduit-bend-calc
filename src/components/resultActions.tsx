import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '../i18n';
import { copyToClipboard } from '../lib/clipboard';
import { useTheme } from '../theme';
import BigButton from './bigButton';

interface ResultActionsProps {
  /** 要复制的整句结果；null = 尚无有效结果，复制按钮禁用。 */
  copyText: string | null;
  /** 埋点 tool_name（offset / stub / saddle3 / saddle4）。 */
  toolName: string;
  onClear(): void;
}

/**
 * 核心计算器的结果操作行：[复制结果] [清空]。
 * 历史记录由 useHistoryAutoSave 自动写入，这里不再单独放保存按钮。
 * 两个按钮同高（56pt），现场戴手套也能点中。
 */
export default function ResultActions({ copyText, toolName, onClear }: ResultActionsProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  // 结果变化后旧的 "已复制" 提示不再对应当前数字。
  useEffect(() => { setStatus('idle'); }, [copyText]);

  const handleCopy = useCallback(async () => {
    if (!copyText) return;
    const ok = await copyToClipboard(copyText, { source: 'calculator', toolName });
    setStatus(ok ? 'copied' : 'failed');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), 2000);
  }, [copyText, toolName]);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View style={styles.row}>
        <BigButton
          title={t('common.copy')}
          variant="primary"
          disabled={!copyText}
          onPress={() => { void handleCopy(); }}
          style={styles.button}
        />
        <BigButton title={t('common.clear')} variant="secondary" onPress={onClear} style={styles.button} />
      </View>
      {status !== 'idle' ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            color: status === 'copied' ? theme.colors.success : theme.colors.error,
            fontSize: theme.fontSize.secondary,
            textAlign: 'center',
          }}
        >
          {status === 'copied' ? t('common.copied') : t('common.copyFailed')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  button: { flex: 1 },
});
