// 必须先于 App：web 端为 Metro 的 `import()` 安装 global.__loadBundleAsync。
// Native 端是 no-op（见 src/lib/webRuntime.ts），chunk 分割只在 web 使用。
import './src/lib/webRuntime';
// 首屏语言：URL ?lang= > localStorage > 默认英语；web 端同时改写 head 的
// title/description/canonical/hreflang（见 src/i18n/store.ts）。
import { initI18n } from './src/i18n';
import { registerRootComponent } from 'expo';

import App from './App';

initI18n();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
