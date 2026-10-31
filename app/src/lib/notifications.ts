import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { t } from './i18n';

/** Canal do Android usado pelo servidor (mesmo id de server/src/notifier/fcm.ts). */
const ANDROID_CHANNEL_ID = 'alerts';

// Mostra a notificação mesmo com o app aberto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** No Android, cria o canal com prioridade alta (aparece como banner). Antes de pedir permissão. */
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: t('notifications.channel'),
    importance: AndroidImportance.HIGH, // som e vibração padrão do sistema
  });
}

/**
 * Token de push do Firebase (só Android). Nulo se o app foi compilado sem o
 * google-services.json, e aí o servidor não consegue mandar push para este aparelho.
 */
export async function getPushToken(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    return (await Notifications.getDevicePushTokenAsync()).data as string;
  } catch (e) {
    console.log('[push] sem token do Firebase (falta o google-services.json?):', (e as Error).message);
    return null;
  }
}

export async function ensurePermission(): Promise<boolean> {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** O id do jogo pode vir em lugares diferentes, dependendo de como o push foi montado. */
function gameIdFrom(n: Notifications.Notification): string | undefined {
  const data = n.request.content.data as any;
  const payload = (n.request.trigger as any)?.payload;
  const id = data?.gameId ?? data?.body?.gameId ?? payload?.gameId ?? payload?.body?.gameId;
  return typeof id === 'string' && id !== 'test' ? id : undefined;
}

/** Ao tocar numa notificação, abre o jogo. Ao receber uma, atualiza os placares. */
export function useNotificationHandling() {
  const qc = useQueryClient();
  useEffect(() => {
    const open = (n: Notifications.Notification) => {
      const id = gameIdFrom(n);
      if (id) router.push({ pathname: '/jogo/[id]', params: { id } });
    };

    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) {
      open(last.notification);
      Notifications.clearLastNotificationResponse();
    }

    const tap = Notifications.addNotificationResponseReceivedListener((r) => {
      open(r.notification);
      Notifications.clearLastNotificationResponse();
    });
    // O Firebase pode trocar o token; registra de novo para o servidor saber.
    const token = Notifications.addPushTokenListener(() => qc.invalidateQueries({ queryKey: ['device'] }));
    const received = Notifications.addNotificationReceivedListener(() => {
      qc.invalidateQueries({ queryKey: ['games'] });
      qc.invalidateQueries({ queryKey: ['game'] });
    });
    return () => {
      tap.remove();
      token.remove();
      received.remove();
    };
  }, [qc]);
}
