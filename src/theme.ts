import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { interactionColors } from './interactionColors';
import { brandPalette } from './brandPalette';

export type ColorSchemeName = 'light' | 'dark';

export interface ThemeColors {
  controlAccent: string;
  onControlAccent: string;
  pressFeedback: string;
  /** 文本选中底色，半透明黄以保留深浅模式的文字可读性。 */
  selection: string;
  /** 主色：图标深蓝，顶栏 / 结果卡 / 主按钮 */
  primary: string;
  /** 主色用于文字/图标时的可读变体（深色模式自动转浅色） */
  primaryText: string;
  /** 强调色：图标黄色，选中态 / CTA / 关键数字单位 */
  accent: string;
  /** 强调色用于浅底小字号文字时的深金变体，保证 WCAG AA 对比度 */
  accentText: string;
  /** 页面背景 */
  background: string;
  /** 卡片底 */
  card: string;
  /** 正文主色 */
  textPrimary: string;
  /** 次要文字 */
  textSecondary: string;
  /** 深色底上的文字 / 主按钮文字 */
  onPrimary: string;
  /** 成功态 */
  success: string;
  /** 错误态 */
  error: string;
  /** 分隔线 / 输入框描边 */
  border: string;
  /** 结果卡背景 */
  resultBackground: string;
  /** 结果卡文字 */
  resultText: string;
  /** 结果卡标签文字 */
  resultLabel: string;
  /** 黄底上的深蓝文字 */
  onAccent: string;
}

export const lightColors: ThemeColors = {
  ...interactionColors,
  selection: `${brandPalette.yellow}59`,
  primary: brandPalette.navy,
  primaryText: brandPalette.navy,
  accent: brandPalette.yellow,
  accentText: brandPalette.goldText,
  background: '#F5F8FB',
  card: '#FFFFFF',
  textPrimary: brandPalette.navy,
  textSecondary: '#52677B',
  onPrimary: '#FFFFFF',
  success: '#16A34A',
  error: '#DC2626',
  border: '#D9E2EB',
  resultBackground: brandPalette.navy,
  resultText: '#FFFFFF',
  resultLabel: '#BED0DF',
  onAccent: brandPalette.navy,
};

export const darkColors: ThemeColors = {
  ...interactionColors,
  selection: `${brandPalette.yellow}40`,
  primary: brandPalette.navy,
  primaryText: '#F3F6FA',
  accent: brandPalette.yellow,
  accentText: brandPalette.yellow,
  background: '#091D30',
  card: '#15334F',
  textPrimary: '#F3F6FA',
  textSecondary: '#AEC0D1',
  onPrimary: '#FFFFFF',
  success: '#4ADE80',
  error: '#F87171',
  border: '#2B4862',
  resultBackground: brandPalette.navy,
  resultText: '#FFFFFF',
  resultLabel: '#BED0DF',
  onAccent: brandPalette.navy,
};

/** 圆角 8pt */
export const radius = 8;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fontSize = {
  /** 结果数字 40pt */
  result: 40,
  /** 标题 24pt */
  title: 24,
  /** 正文 16pt */
  body: 16,
  /** 次要 14pt */
  secondary: 14,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
} as const;

export const size = {
  /** 按钮最小高度 56pt */
  buttonMinHeight: 56,
  /** 数字 / 选择按钮 ≥64pt */
  selectionButtonHeight: 64,
  /** 首页大卡片最小高度 72pt */
  largeCardMinHeight: 72,
} as const;

export interface Theme {
  scheme: ColorSchemeName;
  colors: ThemeColors;
  radius: number;
  spacing: typeof spacing;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  size: typeof size;
}

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  radius,
  spacing,
  fontSize,
  fontWeight,
  size,
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  radius,
  spacing,
  fontSize,
  fontWeight,
  size,
};

export function getTheme(scheme: ColorSchemeName | null | undefined): Theme {
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export function useTheme(): Theme {
  return getTheme(useColorScheme());
}

/** 将应用主题映射为 React Navigation 主题，保证导航容器/页面底色跟随深色模式 */
export function getNavigationTheme(theme: Theme): NavigationTheme {
  const base = theme.scheme === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;
  return {
    ...base,
    dark: theme.scheme === 'dark',
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.accent,
    },
  };
}
