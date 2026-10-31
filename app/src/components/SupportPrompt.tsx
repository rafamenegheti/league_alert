import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/lib/i18n';
import { supportActions, useSupportPromptState } from '@/lib/support';
import { colors } from '@/lib/theme';
import { icons } from '@/lib/icons';

/** Pedido de apoio: um cartão discreto na parte de baixo da tela. Quando aparece é decidido em `useSupportPrompt`. */
export function SupportPrompt() {
  const { visible } = useSupportPromptState();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={supportActions.dismiss}>
      <Pressable style={styles.backdrop} onPress={supportActions.dismiss} accessibilityLabel={t('support.prompt.later')} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.heading}>
          <SymbolView name={icons.heart} tintColor={colors.accent} size={22} />
          <Text style={styles.title}>{t('support.prompt.title')}</Text>
        </View>
        <Text style={styles.text}>{t('support.prompt.text')}</Text>
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
          onPress={() => {
            supportActions.accept();
            router.push('/apoiar');
          }}
        >
          <Text style={styles.primaryText}>{t('support.prompt.yes')}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={supportActions.dismiss}>
          <Text style={styles.secondaryText}>{t('support.prompt.later')}</Text>
        </Pressable>
        <Pressable style={styles.never} onPress={supportActions.never} hitSlop={8}>
          <Text style={styles.neverText}>{t('support.prompt.never')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 22,
    gap: 10,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: colors.text, fontSize: 19, fontWeight: '700' },
  text: { color: colors.muted, fontSize: 15, lineHeight: 21, marginBottom: 6 },
  primary: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: colors.text, fontSize: 16 },
  never: { alignItems: 'center', paddingBottom: 4 },
  neverText: { color: colors.muted, fontSize: 13 },
});
