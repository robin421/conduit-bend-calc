/**
 * Pin Android NDK r28 so native .so builds default to 16 KB ELF page alignment.
 * expo-build-properties does not expose ndkVersion; ExpoRootProjectPlugin uses
 * setIfNotExist("ndkVersion"), so setting ext.ndkVersion before it applies wins.
 * See https://developer.android.com/guide/practices/page-sizes
 */
const { withProjectBuildGradle } = require('expo/config-plugins');

const NDK_VERSION = '28.2.13676358';
const MARKER = `ext.ndkVersion = "${NDK_VERSION}"`;

function withNdkR28(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }
    let contents = config.modResults.contents;
    if (contents.includes(MARKER)) {
      return config;
    }
    // Replace any prior pin, then inject before expo-root-project.
    contents = contents.replace(/\next\.ndkVersion\s*=\s*"[^"]+"\n?/g, '\n');
    if (contents.includes('apply plugin: "expo-root-project"')) {
      contents = contents.replace(
        'apply plugin: "expo-root-project"',
        `${MARKER}\n\napply plugin: "expo-root-project"`,
      );
    } else {
      contents = `${MARKER}\n\n${contents}`;
    }
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withNdkR28;
