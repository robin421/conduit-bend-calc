import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { GOOGLE_PLAY_URL } from './homeContent.ts';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url).href);
const packageName = 'com.robin421.conduitbendcalc';

test('Android 构建身份与已有 Play 应用和商店入口一致', () => {
  const app = JSON.parse(readFileSync(join(projectRoot, 'app.json'), 'utf8'));
  assert.equal(app.expo.android.package, packageName);
  assert.equal(new URL(GOOGLE_PLAY_URL).searchParams.get('id'), packageName);
});

test('构建注入拒绝错误包名和 Firebase 客户端，失败时不保留配置', () => {
  const folder = mkdtempSync(join(tmpdir(), 'wattflow-identity-'));
  const script = join(projectRoot, 'scripts/write-google-services.sh');
  try {
    const run = (appPackage: string, firebasePackage: string) => {
      writeFileSync(join(folder, 'app.json'), JSON.stringify({ expo: { android: { package: appPackage } } }));
      const services = { client: [{ client_info: { android_client_info: { package_name: firebasePackage } } }] };
      return spawnSync('bash', [script], { cwd: folder, encoding: 'utf8', env: {
        ...process.env, GOOGLE_SERVICES_JSON_B64: Buffer.from(JSON.stringify(services)).toString('base64'),
      } });
    };
    assert.notEqual(run(packageName, 'com.kaipu.conduitbendcalc').status, 0);
    assert.equal(existsSync(join(folder, 'google-services.json')), false);
    assert.notEqual(run('com.kaipu.conduitbendcalc', 'com.kaipu.conduitbendcalc').status, 0);
    assert.equal(existsSync(join(folder, 'google-services.json')), false);
    assert.equal(run(packageName, packageName).status, 0);
    assert.equal(existsSync(join(folder, 'google-services.json')), true);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});
