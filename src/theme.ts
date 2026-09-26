import { useColorScheme } from 'react-native';

export type ColorSchemeName = 'light' | 'dark';

export interface ThemeColors {
  /** 主色：深蓝，顶栏 / 结果卡 / 主按钮 */
  primary: string;
  /** 强调色：警示金，选中态 / 关键数字单位 / CTA */
  accent: string;
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
  /** 金色底上的文字 */
  onAccent: string;
}

export const lightColors: ThemeColors = {
  primary: '#0F2B46',
  accent: '#F4C317',
  background: '#FFFFFF',
  card: '#F9FAFB',
  textPrimary: '#1F2933',
  textSecondary: '#6B7280',
  onPrimary: '#FFFFFF',
  success: '#2F855A',
  error: '#C53030',
  border: '#E5E7EB',
  resultBackground: '#0F2B46',
  resultText: '#FFFFFF',
  resultLabel: '#C7D2DE',
  onAccent: '#1F2933',
};

export const darkColors: ThemeColors = {
  primary: '#0F2B46',
  /** 强调金略降饱和 */
  accent: '#D9B24A',
  background: '#121212',
  card: '#1E1E1E',
  textPrimary: '#EDEDED',
  textSecondary: '#9CA3AF',
  onPrimary: '#FFFFFF',
  success: '#48BB78',
  error: '#F56565',
  border: '#2D2D2D',
  resultBackground: '#0F2B46',
  resultText: '#FFFFFF',
  resultLabel: '#C7D2DE',
  onAccent: '#1F2933',
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
