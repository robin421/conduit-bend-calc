/**
 * 底部 "Calculate" tab 重置逻辑。
 *
 * CalcHome tab 内嵌一个 native stack。native-stack 在 tab 被按下时会用
 * requestAnimationFrame 异步 popToTop；这个延迟与在途导航会产生竞态，
 * 偶发出现 "tab 已激活但内容还停在 Advanced Calibration"。
 *
 * 这里在 tabPress 时用嵌套导航参数同步地把 stack 导航回 CalcHome：
 * - 同步执行，不依赖下一帧的状态；
 * - preventDefault，让 native-stack 的内部异步处理跳过，避免重复。
 *
 * 不 import react-native，便于 Node 单测。
 */

export interface CalcTabNavigation {
  navigate: (name: string, params?: { screen: string }) => void;
}

export interface TabPressEventLike {
  defaultPrevented: boolean;
  preventDefault: () => void;
}

export const CALC_HOME_ROUTE = 'CalcHome';

export function handleCalcTabPress(
  navigation: CalcTabNavigation,
  event?: TabPressEventLike,
): void {
  event?.preventDefault();
  navigation.navigate(CALC_HOME_ROUTE, { screen: CALC_HOME_ROUTE });
}
