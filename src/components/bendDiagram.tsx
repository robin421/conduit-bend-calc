import { useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import type { DiagramInput } from '../calculators/diagrams/diagrams.ts';
import { buildBendDiagram } from '../calculators/diagrams/diagrams.ts';
import { useTheme } from '../theme.ts';

interface BendDiagramProps {
  /** 图解输入（引擎计算结果）；null 时渲染空占位，不 crash */
  input: DiagramInput | null;
  /** 图解高度（spec §4：160–200） */
  height?: number;
}

const TICK_HALF = 8;
const LABEL_GAP = 18;
const VALUE_GAP = 32;

/**
 * 标记图解渲染组件：只渲染，不做数学。
 * 几何全部来自 buildBendDiagram 纯函数。
 * 颜色：管线用 theme 主文字色（浅色深灰/深色浅灰），mark 红色跟随 theme.error，
 * 尺寸/注释用次要文字色；深色模式自动跟随。
 */
export default function BendDiagram({ input, height = 180 }: BendDiagramProps) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(240, windowWidth - theme.spacing.md * 2);

  const diagram = useMemo(
    () => (input ? buildBendDiagram(input, width, height) : null),
    [input, width, height],
  );

  const lineColor = theme.colors.textPrimary;
  const markColor = theme.colors.error;
  const dimColor = theme.colors.textSecondary;

  if (!diagram) {
    return <View style={{ height }} />;
  }

  return (
    <View style={{ height }}>
      <Svg
        width={diagram.width}
        height={diagram.height}
        viewBox={`0 0 ${diagram.width} ${diagram.height}`}
      >
        <Path
          d={diagram.conduitPath}
          stroke={lineColor}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {diagram.dimensions.map((dim, i) => (
          <Line
            key={`dim-${i}`}
            x1={dim.from.x}
            y1={dim.from.y}
            x2={dim.to.x}
            y2={dim.to.y}
            stroke={dimColor}
            strokeWidth={1}
          />
        ))}
        {diagram.dimensions.map((dim, i) => (
          <SvgText
            key={`dimlabel-${i}`}
            x={dim.labelAt.x}
            y={dim.labelAt.y}
            fill={dimColor}
            fontSize={11}
            textAnchor="middle"
          >
            {dim.label}
          </SvgText>
        ))}
        {diagram.marks.map((mark, i) => (
          <Line
            key={`tick-${i}`}
            x1={mark.point.x - mark.tickDir.x * TICK_HALF}
            y1={mark.point.y - mark.tickDir.y * TICK_HALF}
            x2={mark.point.x + mark.tickDir.x * TICK_HALF}
            y2={mark.point.y + mark.tickDir.y * TICK_HALF}
            stroke={markColor}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ))}
        {diagram.marks.map((mark, i) => (
          <SvgText
            key={`marklabel-${i}`}
            x={mark.point.x + mark.tickDir.x * LABEL_GAP}
            y={mark.point.y + mark.tickDir.y * LABEL_GAP + 4}
            fill={markColor}
            fontSize={12}
            fontWeight="600"
            textAnchor="middle"
          >
            {mark.label}
          </SvgText>
        ))}
        {diagram.marks.map((mark, i) =>
          mark.valueText ? (
            <SvgText
              key={`markvalue-${i}`}
              x={mark.point.x + mark.tickDir.x * VALUE_GAP}
              y={mark.point.y + mark.tickDir.y * VALUE_GAP + 4}
              fill={markColor}
              fontSize={11}
              textAnchor="middle"
            >
              {mark.valueText}
            </SvgText>
          ) : null,
        )}
        {diagram.angles.map((angle, i) => (
          <SvgText
            key={`angle-${i}`}
            x={angle.point.x}
            y={angle.point.y}
            fill={dimColor}
            fontSize={11}
            textAnchor="middle"
          >
            {angle.text}
          </SvgText>
        ))}
        {diagram.notes.map((note, i) => (
          <SvgText
            key={`note-${i}`}
            x={note.point.x}
            y={note.point.y}
            fill={dimColor}
            fontSize={11}
            textAnchor="middle"
          >
            {note.text}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
