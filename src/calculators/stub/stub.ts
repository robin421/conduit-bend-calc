export interface StubResult {
  /** 标记点位置（英寸） = 目标高度 − take-up */
  markPoint: number;
  /** 本次计算使用的 take-up（英寸） */
  takeUp: number;
}

/**
 * 90° Stub 弯管计算。stubHeight 为目标高度（英寸），takeUp 为弯管器 take-up（英寸）。
 * 非法输入（非有限数、<= 0）或 take-up 不小于目标高度（标记点非正）返回 null，不抛异常。
 */
export function calculateStub(
  stubHeight: number,
  takeUp: number,
): StubResult | null {
  if (!Number.isFinite(stubHeight) || stubHeight <= 0) {
    return null;
  }
  if (!Number.isFinite(takeUp) || takeUp <= 0) {
    return null;
  }

  const markPoint = stubHeight - takeUp;
  if (markPoint <= 0) {
    return null;
  }

  return { markPoint, takeUp };
}
