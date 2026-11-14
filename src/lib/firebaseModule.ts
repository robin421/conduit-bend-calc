/** Crashlytics 在模块加载时就访问默认 App；必须在 require SDK 之前检查配置。 */
export function loadConfiguredFirebaseModule<T>(
  getApps: () => readonly { name: string }[],
  loadModule: () => T,
): T | null {
  try {
    if (!getApps().some((app) => app.name === '[DEFAULT]')) return null;
    return loadModule();
  } catch { return null; }
}
