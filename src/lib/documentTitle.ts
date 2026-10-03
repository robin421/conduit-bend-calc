/**
 * Web 文档标题：静态 HTML 已写入 SEO 标题，但 React Navigation 会在运行时按
 * 当前聚焦 screen 的 title 覆盖 document.title（首页被改成 "BendCalc"）。
 * Web 端统一使用下面这个 SEO 标题，并由 NavigationContainer 关闭自动覆盖。
 *
 * SEO 工具页除外：它们的静态 shell 已经带各自的 <title>（由
 * src/seo/toolPages.ts 生成），运行时不得被首页标题覆盖。
 */

import { isSeoToolPath } from '../seo/toolPages.ts';

export const WEB_DOCUMENT_TITLE =
  'Conduit Bend Calc — Free Conduit Bending Calculator (Offset, Stub, Saddles)';

/**
 * 是否应该写入首页 SEO 标题。工具页返回 false，保留静态 shell 的页面级 title。
 * 纯函数，方便单测。
 */
export function shouldApplyWebDocumentTitle(pathname: string): boolean {
  return !isSeoToolPath(pathname);
}

/** 只依赖 title 属性，方便在 Node 单测里用假对象替换 document。 */
export interface DocumentTitleTarget {
  title: string;
}

/**
 * 仅在 Web 端写入标题；Native 端不做任何事。
 * 返回是否实际写入，便于测试与调用方判断。
 */
export function applyWebDocumentTitle(
  isWeb: boolean,
  target: DocumentTitleTarget | undefined,
  title: string = WEB_DOCUMENT_TITLE,
): boolean {
  if (!isWeb || target === undefined) {
    return false;
  }
  target.title = title;
  return true;
}
