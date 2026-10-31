import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import { HeaderButton } from '@/components/HeaderButton';
import { SupportPrompt } from '@/components/SupportPrompt';
import { useDevice } from '@/lib/hooks';
import { t } from '@/lib/i18n';
import { ensurePermission, useNotificationHandling } from '@/lib/notifications';
import { useSupportSessions } from '@/lib/support';
import { colors } from '@/lib/theme';
import { icons } from '@/lib/icons';

// Sem a loja configurada (emulador, Simulador fora do Xcode), o expo-iap avisa em vermelho.
// A tela de apoio já mostra "compras indisponíveis", então o aviso só atrapalha.
LogBox.ignoreLogs(['[Expo-IAP] Error fetching products']);

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
  useSupportSessions();
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
        <Stack.Screen
          name="apoiar"
          options={{
            title: t('support.title'),
            presentation: 'modal',
            // No Android já tem a seta de voltar no cabeçalho; o X é só do iPhone (modal).
            headerRight:
              Platform.OS === 'ios'
                ? () => <HeaderButton icon={icons.close} label={t('support.close')} onPress={() => router.back()} />
                : undefined,
          }}
        />
      </Stack>
      <SupportPrompt />
    </>
  );
}
