import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { applyExpectedActualCorrection } from '../calculators/calibration/calibration';
import type { BenderProfile } from '../lib/profile';
import { setProfileCalibrationOffset } from '../lib/benderProfileStore';
import { useTheme } from '../theme';
import { formatMeasurement } from '../lib/units';
import type { UnitSystem } from '../lib/units';
import BigButton from './bigButton';
import Card from './card';
import ImperialInput from './imperialInput';

interface ExpectedActualFeedbackProps {
  profile: BenderProfile | null;
  /** 系统给出的主结果（英寸，已含累积校正量）。 */
  expectedInches: number | null;
  /** 结果名词，如 'Mark spacing'。 */
  label: string;
  unit: UnitSystem;
}

/**
 * P0-4 Expected→Actual 校准闭环：用户实测 vs 系统预期 → 调整该 profile 的
 * calibration correction；支持撤销 / Reset。只对用户档案（custom/calibrated）显示。
 */
export default function ExpectedActualFeedback({
  profile,
  expectedInches,
  label,
  unit,
}: ExpectedActualFeedbackProps) {
  const theme = useTheme();
  const [actualText, setActualText] = useState('');
  const [actualInches, setActualInches] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<{
    previousOffset: number;
    nextOffset: number;
    error: number;
  } | null>(null);

  const isUserProfile = profile !== null && profile.source !== 'standard';

  const pending = useMemo(() => {
    if (!profile || expectedInches === null || actualInches === null) {
      return null;
    }
    return applyExpectedActualCorrection(
      profile.calibrationOffset,
      expectedInches,
      actualInches,
    );
  }, [actualInches, expectedInches, profile]);

  const expectedMeasurement =
    expectedInches !== null ? formatMeasurement(expectedInches, unit) : undefined;

  const handleUpdate = useCallback(() => {
    if (!profile || !pending) {
      return;
    }
    setProfileCalibrationOffset(profile.id, pending.offset, Date.now());
    setLastUpdate({
      previousOffset: profile.calibrationOffset,
      nextOffset: pending.offset,
      error: pending.error,
    });
    setActualText('');
    setActualInches(null);
  }, [pending, profile]);

  const handleUndo = useCallback(() => {
    if (!profile || !lastUpdate) {
      return;
    }
    setProfileCalibrationOffset(profile.id, lastUpdate.previousOffset, Date.now());
    setLastUpdate(null);
  }, [lastUpdate, profile]);

  const handleReset = useCallback(() => {
    if (!profile) {
      return;
    }
    setProfileCalibrationOffset(profile.id, 0, Date.now());
    setLastUpdate(null);
  }, [profile]);

  if (!profile || !isUserProfile || expectedInches === null) {
    return null;
  }

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: theme.fontSize.body,
          fontWeight: theme.fontWeight.semibold,
        }}
      >
        Did it match?
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
          lineHeight: 20,
        }}
      >
        {`${label}: expected ${expectedMeasurement?.value ?? '—'} ${expectedMeasurement?.unit ?? ''}. Enter what you measured to make the next one closer.`}
      </Text>
      <ImperialInput
        label="Actual measurement"
        value={actualText}
        onChangeText={setActualText}
        onParsedChange={setActualInches}
        unit={unit}
      />
      <BigButton
        title="Update Bender Calibration"
        onPress={handleUpdate}
        disabled={!pending}
      />
      {lastUpdate ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Text
            style={{
              color: theme.colors.success,
              fontSize: theme.fontSize.secondary,
            }}
          >
            {`Correction updated by ${lastUpdate.error >= 0 ? '+' : ''}${(
              Math.round(lastUpdate.error * 1000) / 1000
            ).toString()}". Tap Update again after your next bend.`}
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <BigButton
              title="Undo"
              variant="secondary"
              onPress={handleUndo}
              style={styles.action}
            />
            <BigButton
              title="Reset Calibration"
              variant="secondary"
              onPress={handleReset}
              style={styles.action}
            />
          </View>
        </View>
      ) : profile.calibrationOffset !== 0 ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <BigButton
            title="Reset Calibration"
            variant="secondary"
            onPress={handleReset}
            style={styles.action}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  action: {
    flex: 1,
  },
});
