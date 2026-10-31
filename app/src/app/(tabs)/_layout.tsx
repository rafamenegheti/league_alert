import { Image } from 'expo-image';
import { router, Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import { HeaderButton } from '@/components/HeaderButton';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';
import { icons } from '@/lib/icons';

const logo = require('../../../assets/logo.png');

function icon(name: SymbolViewProps['name']) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={name} tintColor={color} size={size} />;
  };
}

function LogoTitle() {
  return (
    <Image
      source={logo}
      style={{ width: 104, height: 39 }}
      contentFit="contain"
      accessibilityLabel="League Alert"
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.games'),
          headerTitle: () => <LogoTitle />,
          headerRightContainerStyle: { paddingRight: 16 },
          headerRight: () => (
            <HeaderButton icon={icons.heart} color={colors.accent} label={t('support.title')} onPress={() => router.push('/apoiar')} />
          ),
          tabBarIcon: icon(icons.basketballFill),
        }}
      />
      <Tabs.Screen name="times" options={{ title: t('tab.teams'), tabBarIcon: icon(icons.starFill) }} />
      <Tabs.Screen name="ajustes" options={{ title: t('tab.alerts'), tabBarIcon: icon(icons.bellBadge) }} />
    </Tabs>
  );
}
