import { createVerify, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeviceRow } from '../src/db';
import { DEFAULT_PREFS, DEFAULT_SETTINGS } from '@league-alert/shared';
import { FcmNotifier, fcmMessage } from '../src/notifier/fcm';
import type { PushMessage } from '../src/notifier';

const msg: PushMessage = {
  title: 'LAL x BOS',
  body: 'O 3º quarto começou! 54 x 51',
  data: { gameId: '401', alertType: 'halftime_end' },
};

const device = (id: string, pushToken: string | null): DeviceRow => ({
  id,
  platform: 'android',
  pushToken,
  prefs: DEFAULT_PREFS,
  settings: DEFAULT_SETTINGS,
  lang: 'pt',
  region: 'BR',
});

function fakeAccount() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const dir = mkdtempSync(join(tmpdir(), 'fcm-'));
  const path = join(dir, 'key.json');
  writeFileSync(
    path,
    JSON.stringify({
      project_id: 'league-alert-test',
      client_email: 'push@league-alert-test.iam.gserviceaccount.com',
      private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
      token_uri: 'https://oauth2.googleapis.com/token',
    }),
  );
  return { path, publicKey };
}

afterEach(() => vi.unstubAllGlobals());

describe('push no Android (Firebase)', () => {
  it('monta a mensagem no formato que o expo-notifications entende', () => {
    const m = fcmMessage('tok', msg).message;
    expect(m.token).toBe('tok');
    expect(m.data.title).toBe(msg.title);
    expect(m.data.message).toBe(msg.body);
    expect(JSON.parse(m.data.body)).toEqual(msg.data);
    expect(m.data.channelId).toBe('alerts');
    expect(m.android.priority).toBe('high');
  });

  it('pega o token do Google uma vez e envia para cada aparelho com token', async () => {
    const { path, publicKey } = fakeAccount();
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        if (url.includes('oauth2')) return new Response(JSON.stringify({ access_token: 'abc', expires_in: 3600 }));
        return new Response('{}');
      }),
    );

    const fcm = new FcmNotifier(path);
    await fcm.send([device('a', 'tok-a'), device('b', null), device('c', 'tok-c')], msg);
    await fcm.send([device('a', 'tok-a')], msg);

    const auth = calls.filter((c) => c.url.includes('oauth2'));
    const sends = calls.filter((c) => c.url.includes('fcm.googleapis.com'));
    expect(auth).toHaveLength(1); // token reaproveitado no segundo envio
    expect(sends.map((c) => JSON.parse(String(c.init.body)).message.token)).toEqual(['tok-a', 'tok-c', 'tok-a']);
    expect(sends[0].url).toBe('https://fcm.googleapis.com/v1/projects/league-alert-test/messages:send');
    expect((sends[0].init.headers as Record<string, string>).authorization).toBe('Bearer abc');

    // O JWT enviado ao Google é assinado com a chave da conta de serviço.
    const assertion = new URLSearchParams(String(auth[0].init.body)).get('assertion')!;
    const [h, c, sig] = assertion.split('.');
    expect(createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(sig, 'base64url'))).toBe(true);
    expect(JSON.parse(Buffer.from(c, 'base64url').toString()).scope).toContain('firebase.messaging');
  });

  it('sem a chave do Firebase, ignora sem quebrar', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const fcm = new FcmNotifier('/nao/existe.json');
    expect(fcm.configured).toBe(false);
    await fcm.send([device('a', 'tok-a')], msg);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
