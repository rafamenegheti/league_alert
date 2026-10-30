import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useDevice } from '@/lib/hooks';
import { t } from '@/lib/i18n';
import { ensurePermission, useNotificationHandling } from '@/lib/notifications';
import { colors } from '@/lib/theme';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

function App() {
  useDevice(); // registra o aparelho no servidor
  useNotificationHandling();
  useEffect(() => {
    ensurePermission();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="jogo/[id]" options={{ title: '', headerBackTitle: t('tab.games') }} />
      </Stack>
    </>
  );
}
