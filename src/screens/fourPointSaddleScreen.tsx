import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { calculateFourPointSaddle } from '../calculators/saddle/saddle';
import BigButton from '../components/bigButton';
import Card from '../components/card';
import ImperialInput from '../components/imperialInput';
import ResultDisplay from '../components/resultDisplay';
import { OffsetAngle, OFFSET_ANGLES } from '../constants';
import { useTheme } from '../theme';

const DEFAULT_ANGLE: OffsetAngle = 30;

function formatInches(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatFromCenter(value: number): string {
  if (value === 0) {
    return '中心';
  }
  const abs = formatInches(Math.abs(value));
  return value < 0 ? `中心 −${abs}"` : `中心 +${abs}"`;
}

export default function FourPointSaddleScreen() {
  const theme = useTheme();
  const [heightText, setHeightText] = useState('');
  const [heightInches, setHeightInches] = useState<number | null>(null);
  const [widthText, setWidthText] = useState('');
  const [widthInches, setWidthInches] = useState<number | null>(null);
  const [angle, setAngle] = useState<OffsetAngle>(DEFAULT_ANGLE);

  const result = useMemo(() => {
    if (heightInches === null || widthInches === null) {
      return null;
    }
    return calculateFourPointSaddle(heightInches, widthInches, angle);
  }, [angle, heightInches, widthInches]);

  const handleClear = useCallback(() => {
    setHeightText('');
    setHeightInches(null);
    setWidthText('');
    setWidthInches(null);
    setAngle(DEFAULT_ANGLE);
  }, []);

  const hint = result ? undefined : '输入参数查看结果';

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
          label="障碍高度"
          value={heightText}
          onChangeText={setHeightText}
          onParsedChange={setHeightInches}
          placeholder={`例如 6"`}
        />

        <ImperialInput
          label="障碍宽度"
          value={widthText}
          onChangeText={setWidthText}
          onParsedChange={setWidthInches}
          placeholder={`例如 4"`}
          style={{ marginTop: theme.spacing.md }}
        />

        <Text
          style={{
            color: theme.colors.textSecondary,
            fontSize: theme.fontSize.secondary,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.sm,
          }}
        >
          弯曲角度
        </Text>
        <View style={styles.angleRow}>
          {OFFSET_ANGLES.map((value) => (
            <BigButton
              key={value}
              title={`${value}°`}
              size="selection"
              selected={angle === value}
              onPress={() => setAngle(value)}
              style={styles.angleButton}
            />
          ))}
        </View>
      </Card>

      <ResultDisplay
        label="弯曲点间距（边缘 ↔ 弯曲点）"
        value={result ? formatInches(result.markSpacingInches) : undefined}
        unit='"'
        hint={hint}
      />

      {result ? (
        <Card style={{ gap: theme.spacing.md }}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
            }}
          >
            分步标记 · 总跨度 {formatInches(result.spanInches)}&quot;
          </Text>
          {result.marks.map((mark) => (
            <View key={mark.id} style={styles.markRow}>
              <Text
                style={{
                  color: theme.colors.textPrimary,
                  fontSize: theme.fontSize.body,
                  fontWeight: theme.fontWeight.semibold,
                }}
              >
                {mark.label}
              </Text>
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.fontSize.body,
                  fontWeight: theme.fontWeight.semibold,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatFromCenter(mark.fromCenterInches)}
              </Text>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.fontSize.secondary,
                  marginTop: theme.spacing.xs,
                }}
              >
                {mark.instruction}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <BigButton title="清空" variant="secondary" onPress={handleClear} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  angleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  angleButton: {
    flexBasis: '30%',
    flexGrow: 1,
  },
  markRow: {
    width: '100%',
  },
});
