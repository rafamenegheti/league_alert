import { ErrorCode, useIAP, type Product } from 'expo-iap';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supportTierName, t } from '@/lib/i18n';
import { SUPPORT_SKUS, SUPPORT_TIERS, supportActions } from '@/lib/support';
import { colors } from '@/lib/theme';
import { icons } from '@/lib/icons';

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
  // Sem resposta da loja (ou sem os produtos cadastrados nela): mostra os valores apagados.
  const unavailable = failed || (loaded && products.length === 0);

  const buy = async (sku: string) => {
    if (!byId.has(sku)) {
      if (unavailable) Alert.alert(t('support.unavailable.title'), t('support.unavailable'));
      return;
    }
    setBuying(sku);
    try {
      await requestPurchase({ request: { apple: { sku }, google: { skus: [sku] } }, type: 'in-app' });
    } catch {
      // O erro chega pelo onPurchaseError.
    }
  };

  if (thanks) {
    return (
      <View style={[styles.screen, styles.center]}>
        <SymbolView name={icons.heart} tintColor={colors.accent} size={56} />
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
        <SymbolView name={icons.heart} tintColor={colors.accent} size={40} />
        <Text style={styles.intro}>{t('support.intro')}</Text>
      </View>

      <View style={styles.grid}>
        {SUPPORT_TIERS.map((tier) => {
          const product = byId.get(tier.sku);
          const busy = buying === tier.sku;
          const dimmed = !product || (buying !== null && !busy);
          return (
            <Pressable
              key={tier.sku}
              disabled={buying !== null}
              onPress={() => buy(tier.sku)}
              style={({ pressed }) => [
                styles.tier,
                pressed && product && { backgroundColor: colors.cardPressed },
                dimmed && { opacity: 0.45 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !product }}
              accessibilityLabel={product ? `${supportTierName(tier.amount)}, ${product.displayPrice}` : supportTierName(tier.amount)}
            >
              {busy ? (
                <ActivityIndicator color={colors.accent} style={{ height: 28 }} />
              ) : (
                <SymbolView name={tier.icon} tintColor={colors.accent} size={28} />
              )}
              <Text style={styles.tierName}>{supportTierName(tier.amount)}</Text>
              {product ? (
                <Text style={styles.tierPrice}>{product.displayPrice}</Text>
              ) : unavailable ? (
                <Text style={[styles.tierPrice, { color: colors.muted }]}>—</Text>
              ) : (
                <ActivityIndicator color={colors.muted} style={{ height: 22 }} />
              )}
            </Pressable>
          );
        })}
      </View>

      {unavailable ? <Text style={styles.status}>{t('support.unavailable')}</Text> : null}

      <Text style={styles.note}>{t('support.note', { store: Platform.OS === 'android' ? 'Google Play' : 'Apple' })}</Text>
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
  status: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 18 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 24, paddingHorizontal: 12 },
  primary: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13, marginTop: 10 },
  primaryText: { color: colors.bg, fontSize: 16, fontWeight: '700' },
});
