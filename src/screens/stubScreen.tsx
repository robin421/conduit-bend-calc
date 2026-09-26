import { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { calculateStub } from '../calculators/stub/stub';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import ImperialInput from '../components/imperialInput';
import ResultDisplay from '../components/resultDisplay';
import { EmtTakeUpSize, TAKE_UP_OPTIONS } from '../constants';
import { useTheme } from '../theme';

function formatInches(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function parseTakeUp(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

export default function StubScreen() {
  const theme = useTheme();
  const [heightText, setHeightText] = useState('');
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const [takeUpText, setTakeUpText] = useState('');
  const [selectedSize, setSelectedSize] = useState<EmtTakeUpSize | null>(null);

  const takeUp = useMemo(() => parseTakeUp(takeUpText), [takeUpText]);

  const result = useMemo(() => {
    if (heightInches === null || takeUp === null) {
      return null;
    }
    return calculateStub(heightInches, takeUp);
  }, [heightInches, takeUp]);

  const handleSelect = useCallback((size: EmtTakeUpSize, value: number) => {
    setSelectedSize(size);
    setTakeUpText(String(value));
  }, []);

  const handleTakeUpChange = useCallback((text: string) => {
    setTakeUpText(text);
    setSelectedSize(null);
  }, []);

  const handleClear = useCallback(() => {
    setHeightText('');
    setHeightInches(null);
    setTakeUpText('');
    setSelectedSize(null);
  }, []);

  const takeUpInvalid = takeUpText.trim() !== '' && takeUp === null;

  let hint: string | undefined;
  if (heightInches === null) {
    hint = '输入参数查看结果';
  } else if (takeUp === null) {
    hint = takeUpInvalid ? 'take-up 必须为大于 0 的数字' : '请选择或输入 take-up';
  } else if (!result) {
    hint = '目标高度需大于 take-up';
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={[
        styles.content,
        { padding: theme.spacing.md, gap: theme.spacing.md },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Card>
        <ImperialInput
          label="目标高度"
          value={heightText}
          onChangeText={setHeightText}
          onParsedChange={setHeightInches}
          placeholder={`例如 12"`}
        />

        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.sm,
          }}
        >
          弯管器（take-up）
        </Text>
        <View style={styles.optionRow}>
          {TAKE_UP_OPTIONS.map((option) => (
            <BigButton
              key={option.size}
              title={`${option.label} · ${option.takeUpInches}"`}
              size="selection"
              selected={selectedSize === option.size}
              onPress={() => handleSelect(option.size, option.takeUpInches)}
              style={styles.optionButton}
            />
          ))}
        </View>

        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.xs,
          }}
        >
          take-up（英寸，可手动覆盖）
        </Text>
        <TextInput
          value={takeUpText}
          onChangeText={handleTakeUpChange}
          placeholder={`例如 5`}
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="decimal-pad"
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.background,
              borderColor: takeUpInvalid ? theme.colors.error : theme.colors.border,
              borderRadius: theme.radius,
              color: theme.colors.textPrimary,
              fontSize: theme.fontSize.title,
              paddingHorizontal: theme.spacing.md,
            },
          ]}
        />
      </Card>

      <ResultDisplay
        label="标记点位置"
        value={result ? formatInches(result.markPoint) : undefined}
        unit='"'
        hint={hint}
      />

      <BigButton title="清空" variant="secondary" onPress={handleClear} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexBasis: '30%',
    flexGrow: 1,
  },
  input: {
    minHeight: 56,
    borderWidth: StyleSheet.hairlineWidth,
    fontVariant: ['tabular-nums'],
  },
});
