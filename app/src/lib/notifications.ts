import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Mostra a notificação mesmo com o app aberto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
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
    const received = Notifications.addNotificationReceivedListener(() => {
      qc.invalidateQueries({ queryKey: ['games'] });
      qc.invalidateQueries({ queryKey: ['game'] });
    });
    return () => {
      tap.remove();
      received.remove();
    };
  }, [qc]);
}
