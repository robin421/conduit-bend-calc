export type ProAction = 'buy' | 'restore' | 'retry' | 'continue';

/** 商店请求可能比授权回调更晚结束；查询和继续任务不能被它一起锁住。 */
export function createProActionGuard() {
  const active = new Set<ProAction>();
  let continued = false;
  return {
    begin(action: ProAction): boolean {
      if (active.has(action) || (action === 'continue' && continued)) return false;
      if ((action === 'buy' || action === 'restore') && active.size > 0) return false;
      if (action === 'retry' && active.has('continue')) return false;
      active.add(action);
      if (action === 'continue') continued = true;
      return true;
    },
    end(action: ProAction, failed = false): void {
      active.delete(action);
      if (action === 'continue' && failed) continued = false;
    },
    snapshot(): ReadonlySet<ProAction> { return new Set(active); },
  };
}
