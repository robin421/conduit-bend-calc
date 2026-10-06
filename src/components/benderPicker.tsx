import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
import { matchesConduitType, type ConduitType } from '../lib/profile';
import { useProAccess } from '../lib/proStore';
import { useTheme } from '../theme';
import BigButton from './bigButton';
import { resolveCustomCreateMode } from './benderPickerGating';

interface BenderPickerProps {
  /** 当前选中的规格 */
  spec: BenderSpec;
  /** 已保存的 Custom 规格（最新在前） */
  customSpecs: readonly BenderSpec[];
  /** 选中预设或已有 Custom 时回调 */
  onChange: (spec: BenderSpec) => void;
  /** 手动创建 Custom 规格时回调（父组件负责持久化并选中） */
  onCreateCustom: (spec: BenderSpec) => void;
  /** 是否允许 Custom / 手动新建；Guided Calibration 只需 Standard 预设。 */
  allowCustom?: boolean;
  /** 锁定态点击 "Unlock Pro" 时回调（通常导航到 Paywall）。 */
  onUnlockPro?: () => void;
  /** 仅展示指定导体材质（EMT / Rigid）的预设；缺省展示全部。 */
  conduitTypeFilter?: ConduitType;
}

function formatNum(value: number): string {
  return String(Math.round(value * 10000) / 10000);
}

/** 该品牌下属于指定材质的型号（材质缺省时返回全部）。 */
function modelsFor(brand: BenderBrand, filter?: ConduitType): string[] {
  const all = listPresetModels(brand);
  if (!filter) {
    return all;
  }
  return all.filter((model) =>
    listPresetConduits(brand, model).some((conduit) =>
      matchesConduitType(conduit, filter),
    ),
  );
}

/** 某品牌 + 型号下属于指定材质的管径（材质缺省时返回全部）。 */
function conduitsFor(
  brand: BenderBrand,
  model: string,
  filter?: ConduitType,
): string[] {
  const all = listPresetConduits(brand, model);
  if (!filter) {
    return all;
  }
  return all.filter((conduit) => matchesConduitType(conduit, filter));
}

/** 至少有一个指定材质预设的品牌（材质缺省时返回全部）。 */
function brandsFor(filter?: ConduitType): BenderBrand[] {
  const all = listPresetBrands();
  if (!filter) {
    return all;
  }
  return all.filter((brand) => modelsFor(brand, filter).length > 0);
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
  allowCustom = true,
  onUnlockPro,
  conduitTypeFilter,
}: BenderPickerProps) {
  const theme = useTheme();
  const { access } = useProAccess();
  const createMode = resolveCustomCreateMode(access, onUnlockPro !== undefined);
  const [activeBrand, setActiveBrand] = useState<BenderBrand>(spec.brand);
  /** 默认折叠为摘要行：选择器纵向太占空间，输入框应首屏可见 */
  const [expanded, setExpanded] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customR, setCustomR] = useState('');
  const [customTakeUp, setCustomTakeUp] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);

  // 外部选中规格变化时（如历史回填），tab 跟随切换
  useEffect(() => {
    setActiveBrand(spec.brand);
  }, [spec.brand]);

  const brand: BenderBrand = activeBrand;
  const presetBrands = brandsFor(conduitTypeFilter);
  const presetModels = modelsFor(brand, conduitTypeFilter);
  const presetConduits = conduitsFor(brand, spec.model, conduitTypeFilter);
  const brands: BenderBrand[] = allowCustom
    ? [...presetBrands, 'Custom']
    : [...presetBrands];

  const handleBrandPress = (next: BenderBrand) => {
    setActiveBrand(next);
    if (next === 'Custom') {
      return;
    }
    const model = modelsFor(next, conduitTypeFilter)[0];
    const conduit = model
      ? conduitsFor(next, model, conduitTypeFilter)[0]
      : undefined;
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
    const conduit = conduitsFor(brand, model, conduitTypeFilter)[0];
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
    // 防御性检查：锁定态不允许创建（UI 已 gate，这里兜底）。
    if (access !== 'unlocked') {
      return;
    }
    const created = createCustomSpec(
      customName,
      Number(customR),
      Number(customTakeUp),
    );
    if (!created) {
      setCustomError('Enter a name, R and take-up — R / take-up must be numbers greater than 0');
      return;
    }
    setCustomError(null);
    setCustomName('');
    setCustomR('');
    setCustomTakeUp('');
    onCreateCustom(created);
  };


  const specCaption = `R ${formatNum(spec.centerlineRadius)}" · take-up ${formatNum(
    spec.takeUp,
  )}"${isHookDatum(spec) ? '(hook front-edge datum)' : ''}`;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse bender picker' : 'Expand to change bender'}
        onPress={() => setExpanded((value) => !value)}
        android_ripple={{ color: theme.colors.border }}
        style={styles.summaryRow}
      >
        <View style={styles.summaryText}>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
            }}
          >
            Bender
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.fontSize.body,
              fontWeight: theme.fontWeight.semibold,
              marginTop: 2,
            }}
          >
            {displaySpecName(spec)}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: theme.fontSize.secondary,
              marginTop: 2,
              fontVariant: ['tabular-nums'],
            }}
          >
            {specCaption}
          </Text>
        </View>
        <Text
          style={[styles.summaryChevron, { color: theme.colors.textSecondary }]}
        >
          {expanded ? '▾' : '▸'}
        </Text>
      </Pressable>

      {expanded ? (
        <View>
      <View style={styles.row}>
        {brands.map((value) => (
          <BigButton
            key={value}
            title={value === 'Custom' ? 'My Bender' : value}
            size="selection"
            selected={brand === value}
            onPress={() => handleBrandPress(value)}
            style={styles.optionButton}
          />
        ))}
      </View>

      {brand !== 'Custom' ? (
        <View>
          <SectionLabel>Model</SectionLabel>
          <View style={styles.row}>
            {presetModels.map((model) => (
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
          <SectionLabel>Conduit size</SectionLabel>
          <View style={styles.row}>
            {presetConduits.map((conduit) => (
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
              <SectionLabel>My Benders</SectionLabel>              <View style={styles.row}>
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
          {createMode === 'form' ? (
            <View>
          <SectionLabel>Create manually (R / take-up)</SectionLabel>
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="Name, e.g. My bender (field-tested)"
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
              placeholder="R (inches)"
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
              placeholder="take-up (inches)"
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
              title="Save & use"
              variant="secondary"
              onPress={handleSaveCustom}
            />
          </View>
            </View>
          ) : createMode === 'locked' ? (
            <View>
              <SectionLabel>Create manually (R / take-up)</SectionLabel>
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontSize: theme.fontSize.secondary,
                }}
              >
                Custom benders are a Pro feature.
              </Text>
              <View style={{ marginTop: theme.spacing.sm }}>
                <BigButton title="Unlock Pro" onPress={() => onUnlockPro?.()} />
              </View>
            </View>
          ) : null}
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
        {specCaption}
      </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryText: {
    flex: 1,
  },
  summaryChevron: {
    fontSize: 22,
    marginLeft: 8,
  },
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
