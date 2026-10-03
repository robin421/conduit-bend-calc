// 必须先于 App：web 端为 Metro 的 `import()` 安装 global.__loadBundleAsync。
// Native 端是 no-op（见 src/lib/webRuntime.ts），chunk 分割只在 web 使用。
import './src/lib/webRuntime';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
