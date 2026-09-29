import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  NO_PREVIOUS_PURCHASE_MESSAGE,
  PRO_ENTITLEMENT_STORAGE_KEY,
  PRO_SKU,
  SKU_UNAVAILABLE_MESSAGE,
  extractPurchaseErrorCode,
  parseProEntitlement,
  purchaseErrorMessage,
  resolveProAccess,
  serializeProEntitlement,
} from './iap.ts';

test('PRO_SKU 与存储 key 为约定常量', () => {
  assert.equal(PRO_SKU, 'cbc_pro_lifetime');
  assert.equal(PRO_ENTITLEMENT_STORAGE_KEY, '@cbc:pro-entitlement-v1');
});

test('resolveProAccess: SKU 可用且未购买 → locked', () => {
  assert.equal(resolveProAccess('available', false), 'locked');
});

test('resolveProAccess: 已购买 → 无论 SKU 状态都 unlocked', () => {
  assert.equal(resolveProAccess('available', true), 'unlocked');
  assert.equal(resolveProAccess('unavailable', true), 'unlocked');
  assert.equal(resolveProAccess('unknown', true), 'unlocked');
});

test('resolveProAccess: SKU 不可用（商品未建/已下架）→ 保持 locked', () => {
  assert.equal(resolveProAccess('unavailable', false), 'locked');
});

test('resolveProAccess: SKU 未知（离线/异常/超时）→ fail-closed 保持 locked', () => {
  assert.equal(resolveProAccess('unknown', false), 'locked');
});

test('parseProEntitlement: 空值/损坏数据安全回退 purchased=false', () => {
  assert.deepEqual(parseProEntitlement(null), { purchased: false });
  assert.deepEqual(parseProEntitlement(''), { purchased: false });
  assert.deepEqual(parseProEntitlement('not json{'), { purchased: false });
  assert.deepEqual(parseProEntitlement('[]'), { purchased: false });
  assert.deepEqual(parseProEntitlement('{"purchased":"yes"}'), { purchased: false });
  assert.deepEqual(parseProEntitlement('{"foo":1}'), { purchased: false });
  assert.deepEqual(parseProEntitlement('42'), { purchased: false });
});

test('parseProEntitlement: 合法数据原样解析', () => {
  assert.deepEqual(parseProEntitlement('{"purchased":true}'), { purchased: true });
  assert.deepEqual(parseProEntitlement('{"purchased":false}'), { purchased: false });
});

test('serializeProEntitlement: 往返一致', () => {
  assert.deepEqual(parseProEntitlement(serializeProEntitlement({ purchased: true })), {
    purchased: true,
  });
  assert.deepEqual(parseProEntitlement(serializeProEntitlement({ purchased: false })), {
    purchased: false,
  });
});

test('purchaseErrorMessage: 取消 → "Purchase cancelled."', () => {
  assert.equal(purchaseErrorMessage('E_USER_CANCELLED'), 'Purchase cancelled.');
});

test('purchaseErrorMessage: 网络类错误 → 网络文案', () => {
  const expected = 'Network unavailable. Your previous purchase status is kept.';
  for (const code of [
    'E_NETWORK_ERROR',
    'E_REMOTE_ERROR',
    'E_SERVICE_ERROR',
    'E_IAP_NOT_AVAILABLE',
    'E_NOT_PREPARED',
  ]) {
    assert.equal(purchaseErrorMessage(code), expected, code);
  }
});

test('purchaseErrorMessage: 延期支付 → pending 文案', () => {
  assert.equal(
    purchaseErrorMessage('E_DEFERRED_PAYMENT'),
    'Payment pending. Pro will unlock automatically once it completes.',
  );
});

test('purchaseErrorMessage: 其它/未知错误 → 通用失败文案', () => {
  const expected = 'Purchase failed. Please try again.';
  assert.equal(purchaseErrorMessage('E_UNKNOWN'), expected);
  assert.equal(purchaseErrorMessage('E_DEVELOPER_ERROR'), expected);
  assert.equal(purchaseErrorMessage(undefined), expected);
  assert.equal(purchaseErrorMessage('E_WHATEVER_NEW'), expected);
});

test('NO_PREVIOUS_PURCHASE_MESSAGE 文案', () => {
  assert.equal(NO_PREVIOUS_PURCHASE_MESSAGE, 'No previous purchase found.');
});

test('SKU_UNAVAILABLE_MESSAGE 文案', () => {
  assert.equal(
    SKU_UNAVAILABLE_MESSAGE,
    'Purchase temporarily unavailable. Please check your connection and try again.',
  );
});

test('extractPurchaseErrorCode: 从未知错误中提取 code', () => {
  assert.equal(extractPurchaseErrorCode({ code: 'E_USER_CANCELLED' }), 'E_USER_CANCELLED');
  assert.equal(extractPurchaseErrorCode({ code: '' }), undefined);
  assert.equal(extractPurchaseErrorCode({}), undefined);
  assert.equal(extractPurchaseErrorCode(null), undefined);
  assert.equal(extractPurchaseErrorCode('E_USER_CANCELLED'), undefined);
});
