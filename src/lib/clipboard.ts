/**
 * 跨端复制到剪贴板（不引入新依赖）。
 *
 * - Web：优先 navigator.clipboard.writeText（HTTPS / localhost 可用），
 *   降级到隐藏 textarea + document.execCommand('copy')；
 * - Native：RN 内置 Clipboard（已 deprecated 但仍在核心，避免加库）；
 * - 任何异常吞掉，返回是否成功，绝不抛。
 */

import type { GrowthEvent, GrowthEventParams } from './growthEvents.ts';

export interface CopyToClipboardOptions {
  source?: string;
  toolName?: string;
  onEvent?: (name: GrowthEvent, params: GrowthEventParams) => void;
}

async function writeTextToClipboard(text: string): Promise<boolean> {
  // Web：异步 Clipboard API。
  try {
    const nav = typeof navigator === 'undefined' ? undefined : navigator;
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 继续走降级分支。
  }

  // Web：execCommand 降级（旧浏览器 / 非安全上下文）。
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) {
        return true;
      }
    }
  } catch {
    // 继续走 native 分支。
  }

  // Native：RN 内置 Clipboard。用 require 而非顶层 import，避免 web 端把
  // native 模块打进来，也避免 node 测试触发原生依赖。
  try {
    const rn = require('react-native') as {
      Clipboard?: { setString(value: string): void };
    };
    if (rn.Clipboard?.setString) {
      rn.Clipboard.setString(text);
      return true;
    }
  } catch {
    // 无可用通道。
  }

  return false;
}

export async function copyToClipboard(
  text: string,
  options?: CopyToClipboardOptions,
): Promise<boolean> {
  if (typeof text !== 'string' || text === '') {
    return false;
  }

  const ok = await writeTextToClipboard(text);
  if (ok) {
    const params: GrowthEventParams = {
      source: options?.source ?? 'clipboard',
      ...(options?.toolName ? { tool_name: options.toolName } : {}),
    };
    try {
      if (options?.onEvent) {
        options.onEvent('result_copied', params);
      } else {
        (require('./growth') as typeof import('./growth')).trackGrowthEvent('result_copied', params);
      }
    } catch {
      // 埋点不影响复制结果。
    }
  }
  return ok;
}
