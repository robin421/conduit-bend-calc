import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPendingProTaskStore } from './pendingProTaskStore';

const store = createPendingProTaskStore(AsyncStorage);
export const loadPendingProTask = store.load;
export const beginPendingProTask = store.begin;
export const clearPendingProTask = store.clearIfCurrent;
