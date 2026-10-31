import type {
  AlertPrefs,
  DeviceSettings,
  DeviceState,
  GameDetail,
  GamesResponse,
  RegisterDeviceBody,
  Team,
} from '@league-alert/shared';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Endereço do servidor. EXPO_PUBLIC_API_URL tem prioridade (ex.: servidor hospedado).
 * Sem ela, usa o mesmo computador que serve o app em desenvolvimento (o Metro), na porta 3000:
 * funciona no Simulador, no emulador Android e num celular na mesma rede Wi-Fi.
 */
function devServerUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:3000`;
  // No emulador Android, o Mac é 10.0.2.2 (localhost é o próprio emulador).
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? devServerUrl();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  games: (date?: string) => request<GamesResponse>(`/games${date ? `?date=${date}` : ''}`),
  game: (id: string) => request<GameDetail>(`/games/${id}`),
  teams: () => request<Team[]>('/teams'),
  register: (body: RegisterDeviceBody) => request<DeviceState>('/devices', json('POST', body)),
  setFavorites: (id: string, teamIds: string[]) =>
    request<DeviceState>(`/devices/${id}/favorites`, json('PUT', { teamIds })),
  setGame: (id: string, gameId: string, on: boolean) =>
    request<DeviceState>(`/devices/${id}/games/${gameId}`, json(on ? 'PUT' : 'DELETE')),
  setMuted: (id: string, gameId: string, muted: boolean) =>
    request<DeviceState>(`/devices/${id}/mutes/${gameId}`, json(muted ? 'PUT' : 'DELETE')),
  setPrefs: (id: string, prefs: Partial<AlertPrefs>) =>
    request<DeviceState>(`/devices/${id}/prefs`, json('PUT', { prefs })),
  setSettings: (id: string, settings: Partial<DeviceSettings>) =>
    request<DeviceState>(`/devices/${id}/settings`, json('PUT', { settings })),
  testPush: (deviceId: string) => request<{ sentTo: number }>('/dev/test-push', json('POST', { deviceId })),
  simulate: () => request<{ gameId: string; matchup: string }>('/dev/simulate', json('POST', {})),
};
