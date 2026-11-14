import assert from 'node:assert/strict';
import { test } from 'node:test';

import { translate } from '../i18n/dictionaries.ts';
import { getFeedbackScreenCopy } from './feedbackScreenCopy.ts';

test('getFeedbackScreenCopy：支持 en / zh / zh-tw / es，未知语言回退英文', () => {
  assert.equal(getFeedbackScreenCopy('en-US').title, 'Feedback');
  assert.equal(getFeedbackScreenCopy('zh-CN').title, '问题反馈');
  assert.equal(getFeedbackScreenCopy('zh-TW').title, '意見回饋');
  assert.equal(getFeedbackScreenCopy('es-MX').title, 'Comentarios');
  assert.equal(getFeedbackScreenCopy('pt-BR').title, 'Feedback');
});

test('getFeedbackScreenCopy：en / es 与 dictionaries.ts 严格一致且包含完整表单文案', () => {
  const enCopy = getFeedbackScreenCopy('en');
  assert.equal(enCopy.title, translate('en', 'feedback.title'));
  assert.equal(enCopy.categories.bug, translate('en', 'feedback.catBug'));
  assert.equal(enCopy.categories.formula, translate('en', 'feedback.catFormula'));
  assert.equal(enCopy.submitButton, translate('en', 'feedback.submitButton'));
  assert.equal(enCopy.doneButton, translate('en', 'feedback.doneButton'));

  const esCopy = getFeedbackScreenCopy('es');
  assert.equal(esCopy.title, translate('es', 'feedback.title'));
  assert.equal(esCopy.categories.bug, translate('es', 'feedback.catBug'));
  assert.equal(esCopy.categories.formula, translate('es', 'feedback.catFormula'));
  assert.equal(esCopy.submitButton, translate('es', 'feedback.submitButton'));
  assert.equal(esCopy.doneButton, translate('es', 'feedback.doneButton'));
});
