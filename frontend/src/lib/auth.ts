/** Auth session persistence — SecureStore on native, localStorage on web. */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type Session = {
  userId: number;
  name: string;
  email: string;
};

const SESSION_KEY = 'huskymatch.session';

const webStore = (globalThis as { localStorage?: WebStore }).localStorage;

type WebStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    webStore?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webStore?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    webStore?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveSession(session: Session): Promise<void> {
  await setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<Session | null> {
  const raw = await getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await removeItem(SESSION_KEY);
}
