import type {
  AlertPrefs,
  DeviceSettings,
  DeviceState,
  GameDetail,
  GamesResponse,
  RegisterDeviceBody,
  Team,
} from '@league-alert/shared';

// No Simulador, localhost é o próprio Mac. No iPhone, use o IP do Mac na rede (EXPO_PUBLIC_API_URL).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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
  setPrefs: (id: string, prefs: Partial<AlertPrefs>) =>
    request<DeviceState>(`/devices/${id}/prefs`, json('PUT', { prefs })),
  setSettings: (id: string, settings: Partial<DeviceSettings>) =>
    request<DeviceState>(`/devices/${id}/settings`, json('PUT', { settings })),
  testPush: (deviceId: string) => request<{ sentTo: number }>('/dev/test-push', json('POST', { deviceId })),
  simulate: () => request<{ gameId: string; matchup: string }>('/dev/simulate', json('POST', {})),
};
