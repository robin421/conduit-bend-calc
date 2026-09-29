import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CALC_HOME_ROUTE,
  handleCalcTabPress,
  type CalcTabNavigation,
  type TabPressEventLike,
} from './calcTabReset.ts';

function createNavigation() {
  const calls: Array<{ name: string; params?: { screen: string } }> = [];
  const navigation: CalcTabNavigation = {
    navigate: (name, params) => {
      calls.push({ name, params });
    },
  };
  return { navigation, calls };
}

function createEvent() {
  const event: TabPressEventLike = {
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  return event;
}

test('handleCalcTabPress: 同步把嵌套 stack 导航回 CalcHome', () => {
  const { navigation, calls } = createNavigation();
  handleCalcTabPress(navigation, createEvent());

  assert.deepEqual(calls, [
    { name: CALC_HOME_ROUTE, params: { screen: CALC_HOME_ROUTE } },
  ]);
});

test('handleCalcTabPress: preventDefault，避免 native-stack 异步重复处理', () => {
  const { navigation } = createNavigation();
  const event = createEvent();

  handleCalcTabPress(navigation, event);

  assert.equal(event.defaultPrevented, true);
});

test('handleCalcTabPress: 无事件（可选参数）时不抛异常', () => {
  const { navigation, calls } = createNavigation();
  assert.doesNotThrow(() => handleCalcTabPress(navigation));
  assert.equal(calls.length, 1);
});
