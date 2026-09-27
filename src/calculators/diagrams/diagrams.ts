/**
 * 标记图解几何（纯函数）：输入=引擎计算结果，输出=SVG 坐标。
 *
 * 组件层（components/bendDiagram.tsx）只负责渲染，不做数学。
 * 构造约定：
 * - 先在"英寸空间"（y 轴向上）里画出管线中心线（含固定示意弯弧），
 *   再等比映射到 SVG viewBox（y 轴向下），横纵等比锁定、不拉伸。
 * - 弯弧用固定示意半径（SCHEMATIC_BEND_R），不按 R 严格比例，
 *   避免小 R 时弧看不见；标注文字只写计算值（spec §4）。
 * - 未验证公式沿用 geometry.ts 的 ⚠️ 注释规范。
 */
import { formatImperial } from '../../lib/imperial.ts';

/** SVG 坐标点（y 向下为正，已完成 inch→SVG 映射） */
export interface DiagramPoint {
  x: number;
  y: number;
}

export interface DiagramMark {
  /** SVG 坐标 */
  point: DiagramPoint;
  /** 标记名，如 "M1" */
  label: string;
  /** 值标注（已 formatImperial），无则为 null */
  valueText: string | null;
  /** tick 方向（SVG 坐标系下的单位向量） */
  tickDir: DiagramPoint;
}

export interface DiagramDimension {
  /** 尺寸线两端（SVG 坐标，已做偏移、不压管线） */
  from: DiagramPoint;
  to: DiagramPoint;
  /** 标注文字（已 formatImperial） */
  label: string;
  /** 标注文字位置（SVG 坐标） */
  labelAt: DiagramPoint;
}

export interface DiagramText {
  point: DiagramPoint;
  text: string;
}

export interface BendDiagram {
  width: number;
  height: number;
  /** 管线中心线 SVG path d */
  conduitPath: string;
  marks: DiagramMark[];
  dimensions: DiagramDimension[];
  angles: DiagramText[];
  notes: DiagramText[];
}

export type DiagramInput =
  | {
      kind: 'offset';
      height: number;
      thetaDeg: number;
      spacingDisplay: number;
      shrinkDisplay: number;
    }
  | { kind: 'stub'; stubHeight: number; markPoint: number }
  | { kind: 'saddle3'; height: number; sideSpacingDisplay: number }
  | {
      kind: 'saddle4';
      height: number;
      thetaDeg: number;
      legSpacingDisplay: number;
      flatWidth: number;
    }
  | {
      kind: 'rolling';
      rise: number;
      roll: number;
      trueOffset: number;
      rollAngleDeg: number;
      thetaDeg: number;
      spacingDisplay: number;
      shrinkDisplay: number;
    }
  | {
      kind: 'kicked90';
      kickAngleDeg: number;
      straightLength: number;
      totalGain: number;
    };

// ---------- 英寸空间（y 轴向上） ----------

interface InchPt {
  x: number;
  y: number;
}

/** 示意弯弧半径（英寸）：固定值，不按 R 严格比例（spec §4） */
const SCHEMATIC_BEND_R = 1.25;
/** viewBox 内边距占宽高的比例 */
const PAD_RATIO = 0.12;
/** 贝塞尔采样步数 */
const ARC_STEPS = 10;

