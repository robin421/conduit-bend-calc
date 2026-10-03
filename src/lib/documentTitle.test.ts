import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyWebDocumentTitle,
  shouldApplyWebDocumentTitle,
  WEB_DOCUMENT_TITLE,
} from './documentTitle.ts';

test('WEB_DOCUMENT_TITLE: 使用约定的 SEO 标题，不再是 "BendCalc"', () => {
  assert.equal(
    WEB_DOCUMENT_TITLE,
    'Conduit Bend Calc — Free Conduit Bending Calculator (Offset, Stub, Saddles)',
  );
  assert.notEqual(WEB_DOCUMENT_TITLE, 'BendCalc');
});

test('applyWebDocumentTitle: Web 端写入 document.title', () => {
  const doc = { title: 'BendCalc' };
  assert.equal(applyWebDocumentTitle(true, doc), true);
  assert.equal(doc.title, WEB_DOCUMENT_TITLE);
});

test('applyWebDocumentTitle: Native 端与缺失 document 不写入', () => {
  const doc = { title: 'BendCalc' };
  assert.equal(applyWebDocumentTitle(false, doc), false);
  assert.equal(doc.title, 'BendCalc');

  assert.equal(applyWebDocumentTitle(true, undefined), false);
});

test('applyWebDocumentTitle: 允许覆盖标题', () => {
  const doc = { title: 'BendCalc' };
  assert.equal(applyWebDocumentTitle(true, doc, 'Custom Title'), true);
  assert.equal(doc.title, 'Custom Title');
});

test('shouldApplyWebDocumentTitle: 首页/App 路由写标题，SEO 工具页不写', () => {
  assert.equal(shouldApplyWebDocumentTitle('/'), true);
  assert.equal(shouldApplyWebDocumentTitle('/reference'), true);
  assert.equal(shouldApplyWebDocumentTitle('/offset'), false);
  assert.equal(shouldApplyWebDocumentTitle('/offset/'), false);
  assert.equal(shouldApplyWebDocumentTitle('/4-point-saddle'), false);
  assert.equal(shouldApplyWebDocumentTitle('/shrink'), false);
  assert.equal(shouldApplyWebDocumentTitle('/stub-up'), false);
});
