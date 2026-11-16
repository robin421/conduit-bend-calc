import type { ReactNode } from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: string;
}

const DEFAULT_SIZE = 20;
const DEFAULT_COLOR = '#0F2B46';

function WireframeSvg({
  size = DEFAULT_SIZE,
  children,
}: {
  size?: number;
  children: ReactNode;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {children}
    </Svg>
  );
}

const STROKE_PROPS = {
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

/* ------------------------------------------------------------------ */
/* Tab 图标                                                            */
/* ------------------------------------------------------------------ */

/** 计算器 / 卡尺图标 */
export function CalculateIcon({ size = 22, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Rect x="4.5" y="2.5" width="15" height="19" rx="2" stroke={color} {...STROKE_PROPS} />
      <Rect x="7.5" y="5.5" width="9" height="4" rx="0.75" stroke={color} {...STROKE_PROPS} />
      <Line x1="8" y1="13" x2="8.01" y2="13" stroke={color} {...STROKE_PROPS} />
      <Line x1="12" y1="13" x2="12.01" y2="13" stroke={color} {...STROKE_PROPS} />
      <Line x1="16" y1="13" x2="16.01" y2="13" stroke={color} {...STROKE_PROPS} />
      <Line x1="8" y1="16.5" x2="8.01" y2="16.5" stroke={color} {...STROKE_PROPS} />
      <Line x1="12" y1="16.5" x2="12.01" y2="16.5" stroke={color} {...STROKE_PROPS} />
      <Line x1="16" y1="16.5" x2="16.01" y2="16.5" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** 速查表 / 表格尺规图标 */
export function ReferenceIcon({ size = 22, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Rect x="3" y="4" width="18" height="16" rx="2" stroke={color} {...STROKE_PROPS} />
      <Line x1="3" y1="9.5" x2="21" y2="9.5" stroke={color} {...STROKE_PROPS} />
      <Line x1="9.5" y1="9.5" x2="9.5" y2="20" stroke={color} {...STROKE_PROPS} />
      <Line x1="3" y1="14.75" x2="21" y2="14.75" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** 历史 / 时钟回溯图标 */
export function HistoryIcon({ size = 22, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Path d="M3.5 12a8.5 8.5 0 1 0 2.5-6.01L3.5 8.5" stroke={color} {...STROKE_PROPS} />
      <Polyline points="3.5 4 3.5 8.5 8 8.5" stroke={color} {...STROKE_PROPS} />
      <Polyline points="12 7.5 12 12 15 13.75" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/* ------------------------------------------------------------------ */
/* 计算器卡片图标                                                      */
/* ------------------------------------------------------------------ */

/** Offset（折线偏移管） */
export function OffsetIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Polyline points="2.5 16 8 16 16 8 21.5 8" stroke={color} {...STROKE_PROPS} />
      <Line x1="8" y1="16" x2="8" y2="19.5" stroke={color} {...STROKE_PROPS} />
      <Line x1="16" y1="4.5" x2="16" y2="8" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** 90° Stub（90° 弯管） */
export function StubIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Path d="M6 4v9a5 5 0 0 0 5 5h9" stroke={color} {...STROKE_PROPS} />
      <Line x1="4" y1="18" x2="8" y2="18" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** 3-Point Saddle（3 点马鞍） */
export function ThreePointSaddleIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Polyline points="2 16 6.5 16 12 7.5 17.5 16 22 16" stroke={color} {...STROKE_PROPS} />
      <Circle cx="12" cy="15.5" r="2" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** 4-Point Saddle（4 点马鞍） */
export function FourPointSaddleIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Polyline points="2 16.5 5 16.5 8.5 8.5 15.5 8.5 19 16.5 22 16.5" stroke={color} {...STROKE_PROPS} />
      <Rect x="10" y="13" width="4" height="3.5" rx="0.5" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** Rolling Offset（三维斜偏移） */
export function RollingOffsetIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Rect x="6" y="6" width="12" height="12" rx="1" stroke={color} strokeOpacity={0.35} {...STROKE_PROPS} />
      <Line x1="4" y1="18" x2="20" y2="6" stroke={color} {...STROKE_PROPS} />
      <Polyline points="15 6 20 6 20 11" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** Kicked 90°（带踢角 90°） */
export function Kicked90Icon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Path d="M4.5 17.5h6l3.5-2.5a3 3 0 0 0 1.25-2.44V4.5" stroke={color} {...STROKE_PROPS} />
      <Line x1="15.25" y1="17.5" x2="19.5" y2="17.5" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** Conduit Fill（圆管截面穿线） */
export function ConduitFillIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Circle cx="12" cy="12" r="8.5" stroke={color} {...STROKE_PROPS} />
      <Circle cx="12" cy="8.5" r="2.2" stroke={color} {...STROKE_PROPS} />
      <Circle cx="9" cy="14" r="2.2" stroke={color} {...STROKE_PROPS} />
      <Circle cx="15" cy="14" r="2.2" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** Wire Size（线规截面） */
export function WireSizeIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Circle cx="12" cy="12" r="8" stroke={color} {...STROKE_PROPS} />
      <Circle cx="12" cy="12" r="4" stroke={color} {...STROKE_PROPS} />
      <Line x1="4" y1="20" x2="4" y2="4" stroke={color} {...STROKE_PROPS} />
      <Line x1="20" y1="20" x2="20" y2="4" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** Voltage Drop（精准折线闪电，非 Emoji） */
export function VoltageDropIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Polyline points="13.5 3 6.5 13 12 13 10.5 21 17.5 11 12 11 13.5 3" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** Dial In My Bender（弯管器校准准星） */
export function BenderDialIcon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Circle cx="12" cy="12" r="7.5" stroke={color} {...STROKE_PROPS} />
      <Circle cx="12" cy="12" r="2" stroke={color} {...STROKE_PROPS} />
      <Line x1="12" y1="2.5" x2="12" y2="6.5" stroke={color} {...STROKE_PROPS} />
      <Line x1="12" y1="17.5" x2="12" y2="21.5" stroke={color} {...STROKE_PROPS} />
      <Line x1="2.5" y1="12" x2="6.5" y2="12" stroke={color} {...STROKE_PROPS} />
      <Line x1="17.5" y1="12" x2="21.5" y2="12" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/* ------------------------------------------------------------------ */
/* 通用图标                                                            */
/* ------------------------------------------------------------------ */

/** 细线右箭头 */
export function ChevronRightIcon({ size = 18, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Polyline points="9 6 15 12 9 18" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** 双页复制图标 */
export function CopyIcon({ size = 18, color = DEFAULT_COLOR }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Rect x="9" y="9" width="11" height="11" rx="2" stroke={color} {...STROKE_PROPS} />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}

/** 汉堡菜单图标 */
export function MenuIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <WireframeSvg size={size}>
      <Line x1="4" y1="7" x2="20" y2="7" stroke={color} {...STROKE_PROPS} />
      <Line x1="4" y1="12" x2="20" y2="12" stroke={color} {...STROKE_PROPS} />
      <Line x1="4" y1="17" x2="20" y2="17" stroke={color} {...STROKE_PROPS} />
    </WireframeSvg>
  );
}