function isPositiveFinite(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

function norm(p: InchPt): InchPt {
  const len = Math.hypot(p.x, p.y);
  if (len <= 0) {
    return { x: 1, y: 0 };
  }
  return { x: p.x / len, y: p.y / len };
}

function add(a: InchPt, b: InchPt): InchPt {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scaleVec(p: InchPt, s: number): InchPt {
  return { x: p.x * s, y: p.y * s };
}

function mid(a: InchPt, b: InchPt): InchPt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** 管线路径构造器：直线 + 以 vertex 为控制点的示意弯弧 */
class InchPath {
  private pts: InchPt[] = [];

  moveTo(p: InchPt): this {
    this.pts.push({ x: p.x, y: p.y });
    return this;
  }

  lineTo(p: InchPt): this {
    this.pts.push({ x: p.x, y: p.y });
    return this;
  }

  /**
   * 示意弯：从当前点直线走到切点，再以 vertex 为控制点、
   * 沿 outDir 方向转出。切线长 tangentLen 控制弧的大小。
   */
  bend(vertex: InchPt, inDir: InchPt, outDir: InchPt, tangentLen: number): this {
    const start = add(vertex, scaleVec(inDir, -tangentLen));
    const end = add(vertex, scaleVec(outDir, tangentLen));
    this.lineTo(start);
    for (let i = 1; i <= ARC_STEPS; i++) {
      const t = i / ARC_STEPS;
      const mt = 1 - t;
      this.pts.push({
        x: mt * mt * start.x + 2 * mt * t * vertex.x + t * t * end.x,
        y: mt * mt * start.y + 2 * mt * t * vertex.y + t * t * end.y,
      });
    }
    return this;
  }

  points(): InchPt[] {
    return this.pts;
  }
}

interface InchMark {
  point: InchPt;
  label: string;
  valueText: string | null;
  tickDir: InchPt;
}

interface InchDim {
  from: InchPt;
  to: InchPt;
  label: string;
  labelAt: InchPt;
}

interface InchDiagram {
  path: InchPath;
  marks: InchMark[];
  dimensions: InchDim[];
  angles: InchPt[];
  angleTexts: string[];
  notes: InchPt[];
  noteTexts: string[];
}

/**
 * 尺寸线：把 from→to 沿法线方向偏移 offsetInches（不压管线），
 * 标注文字放在中点再沿法线外移。sideSign 决定偏移朝哪边。
 */
function offsetDim(
  from: InchPt,
  to: InchPt,
  label: string,
  sideSign: number,
  offsetInches = 1.5,
): InchDim {
  const dir = norm({ x: to.x - from.x, y: to.y - from.y });
  const perp = norm({ x: -dir.y * sideSign, y: dir.x * sideSign });
  const off = scaleVec(perp, offsetInches);
  const m = mid(from, to);
  return {
    from: add(from, off),
    to: add(to, off),
    label,
    labelAt: add(m, scaleVec(perp, offsetInches + 0.9)),
  };
}

// ---------- 各弯法英寸空间构造 ----------

function buildOffsetInch(
  height: number,
  thetaDeg: number,
  spacingDisplay: number,
  shrinkDisplay: number,
): InchDiagram | null {
  if (!isPositiveFinite(height) || !isPositiveFinite(spacingDisplay)) {
    return null;
  }
  if (!Number.isFinite(thetaDeg) || thetaDeg <= 0 || thetaDeg >= 90) {
    return null;
  }
  if (!Number.isFinite(shrinkDisplay) || shrinkDisplay < 0) {
    return null;
  }
  const theta = (thetaDeg * Math.PI) / 180;
  const S = spacingDisplay;
  const d0: InchPt = { x: 1, y: 0 };
  const d1: InchPt = { x: Math.cos(theta), y: Math.sin(theta) };
  const t = Math.min(SCHEMATIC_BEND_R * Math.tan(theta / 2), S * 0.22);
  const lead = Math.max(1.5, S * 0.12);
  const M1: InchPt = { x: 0, y: 0 };
  const M2: InchPt = { x: S, y: height };

  const path = new InchPath();
  path.moveTo({ x: -lead, y: 0 });
  path.bend(M1, d0, d1, t);
  path.lineTo(add(M2, scaleVec(d1, -t)));
  path.bend(M2, d1, d0, t);
  path.lineTo({ x: S + lead, y: height });

  const up: InchPt = { x: 0, y: 1 };
  const m = mid(M1, M2);
  return {
    path,
    marks: [
      { point: M1, label: 'M1', valueText: null, tickDir: up },
      { point: M2, label: 'M2', valueText: null, tickDir: up },
    ],
    dimensions: [offsetDim(M1, M2, formatImperial(S), -1)],
    angles: [
      add(M1, { x: -0.6, y: -1.4 }),
      add(M2, { x: 0.6, y: 1.4 }),
    ],
    angleTexts: [`${thetaDeg}°`, `${thetaDeg}°`],
    notes: [add(m, { x: 0, y: 1.8 })],
    noteTexts: [`shrink ${formatImperial(shrinkDisplay)}`],
  };
}

function buildStubInch(stubHeight: number, markPoint: number): InchDiagram | null {
  if (!isPositiveFinite(stubHeight) || !isPositiveFinite(markPoint)) {
    return null;
  }
  if (markPoint >= stubHeight) {
    return null;
  }
  const lead = Math.max(1, stubHeight * 0.1);
  const path = new InchPath();
  path.moveTo({ x: 0, y: -lead });
  path.lineTo({ x: 0, y: stubHeight });

  const mark: InchPt = { x: 0, y: markPoint };
  return {
    path,
    marks: [
      {
        point: mark,
        label: 'M1',
        valueText: formatImperial(markPoint),
        tickDir: { x: 1, y: 0 },
      },
    ],
    dimensions: [
      offsetDim({ x: 0, y: 0 }, { x: 0, y: stubHeight }, formatImperial(stubHeight), 1),
    ],
    angles: [],
    angleTexts: [],
    notes: [],
    noteTexts: [],
  };
}

function buildSaddle3Inch(height: number, sideSpacing: number): InchDiagram | null {
  if (!isPositiveFinite(height) || !isPositiveFinite(sideSpacing)) {
    return null;
  }
  const side = sideSpacing;
  const S1: InchPt = { x: -side, y: 0 };
  const C: InchPt = { x: 0, y: height };
  const S2: InchPt = { x: side, y: 0 };
  const horiz: InchPt = { x: 1, y: 0 };
  const up = norm({ x: side, y: height });
  const down = norm({ x: side, y: -height });
  const t = Math.min(0.9, side * 0.18);
  const lead = Math.max(1.5, side * 0.25);

  const path = new InchPath();
  path.moveTo({ x: -side - lead, y: 0 });
  path.bend(S1, horiz, up, t);
  path.lineTo(add(C, scaleVec(up, -t)));
  path.bend(C, up, down, t);
  path.lineTo(add(S2, scaleVec(down, -t)));
  path.bend(S2, down, horiz, t);
  path.lineTo({ x: side + lead, y: 0 });

  const v: InchPt = { x: 0, y: 1 };
  return {
    path,
    marks: [
      { point: S1, label: 'M1', valueText: null, tickDir: v },
      { point: C, label: 'M2', valueText: null, tickDir: v },
      { point: S2, label: 'M3', valueText: null, tickDir: v },
    ],
    dimensions: [
      offsetDim(S1, C, formatImperial(side), -1),
      offsetDim(C, S2, formatImperial(side), -1),
    ],
    angles: [
      add(S1, { x: -0.7, y: -1.4 }),
      add(C, { x: 0.7, y: 1.2 }),
      add(S2, { x: 0.7, y: -1.4 }),
    ],
    angleTexts: ['22.5°', '45°', '22.5°'],
    notes: [],
    noteTexts: [],
  };
}

function buildSaddle4Inch(
  height: number,
  thetaDeg: number,
  legSpacing: number,
  flatWidth: number,
): InchDiagram | null {
  if (!isPositiveFinite(height) || !isPositiveFinite(legSpacing) || !isPositiveFinite(flatWidth)) {
    return null;
  }
  if (!Number.isFinite(thetaDeg) || thetaDeg <= 0 || thetaDeg >= 90) {
    return null;
  }
  const theta = (thetaDeg * Math.PI) / 180;
  const S = legSpacing;
  const W = flatWidth;
  const d0: InchPt = { x: 1, y: 0 };
  const d1: InchPt = { x: Math.cos(theta), y: Math.sin(theta) };
  const dDown: InchPt = { x: Math.cos(theta), y: -Math.sin(theta) };
  const t = Math.min(SCHEMATIC_BEND_R * Math.tan(theta / 2), S * 0.22);
  const lead = Math.max(1.5, S * 0.12);
  const M1: InchPt = { x: 0, y: 0 };
  const M2: InchPt = { x: S, y: height };
  const M3: InchPt = { x: S + W, y: height };
  const M4: InchPt = { x: 2 * S + W, y: 0 };

  const path = new InchPath();
  path.moveTo({ x: -lead, y: 0 });
  path.bend(M1, d0, d1, t);
  path.lineTo(add(M2, scaleVec(d1, -t)));
  path.bend(M2, d1, d0, t);
  path.lineTo(add(M3, scaleVec(d0, -t)));
  path.bend(M3, d0, dDown, t);
  path.lineTo(add(M4, scaleVec(dDown, t)));
  path.bend(M4, dDown, d0, t);
  path.lineTo({ x: 2 * S + W + lead, y: 0 });

  const v: InchPt = { x: 0, y: 1 };
  return {
    path,
    marks: [
      { point: M1, label: 'M1', valueText: null, tickDir: v },
      { point: M2, label: 'M2', valueText: null, tickDir: v },
      { point: M3, label: 'M3', valueText: null, tickDir: v },
      { point: M4, label: 'M4', valueText: null, tickDir: v },
    ],
    dimensions: [
      offsetDim(M1, M2, formatImperial(S), -1),
      offsetDim(M2, M3, formatImperial(W), 1),
      offsetDim(M3, M4, formatImperial(S), -1),
    ],
    angles: [
      add(M1, { x: -0.6, y: -1.4 }),
      add(M2, { x: -0.6, y: 1.4 }),
      add(M3, { x: 0.6, y: 1.4 }),
      add(M4, { x: 0.6, y: -1.4 }),
    ],
    angleTexts: [`${thetaDeg}°`, `${thetaDeg}°`, `${thetaDeg}°`, `${thetaDeg}°`],
    notes: [],
    noteTexts: [],
  };
}

function buildRollingInch(
  rise: number,
  roll: number,
  trueOffset: number,
  rollAngleDeg: number,
  thetaDeg: number,
  spacingDisplay: number,
  shrinkDisplay: number,
): InchDiagram | null {
  if (
    !isPositiveFinite(rise) ||
    !isPositiveFinite(roll) ||
    !isPositiveFinite(trueOffset) ||
    !Number.isFinite(rollAngleDeg)
  ) {
    return null;
  }
  const base = buildOffsetInch(trueOffset, thetaDeg, spacingDisplay, shrinkDisplay);
  if (!base) {
    return null;
  }
  const m: InchPt = { x: spacingDisplay / 2, y: trueOffset / 2 };
  base.notes.push(add(m, { x: 0, y: -3.4 }));
  base.noteTexts.push(
    `rise ${formatImperial(rise)} · roll ${formatImperial(roll)} · 真实偏移 ${formatImperial(trueOffset)}`,
  );
  base.notes.push(add(m, { x: 0, y: -4.8 }));
  base.noteTexts.push(`旋转角 ${rollAngleDeg.toFixed(1)}°`);
  return base;
}

function buildKicked90Inch(
  kickDeg: number,
  straightLength: number,
  totalGain: number,
): InchDiagram | null {
  if (!Number.isFinite(kickDeg) || kickDeg <= 0 || kickDeg >= 90) {
    return null;
  }
  if (!isPositiveFinite(straightLength) || !Number.isFinite(totalGain) || totalGain < 0) {
    return null;
  }
  const k = (kickDeg * Math.PI) / 180;
  const L = straightLength;
  const M1: InchPt = { x: 0, y: 0 };
  const M2: InchPt = { x: 0, y: L };
  const t1 = SCHEMATIC_BEND_R * Math.tan(Math.PI / 4);
  const t2 = Math.min(SCHEMATIC_BEND_R * Math.tan(k / 2), L * 0.22);
  const up: InchPt = { x: 0, y: 1 };
  const out: InchPt = { x: Math.sin(k), y: Math.cos(k) };
  const lead = Math.max(1.5, L * 0.12);
  const ext = 2.0;

  const path = new InchPath();
  path.moveTo({ x: -lead, y: 0 });
  path.bend(M1, { x: 1, y: 0 }, up, t1);
  path.lineTo({ x: 0, y: L - t2 });
  path.bend(M2, up, out, t2);
  path.lineTo(add(M2, scaleVec(out, t2 + ext)));

  return {
    path,
    marks: [
      { point: M1, label: 'M1', valueText: null, tickDir: { x: 0, y: 1 } },
      { point: M2, label: 'M2', valueText: null, tickDir: { x: 1, y: 0 } },
    ],
    dimensions: [offsetDim(M1, M2, formatImperial(L), 1)],
    angles: [
      add(M1, { x: -1.3, y: 1.1 }),
      add(M2, { x: 1.1, y: 0.7 }),
    ],
    angleTexts: ['90°', `${kickDeg}°`],
    notes: [add(M2, { x: 1.6, y: -1.6 })],
    noteTexts: [`总 gain ${formatImperial(totalGain)}`],
  };
}

// ---------- inch → SVG ----------

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function finalize(
  inch: InchDiagram,
  viewW: number,
  viewH: number,
): BendDiagram | null {
  const pts = inch.path.points();
  if (pts.length < 2) {
    return null;
  }
  const all: InchPt[] = [...pts];
  for (const mk of inch.marks) {
    all.push(mk.point);
  }
  for (const d of inch.dimensions) {
    all.push(d.from, d.to, d.labelAt);
  }
  all.push(...inch.angles, ...inch.notes);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of all) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      return null;
    }
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const padX = viewW * PAD_RATIO;
  const padY = viewH * PAD_RATIO;
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  // 横纵等比锁定（spec §4）
  const scale = Math.min((viewW - 2 * padX) / spanX, (viewH - 2 * padY) / spanY);
  if (!Number.isFinite(scale) || scale <= 0) {
    return null;
  }
  const offX = (viewW - spanX * scale) / 2;
  const offY = (viewH - spanY * scale) / 2;
  const toSvg = (p: InchPt): DiagramPoint => ({
    x: offX + (p.x - minX) * scale,
    y: offY + (maxY - p.y) * scale,
  });
  // inch 方向 → SVG 方向（y 翻转）
  const toSvgDir = (v: InchPt): DiagramPoint => {
    const n = norm(v);
    return { x: n.x, y: -n.y };
  };

  const d = pts
    .map((p, i) => {
      const s = toSvg(p);
      return `${i === 0 ? 'M' : 'L'}${round1(s.x)},${round1(s.y)}`;
    })
    .join(' ');

  return {
    width: viewW,
    height: viewH,
    conduitPath: d,
    marks: inch.marks.map((m) => ({
      point: toSvg(m.point),
      label: m.label,
      valueText: m.valueText,
      tickDir: toSvgDir(m.tickDir),
    })),
    dimensions: inch.dimensions.map((dim) => ({
      from: toSvg(dim.from),
      to: toSvg(dim.to),
      label: dim.label,
      labelAt: toSvg(dim.labelAt),
    })),
    angles: inch.angles.map((p, i) => ({ point: toSvg(p), text: inch.angleTexts[i] })),
    notes: inch.notes.map((p, i) => ({ point: toSvg(p), text: inch.noteTexts[i] })),
  };
}

