/** 历史读取可能较慢；页面失焦后不得再弹出系统分享。 */
export async function exportHistoryWhenActive(options: {
  isUnlocked(): boolean;
  isActive(): boolean;
  readText(): Promise<string>;
  share(text: string): Promise<void>;
}): Promise<boolean> {
  if (!options.isUnlocked()) throw new Error('Unlock Pro to export recent bends.');
  const text = await options.readText();
  if (!options.isActive()) return false;
  if (!options.isUnlocked()) throw new Error('Your Pro purchase is not complete yet.');
  if (!text) throw new Error('No recent bends to export. Run a calculation first.');
  await options.share(text);
  return true;
}
