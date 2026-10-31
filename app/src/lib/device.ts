import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform as RNPlatform } from 'react-native';
import type { Platform } from '@league-alert/shared';

const KEY = 'deviceId';

/** Id fixo deste aparelho, criado na primeira abertura do app. */
export async function getDeviceId(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved) return saved;
  } catch {}
  const id = Crypto.randomUUID();
  try {
    await AsyncStorage.setItem(KEY, id);
  } catch {}
  return id;
}

export const platform: Platform = RNPlatform.OS === 'android' ? 'android' : Device.isDevice ? 'ios' : 'simulator';
