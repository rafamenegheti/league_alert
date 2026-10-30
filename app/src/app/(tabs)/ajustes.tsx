import { ALERT_TYPES } from '@league-alert/shared';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { API_URL, api } from '@/lib/api';
import { platform } from '@/lib/device';
import { useDevice, useSetPrefs } from '@/lib/hooks';
import { alertDescription, alertLabel, t } from '@/lib/i18n';
import { ensurePermission } from '@/lib/notifications';
import { colors } from '@/lib/theme';

export default function AlertsScreen() {
  const { data: device } = useDevice();
  const setPrefs = useSetPrefs();
  const [permission, setPermission] = useState<boolean | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync().then((p) => setPermission(p.granted));
  }, []);

  const run = async (label: string, fn: () => Promise<string>) => {
    try {
      Alert.alert(label, await fn());
    } catch (e) {
      Alert.alert(label, t('alerts.error', { message: (e as Error).message }));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      {permission === false ? (
        <Pressable
          style={styles.warning}
          onPress={async () => {
            const ok = await ensurePermission();
            if (!ok) Linking.openSettings(); // já foi negado antes: só dá para ligar nos Ajustes do iOS
            setPermission(ok);
          }}
        >
          <Text style={styles.warningText}>{t('alerts.permissionOff')}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.section}>{t('alerts.notifyWhen')}</Text>
      <View style={styles.group}>
        {ALERT_TYPES.map((type, i) => (
          <View key={type} style={[styles.row, i > 0 && styles.rowBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{alertLabel(type)}</Text>
              <Text style={styles.desc}>{alertDescription(type)}</Text>
            </View>
            <Switch
              value={device?.prefs[type] ?? true}
              disabled={!device}
              onValueChange={(v) => setPrefs.mutate({ [type]: v })}
              trackColor={{ true: colors.accent }}
            />
          </View>
        ))}
      </View>

      <Text style={styles.section}>{t('alerts.test')}</Text>
      <View style={styles.group}>
        <Button
          label={t('alerts.sendTest')}
          onPress={() =>
            run(t('alerts.testTitle'), async () => {
              const r = await api.testPush(device!.deviceId);
              return r.sentTo ? t('alerts.testSent') : t('alerts.testNoDevice');
            })
          }
        />
        <Button
          border
          label={t('alerts.simulate')}
          onPress={() =>
            run(t('alerts.simulateTitle'), async () => {
              const r = await api.simulate();
              return t('alerts.simulateDone', { matchup: r.matchup });
            })
          }
        />
      </View>

      <Text style={styles.footer}>
        {t('alerts.server')}: {API_URL}
        {'\n'}
        {t('alerts.device')}: {platform === 'simulator' ? t('alerts.simulator') : t('alerts.iphone')}
      </Text>
    </ScrollView>
  );
}

function Button({ label, onPress, border }: { label: string; onPress: () => void; border?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, border && styles.rowBorder, pressed && { backgroundColor: colors.cardPressed }]}
    >
      <Text style={styles.button}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  section: { color: colors.muted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginTop: 20, marginBottom: 8, marginLeft: 4 },
  group: { backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  label: { color: colors.text, fontSize: 16 },
  desc: { color: colors.muted, fontSize: 13, marginTop: 2 },
  button: { color: colors.accent, fontSize: 16 },
  warning: { backgroundColor: '#3A1D10', borderRadius: 12, padding: 14 },
  warningText: { color: colors.accent, fontSize: 15 },
  footer: { color: colors.muted, fontSize: 12, marginTop: 24, textAlign: 'center', lineHeight: 18 },
});
