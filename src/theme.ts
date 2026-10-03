import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  Theme as NavigationTheme,
} from '@react-navigation/native';
import { useColorScheme } from 'react-native';

export type ColorSchemeName = 'light' | 'dark';

export interface ThemeColors {
  /** 主色：炭黑，顶栏 / 结果卡 / 主按钮 */
  primary: string;
  /** 主色用于文字/图标时的可读变体（深色模式自动转浅色） */
  primaryText: string;
  /** 强调色：电工橙，选中态 / CTA / 关键数字单位 */
  accent: string;
  /** 强调色用于浅底小字号文字时的加深变体，保证 WCAG AA 对比度 */
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
  /** 橙底上的文字 */
  onAccent: string;
}

export const lightColors: ThemeColors = {
  primary: '#1A1A1A',
  primaryText: '#1A1A1A',
  accent: '#FF6B00',
  // #FF6B00 在浅底小字号仅 ~2.9:1，加深到 #C2410C（~5.2:1）用于文字/图标。
  accentText: '#C2410C',
  background: '#FFFFFF',
  card: '#F8F9FA',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  onPrimary: '#FFFFFF',
  success: '#16A34A',
  error: '#DC2626',
  border: '#E5E7EB',
  resultBackground: '#1A1A1A',
  resultText: '#FFFFFF',
  resultLabel: '#B8BEC6',
  onAccent: '#1A1A1A',
};

export const darkColors: ThemeColors = {
  // 深色底上炭黑不可读，主色抬升为 elevated charcoal 作表面色。
  primary: '#2E2E2E',
  /** 深色底上的主色文字/图标改用正文浅色 */
  primaryText: '#EDEDED',
  /** 电工橙在深底上略提亮，减少眩光 */
  accent: '#FF8533',
  accentText: '#FF8533',
  background: '#121212',
  card: '#1E1E1E',
  textPrimary: '#EDEDED',
  textSecondary: '#9CA3AF',
  onPrimary: '#FFFFFF',
  success: '#4ADE80',
  error: '#F87171',
  border: '#2D2D2D',
  resultBackground: '#1A1A1A',
  resultText: '#FFFFFF',
  resultLabel: '#B8BEC6',
  onAccent: '#1A1A1A',
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
