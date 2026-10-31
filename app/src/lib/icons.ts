// Ícones do app: SF Symbols no iPhone e Material Symbols no Android.
import type { SymbolViewProps } from 'expo-symbols';

type Pair = Extract<SymbolViewProps['name'], object>;
export type IconName = SymbolViewProps['name'];

const pair = (ios: NonNullable<Pair['ios']>, android: NonNullable<Pair['android']>): IconName => ({ ios, android });

export const icons = {
  basketball: pair('basketball', 'sports_basketball'),
  basketballFill: pair('basketball.fill', 'sports_basketball'),
  player: pair('figure.basketball', 'sports_handball'),
  bell: pair('bell', 'notifications'),
  bellFill: pair('bell.fill', 'notifications_active'),
  bellSlash: pair('bell.slash', 'notifications_off'),
  bellBadge: pair('bell.badge.fill', 'notifications'),
  star: pair('star', 'star'),
  starFill: pair('star.fill', 'star'),
  heart: pair('heart.fill', 'favorite'),
  close: pair('xmark', 'close'),
  chevronLeft: pair('chevron.left', 'chevron_left'),
  chevronRight: pair('chevron.right', 'chevron_right'),
  target: pair('target', 'target'),
  flame: pair('flame.fill', 'local_fire_department'),
  trophy: pair('trophy.fill', 'emoji_events'),
} satisfies Record<string, IconName>;
