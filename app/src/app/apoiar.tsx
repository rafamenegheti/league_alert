import { ErrorCode, useIAP, type Product } from 'expo-iap';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supportTierName, t } from '@/lib/i18n';
import { SUPPORT_SKUS, SUPPORT_TIERS, supportActions } from '@/lib/support';
import { colors } from '@/lib/theme';

/** Se a loja não responder nesse tempo, mostra que as compras estão indisponíveis. */
const LOAD_TIMEOUT_MS = 10_000;

export default function SupportScreen() {
  const [buying, setBuying] = useState<string | null>(null);
  const [thanks, setThanks] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    // Também recebe compras que ficaram pela metade (ex.: o app fechou no meio): finaliza todas.
    onPurchaseSuccess: async (purchase) => {
      await finishTransaction({ purchase, isConsumable: true });
      await supportActions.supported();
      setBuying(null);
      setThanks(true);
    },
    onPurchaseError: (e) => {
      setBuying(null);
      if (e.code !== ErrorCode.UserCancelled) Alert.alert(t('support.error'), e.message);
    },
    onError: () => setFailed(true),
  });

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: SUPPORT_SKUS, type: 'in-app' })
      .then(() => setLoaded(true))
      .catch(() => setFailed(true));
  }, [connected, fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => setFailed((f) => f || !connected), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [connected]);

  const byId = new Map<string, Product>(products.map((p) => [p.id, p]));
  const tiers = SUPPORT_TIERS.filter((tier) => byId.has(tier.sku));

  const buy = async (sku: string) => {
    setBuying(sku);
    try {
      await requestPurchase({ request: { apple: { sku } }, type: 'in-app' });
    } catch {
      // O erro chega pelo onPurchaseError.
    }
  };

  if (thanks) {
    return (
      <View style={[styles.screen, styles.center]}>
        <SymbolView name="heart.fill" tintColor={colors.accent} size={56} />
        <Text style={styles.title}>{t('support.thanks.title')}</Text>
        <Text style={styles.intro}>{t('support.thanks.text')}</Text>
        <Pressable style={styles.primary} onPress={() => router.back()}>
          <Text style={styles.primaryText}>{t('support.close')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <SymbolView name="heart.fill" tintColor={colors.accent} size={40} />
        <Text style={styles.intro}>{t('support.intro')}</Text>
      </View>

      {tiers.length > 0 ? (
        <View style={styles.grid}>
          {tiers.map((tier) => {
            const product = byId.get(tier.sku)!;
            const busy = buying === tier.sku;
            return (
              <Pressable
                key={tier.sku}
                disabled={buying !== null}
                onPress={() => buy(tier.sku)}
                style={({ pressed }) => [styles.tier, pressed && { backgroundColor: colors.cardPressed }, buying && !busy && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel={`${supportTierName(tier.amount)}, ${product.displayPrice}`}
              >
                {busy ? (
                  <ActivityIndicator color={colors.accent} style={{ height: 28 }} />
                ) : (
                  <SymbolView name={tier.icon} tintColor={colors.accent} size={28} />
                )}
                <Text style={styles.tierName}>{supportTierName(tier.amount)}</Text>
                <Text style={styles.tierPrice}>{product.displayPrice}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : failed || (loaded && products.length === 0) ? (
        <Text style={styles.status}>{t('support.unavailable')}</Text>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.status}>{t('support.loading')}</Text>
        </View>
      )}

      <Text style={styles.note}>{t('support.note')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  content: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', gap: 14, paddingHorizontal: 8, marginTop: 8, marginBottom: 22 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  intro: { color: colors.text, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tier: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
  },
  tierName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  tierPrice: { color: colors.accent, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  loading: { alignItems: 'center', gap: 10, marginTop: 20 },
  status: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 10 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 24, paddingHorizontal: 12 },
  primary: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13, marginTop: 10 },
  primaryText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
});
