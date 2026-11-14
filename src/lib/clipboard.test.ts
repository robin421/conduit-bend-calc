import assert from 'node:assert/strict';
import { test } from 'node:test';

import { copyToClipboard } from './clipboard.ts';

test('copyToClipboard：空字符串返回 false 且不触发 result_copied', async () => {
  const events: Array<{ name: string; params: Record<string, unknown> }> = [];
  const ok = await copyToClipboard('', {
    source: 'seo_tool',
    toolName: 'offset',
    onEvent: (name, params) => { events.push({ name, params: { ...params } }); },
  });
  assert.equal(ok, false);
  assert.deepEqual(events, []);
});

test('copyToClipboard：复制成功时触发 result_copied 携带 source 与 tool_name', async () => {
  const events: Array<{ name: string; params: Record<string, unknown> }> = [];
  let copied = '';
  const prevDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: async (text: string) => {
          copied = text;
        },
      },
    },
  });

  try {
    const ok = await copyToClipboard('Offset 6" at 30 deg', {
      source: 'seo_tool',
      toolName: 'offset',
      onEvent: (name, params) => { events.push({ name, params: { ...params } }); },
    });
    assert.equal(ok, true);
    assert.equal(copied, 'Offset 6" at 30 deg');
    assert.deepEqual(events, [
      { name: 'result_copied', params: { source: 'seo_tool', tool_name: 'offset' } },
    ]);
  } finally {
    if (prevDescriptor) {
      Object.defineProperty(globalThis, 'navigator', prevDescriptor);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
  }
});
