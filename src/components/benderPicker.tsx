import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  createCustomSpec,
  displaySpecName,
  findBenderSpec,
  isHookDatum,
  listPresetBrands,
  listPresetConduits,
  listPresetModels,
} from '../calculators/geometry/benderSpecs';
import type { BenderBrand, BenderSpec } from '../constants';
import { useTheme } from '../theme';
import BigButton from './bigButton';

interface BenderPickerProps {
  /** 当前选中的规格 */
  spec: BenderSpec;
  /** 已保存的 Custom 规格（最新在前） */
  customSpecs: readonly BenderSpec[];
  /** 选中预设或已有 Custom 时回调 */
  onChange: (spec: BenderSpec) => void;
  /** 手动创建 Custom 规格时回调（父组件负责持久化并选中） */
  onCreateCustom: (spec: BenderSpec) => void;
}

function formatNum(value: number): string {
  return String(Math.round(value * 10000) / 10000);
}

function SectionLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.colors.textSecondary,
        fontSize: theme.fontSize.secondary,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
      }}
    >
      {children}
    </Text>
  );
}

export default function BenderPicker({
  spec,
  customSpecs,
  onChange,
  onCreateCustom,
}: BenderPickerProps) {
  const theme = useTheme();
  const [activeBrand, setActiveBrand] = useState<BenderBrand>(spec.brand);
  const [customName, setCustomName] = useState('');
  const [customR, setCustomR] = useState('');
  const [customTakeUp, setCustomTakeUp] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  // 外部选中规格变化时（如历史回填），tab 跟随切换
  useEffect(() => {
    setActiveBrand(spec.brand);
  }, [spec.brand]);

  const brand: BenderBrand = activeBrand;
  const brands: BenderBrand[] = [...listPresetBrands(), 'Custom'];

  const handleBrandPress = (next: BenderBrand) => {
    setActiveBrand(next);
    if (next === 'Custom') {
      return;
    }
    const model = listPresetModels(next)[0];
    const conduit = model ? listPresetConduits(next, model)[0] : undefined;
    const found =
      model && conduit ? findBenderSpec(next, model, conduit) : undefined;
    if (found) {
      onChange(found);
    }
  };

  const handleModelPress = (model: string) => {
    if (brand === 'Custom') {
      return;
    }
    const conduit = listPresetConduits(brand, model)[0];
    const found = conduit ? findBenderSpec(brand, model, conduit) : undefined;
    if (found) {
      onChange(found);
    }
  };

  const handleConduitPress = (conduit: string) => {
    if (brand === 'Custom') {
      return;
    }
    const found = findBenderSpec(brand, spec.model, conduit);
    if (found) {
      onChange(found);
    }
  };

  const handleSaveCustom = () => {
    const created = createCustomSpec(
      customName,
      Number(customR),
      Number(customTakeUp),
    );
    if (!created) {
      setCustomError('名称、R、take-up 都要填，且 R/take-up 为大于 0 的数字');
      return;
    }
    setCustomError(null);
    setCustomName('');
    setCustomR('');
    setCustomTakeUp('');
    onCreateCustom(created);
  };


  return (
    <View>
      <SectionLabel>弯管机</SectionLabel>
      <View style={styles.row}>
        {brands.map((value) => (
          <BigButton
            key={value}
            title={value === 'Custom' ? '自定义' : value}
            size="selection"
            selected={brand === value}
            onPress={() => handleBrandPress(value)}
            style={styles.optionButton}
          />
        ))}
      </View>

      {brand !== 'Custom' ? (
        <View>
          <SectionLabel>型号</SectionLabel>
          <View style={styles.row}>
            {listPresetModels(brand).map((model) => (
              <BigButton
                key={model}
                title={model}
                size="selection"
                selected={spec.model === model}
                onPress={() => handleModelPress(model)}
                style={styles.optionButton}
              />
            ))}
          </View>
          <SectionLabel>管径</SectionLabel>
          <View style={styles.row}>
            {listPresetConduits(brand, spec.model).map((conduit) => (
              <BigButton
                key={conduit}
                title={conduit}
                size="selection"
                selected={spec.conduit === conduit}
                onPress={() => handleConduitPress(conduit)}
                style={styles.optionButton}
              />
            ))}
          </View>
        </View>
      ) : (
        <View>
          {customSpecs.length > 0 ? (
            <View>
              <SectionLabel>已保存</SectionLabel>
              <View style={styles.row}>
                {customSpecs.map((custom) => (
                  <BigButton
                    key={custom.customName ?? custom.conduit}
                    title={displaySpecName(custom)}
                    size="selection"
                    selected={
                      spec.brand === 'Custom' &&
                      (spec.customName ?? spec.conduit) ===
                        (custom.customName ?? custom.conduit)
                    }
                    onPress={() => onChange(custom)}
                    style={styles.optionButton}
                  />
                ))}
              </View>
            </View>
          ) : null}
          <SectionLabel>手动创建（R / take-up）</SectionLabel>
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="名称，例如 我的弯管器"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                borderRadius: theme.radius,
                color: theme.colors.textPrimary,
                fontSize: theme.fontSize.body,
                paddingHorizontal: theme.spacing.md,
              },
            ]}
          />
          <View style={styles.inlineRow}>
            <TextInput
              value={customR}
              onChangeText={setCustomR}
              placeholder="R（英寸）"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                styles.halfInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius,
                  color: theme.colors.textPrimary,
                  fontSize: theme.fontSize.body,
                  paddingHorizontal: theme.spacing.md,
                },
              ]}
            />
            <TextInput
              value={customTakeUp}
              onChangeText={setCustomTakeUp}
              placeholder="take-up（英寸）"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                styles.halfInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius,
                  color: theme.colors.textPrimary,
                  fontSize: theme.fontSize.body,
                  paddingHorizontal: theme.spacing.md,
                },
              ]}
            />
          </View>
          {customError ? (
            <Text
              style={{
                color: theme.colors.error,
                fontSize: theme.fontSize.secondary,
                marginTop: theme.spacing.xs,
              }}
            >
              {customError}
            </Text>
          ) : null}
          <View style={{ marginTop: theme.spacing.sm }}>
            <BigButton
              title="保存并使用"
              variant="secondary"
              onPress={handleSaveCustom}
            />
          </View>
        </View>
      )}

      <Text
        style={{
          color: theme.colors.textSecondary,
          fontSize: theme.fontSize.secondary,
          marginTop: theme.spacing.sm,
          fontVariant: ['tabular-nums'],
        }}
      >
        {`R ${formatNum(spec.centerlineRadius)}" · take-up ${formatNum(spec.takeUp)}"${
          isHookDatum(spec) ? '（hook 前缘基准）' : ''
        }`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flexBasis: '30%',
    flexGrow: 1,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
  },
  halfInput: {
    flex: 1,
  },
});
