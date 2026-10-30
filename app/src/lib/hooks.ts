import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AlertPrefs, DeviceSettings, DeviceState, Game } from '@league-alert/shared';
import { api } from './api';
import { getDeviceId, platform } from './device';
import { lang, region } from './i18n';

const ACTIVE = new Set(['live', 'halftime', 'end_period']);

function refreshInterval(games: Game[] | undefined): number {
  if (!games) return 30_000;
  const soon = games.some(
    (g) => ACTIVE.has(g.status) || (g.status === 'scheduled' && Date.parse(g.startTime) - Date.now() < 30 * 60_000),
  );
  return soon ? 10_000 : 60_000;
}

export function useGames(date: string | null) {
  return useQuery({
    queryKey: ['games', date ?? 'today'],
    queryFn: () => api.games(date ?? undefined),
    refetchInterval: (q) => refreshInterval(q.state.data?.games),
  });
}

export function useGame(id: string) {
  return useQuery({
    queryKey: ['game', id],
    queryFn: () => api.game(id),
    refetchInterval: (q) => (q.state.data && !ACTIVE.has(q.state.data.game.status) ? 60_000 : 10_000),
  });
}

export function useTeams() {
  return useQuery({ queryKey: ['teams'], queryFn: api.teams, staleTime: Infinity });
}

/** Registra o aparelho no servidor (idempotente) e devolve favoritos, sinos e preferências. */
export function useDevice() {
  return useQuery({
    queryKey: ['device'],
    queryFn: async () => api.register({ deviceId: await getDeviceId(), platform, pushToken: null, lang, region }),
    staleTime: Infinity,
    retry: true,
    retryDelay: 3000,
  });
}

/** Mutação com atualização otimista do estado do aparelho. */
function useDeviceMutation<V>(
  fn: (device: DeviceState, vars: V) => Promise<DeviceState>,
  optimistic: (device: DeviceState, vars: V) => DeviceState,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: V) => {
      const device = qc.getQueryData<DeviceState>(['device']);
      if (!device) throw new Error('Device not registered yet');
      return fn(device, vars);
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['device'] });
      const before = qc.getQueryData<DeviceState>(['device']);
      if (before) qc.setQueryData(['device'], optimistic(before, vars));
      return { before };
    },
    onError: (_e, _v, ctx) => ctx?.before && qc.setQueryData(['device'], ctx.before),
    onSuccess: (device) => qc.setQueryData(['device'], device),
  });
}

export function useToggleGame() {
  return useDeviceMutation<{ gameId: string; on: boolean }>(
    (d, v) => api.setGame(d.deviceId, v.gameId, v.on),
    (d, v) => ({ ...d, games: v.on ? [...d.games, v.gameId] : d.games.filter((g) => g !== v.gameId) }),
  );
}

export function useToggleFavorite() {
  return useDeviceMutation<{ teamId: string; on: boolean }>(
    (d, v) => api.setFavorites(d.deviceId, toggled(d.favorites, v.teamId, v.on)),
    (d, v) => ({ ...d, favorites: toggled(d.favorites, v.teamId, v.on) }),
  );
}

export function useSetPrefs() {
  return useDeviceMutation<Partial<AlertPrefs>>(
    (d, prefs) => api.setPrefs(d.deviceId, prefs),
    (d, prefs) => ({ ...d, prefs: { ...d.prefs, ...prefs } }),
  );
}

export function useSetSettings() {
  return useDeviceMutation<Partial<DeviceSettings>>(
    (d, settings) => api.setSettings(d.deviceId, settings),
    (d, settings) => ({ ...d, settings: { ...d.settings, ...settings } }),
  );
}

function toggled(list: string[], id: string, on: boolean): string[] {
  const rest = list.filter((x) => x !== id);
  return on ? [...rest, id] : rest;
}

/** Como o aparelho acompanha esse jogo: pelo sino, por time favorito, ou não acompanha. */
export function followState(device: DeviceState | undefined, game: Game): 'bell' | 'favorite' | 'none' {
  if (!device) return 'none';
  if (device.favorites.includes(game.home.id) || device.favorites.includes(game.away.id)) return 'favorite';
  if (device.games.includes(game.id)) return 'bell';
  return 'none';
}
