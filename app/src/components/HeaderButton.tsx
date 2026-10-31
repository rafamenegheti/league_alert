import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import semiBold from 'expo-symbols/androidWeights/semiBold';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';

/** Botão redondo de ícone para o cabeçalho (ex.: fechar, apoiar). */
export function HeaderButton({
  icon,
  label,
  onPress,
  color = colors.text,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <SymbolView name={icon} tintColor={color} size={17} weight={{ ios: 'semibold', android: semiBold }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
