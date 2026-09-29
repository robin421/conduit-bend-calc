/**
 * BenderPicker 手动创建 Custom 规格的门控判定（纯函数，可被 node --test 直接 import）。
 *
 * Free = 通用计算；手动输入 R / take-up 创建 "My Tool" 属 Pro。已存在的
 * custom 列表保持可见可用（老用户迁移数据不断连），只 gate "创建"。
 */
import type { ProAccess } from '../lib/iap.ts';

export type CustomCreateMode = 'form' | 'locked' | 'hidden';

/**
 * - unlocked：显示创建表单；
 * - locked 且有 onUnlockPro 回调：显示锁定 upsell；
 * - locked 且无回调：直接隐藏创建区。
 */
export function resolveCustomCreateMode(
  access: ProAccess,
  hasUnlockHandler: boolean,
): CustomCreateMode {
  if (access === 'unlocked') {
    return 'form';
  }
  return hasUnlockHandler ? 'locked' : 'hidden';
}
