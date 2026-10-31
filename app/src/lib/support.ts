// Apoio ao app: valores, estado salvo no aparelho e o pedido ocasional.
import type { DeviceState, Game } from '@league-alert/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { isActive } from './format';
import { icons, type IconName } from './icons';
import { followState } from './hooks';
import {
  initialSupportState,
  neverAskAgain,
  promptDismissed,
  promptShown,
  registerSession,
  shouldPrompt,
  supported,
  type SupportState,
} from './supportRules';

/** Valores de apoio (compra consumível: pode apoiar quantas vezes quiser). */
export const SUPPORT_TIERS: { sku: string; amount: number; icon: IconName }[] = [
  { sku: 'com.rafael.leaguealert.apoio.5', amount: 5, icon: icons.basketball },
  { sku: 'com.rafael.leaguealert.apoio.10', amount: 10, icon: icons.player },
  { sku: 'com.rafael.leaguealert.apoio.25', amount: 25, icon: icons.target },
  { sku: 'com.rafael.leaguealert.apoio.50', amount: 50, icon: icons.flame },
  { sku: 'com.rafael.leaguealert.apoio.100', amount: 100, icon: icons.starFill },
  { sku: 'com.rafael.leaguealert.apoio.200', amount: 200, icon: icons.trophy },
];
export const SUPPORT_SKUS = SUPPORT_TIERS.map((tier) => tier.sku);

// Estado em memória + AsyncStorage, compartilhado pelas telas.
const KEY = 'support:v1';
let state: SupportState | null = null;
let prompt: { visible: boolean; gameId: string | null } = { visible: false, gameId: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

let loading: Promise<SupportState> | null = null;
function load(): Promise<SupportState> {
  if (state) return Promise.resolve(state);
  loading ??= AsyncStorage.getItem(KEY)
    .then((raw) => (raw ? (JSON.parse(raw) as SupportState) : null))
    .catch(() => null)
    .then((saved) => {
      // Primeira abertura cria o estado; as seguintes contam como nova abertura.
      state = saved ? registerSession(saved, Date.now()) : initialSupportState(Date.now());
      void AsyncStorage.setItem(KEY, JSON.stringify(state));
      emit();
      return state;
    });
  return loading;
}

async function update(fn: (s: SupportState) => SupportState) {
  state = fn(await load());
  emit();
  await AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

/** Estado salvo (null enquanto carrega). */
export function useSupportState(): SupportState | null {
  return useSyncExternalStore(subscribe, () => state);
}

/** Conta as aberturas do app. Usar uma vez, no layout raiz. */
export function useSupportSessions() {
  useEffect(() => {
    void load();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void update((cur) => registerSession(cur, Date.now()));
    });
    return () => sub.remove();
  }, []);
}

export function useSupportPromptState() {
  return useSyncExternalStore(subscribe, () => prompt);
}

function setPrompt(next: typeof prompt) {
  prompt = next;
  emit();
}

export const supportActions = {
  /** Mostra o pedido agora, ignorando as regras (só para testar). */
  preview: () => setPrompt({ visible: true, gameId: null }),
  /** Pessoa abriu a tela de apoio pelo pedido: fecha o pedido sem contar como "Agora não". */
  accept: () => setPrompt({ visible: false, gameId: null }),
  dismiss: () => {
    setPrompt({ visible: false, gameId: null });
    void update(promptDismissed);
  },
  never: () => {
    setPrompt({ visible: false, gameId: null });
    void update(neverAskAgain);
  },
  supported: () => update((s) => supported(s, Date.now())),
};

/**
 * Na tela de jogos de hoje: pede apoio (raramente) quando um jogo acompanhado acabou.
 * Espera alguns segundos com a tela aberta para não aparecer logo de cara.
 */
export function useSupportPrompt(games: Game[] | undefined, device: DeviceState | undefined) {
  useFocusEffect(
    useCallback(() => {
      if (!games || !device) return;
      const timer = setTimeout(async () => {
        const s = await load();
        const followed = games.filter((g) => ['bell', 'favorite'].includes(followState(device, g)));
        const finished = followed.filter((g) => g.status === 'final' && !g.simulated);
        const ctx = {
          now: Date.now(),
          finishedGameId: finished.at(-1)?.id ?? null,
          followedGameLive: followed.some(isActive),
        };
        if (!prompt.visible && shouldPrompt(s, ctx)) {
          await update((cur) => promptShown(cur, ctx.now, ctx.finishedGameId));
          setPrompt({ visible: true, gameId: ctx.finishedGameId });
        }
      }, 4000);
      return () => clearTimeout(timer);
    }, [games, device]),
  );
}