// ---------- 公开 API ----------

/**
 * 构造标记图解。输入=引擎计算结果（各计算器 result 里的显示值），
 * 输出=SVG 坐标。非法输入返回 null（组件渲染空占位，不 crash）。
 */
export function buildBendDiagram(
  input: DiagramInput,
  viewW: number,
  viewH: number,
): BendDiagram | null {
  if (!input || !Number.isFinite(viewW) || !Number.isFinite(viewH)) {
    return null;
  }
  if (viewW < 120 || viewH < 80) {
    return null;
  }
  let inch: InchDiagram | null = null;
  switch (input.kind) {
    case 'offset':
      inch = buildOffsetInch(input.height, input.thetaDeg, input.spacingDisplay, input.shrinkDisplay);
      break;
    case 'stub':
      inch = buildStubInch(input.stubHeight, input.markPoint);
      break;
    case 'saddle3':
      inch = buildSaddle3Inch(input.height, input.sideSpacingDisplay);
      break;
    case 'saddle4':
      inch = buildSaddle4Inch(
        input.height,
        input.thetaDeg,
        input.legSpacingDisplay,
        input.flatWidth,
      );
      break;
    case 'rolling':
      inch = buildRollingInch(
        input.rise,
        input.roll,
        input.trueOffset,
        input.rollAngleDeg,
        input.thetaDeg,
        input.spacingDisplay,
        input.shrinkDisplay,
      );
      break;
    case 'kicked90':
      inch = buildKicked90Inch(input.kickAngleDeg, input.straightLength, input.totalGain);
      break;
    default:
      return null;
  }
  if (!inch) {
    return null;
  }
  return finalize(inch, viewW, viewH);
}
