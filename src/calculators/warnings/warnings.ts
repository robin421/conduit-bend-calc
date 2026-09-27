import { RADIANS_PER_DEGREE } from '../../constants.ts';
import type { BenderSpec, OffsetAngle } from '../../constants.ts';
import { layoutChain, validateLayout } from '../geometry/geometry.ts';
import type { LayoutWarning } from '../geometry/geometry.ts';

export type { LayoutWarning };

interface BendNodeInput {
  thetaDeg: number;
  vertexDistanceToNext?: number;
}

function layoutWarnings(
  bends: readonly BendNodeInput[],
  spec: BenderSpec,
  stubHeightInches?: number,
): LayoutWarning[] {
  const layout = layoutChain(bends, spec.centerlineRadius);
  return validateLayout({
    straights: layout?.straights ?? [],
    spec,
    stubHeightInches: stubHeightInches ?? null,
  });
}

/**
 * Offset / Rolling Offset 预警：两弯 θ，顶点距为 H·cscθ（trade 习惯值）。
 * 任一直段 < 0 → 红色「这个弯做不出来」；R 过小 → NEC 提示。
 */
export function offsetWarnings(
  vertexSpacingInches: number,
  angle: OffsetAngle,
  spec: BenderSpec,
): LayoutWarning[] {
  return layoutWarnings(
    [
      { thetaDeg: angle, vertexDistanceToNext: vertexSpacingInches },
      { thetaDeg: angle },
    ],
    spec,
  );
}

/**
 * 3-point saddle 预警：两侧弯 θ、中心弯 2θ，顶点距为中心↔两侧间距。
 */
export function threePointSaddleWarnings(
  centerToSideInches: number,
  angle: OffsetAngle,
  spec: BenderSpec,
): LayoutWarning[] {
  return layoutWarnings(
    [
      { thetaDeg: angle, vertexDistanceToNext: centerToSideInches },
      { thetaDeg: angle * 2, vertexDistanceToNext: centerToSideInches },
      { thetaDeg: angle },
    ],
    spec,
  );
}

/**
 * 4-point saddle 预警：四弯均为 θ，顶点距依次为 leg、width、leg。
 */
export function fourPointSaddleWarnings(
  legInches: number,
  widthInches: number,
  angle: OffsetAngle,
  spec: BenderSpec,
): LayoutWarning[] {
  return layoutWarnings(
    [
      { thetaDeg: angle, vertexDistanceToNext: legInches },
      { thetaDeg: angle, vertexDistanceToNext: widthInches },
      { thetaDeg: angle, vertexDistanceToNext: legInches },
      { thetaDeg: angle },
    ],
    spec,
  );
}

/**
 * Stub 预警：单弯无直段，只做 min stub（查表，有依据的才预警）
 * 与 NEC 半径提示。
 */
export function stubWarnings(
  stubHeightInches: number,
  spec: BenderSpec,
): LayoutWarning[] {
  return validateLayout({ straights: [], spec, stubHeightInches });
}

/**
 * Kicked 90° 预警：90° + κ，顶点距 = L + R·tan45° + R·tan(κ/2)，
 * 其中 L 为切点到切点直段。
 */
export function kicked90Warnings(
  kickAngleDeg: number,
  straightLengthInches: number,
  spec: BenderSpec,
): LayoutWarning[] {
  const r = spec.centerlineRadius;
  const vertexDistanceToNext =
    straightLengthInches +
    r * Math.tan(Math.PI / 4) +
    r * Math.tan((kickAngleDeg * RADIANS_PER_DEGREE) / 2);
  return layoutWarnings(
    [
      { thetaDeg: 90, vertexDistanceToNext },
      { thetaDeg: kickAngleDeg },
    ],
    spec,
  );
}
