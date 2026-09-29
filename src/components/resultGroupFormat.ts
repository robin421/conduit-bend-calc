/**
 * ResultGroup 行（rows）的 value / unit 排版辅助（纯函数，便于 node --test）。
 *
 * 行与 hero 区保持一致：数值与单位之间有一个空格（如 "37.5 mm"），
 * 而不是连写成 "37.5mm"。空单位返回空串。
 */
export function formatResultUnit(unit?: string): string {
  return unit ? ` ${unit}` : '';
}
