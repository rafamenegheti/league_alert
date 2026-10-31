// Envia push para Android pelo Firebase Cloud Messaging (API HTTP v1). Grátis.
//
// Precisa da chave de conta de serviço do Firebase (JSON). Por padrão lê
// server/data/firebase-service-account.json; dá para trocar com FCM_SERVICE_ACCOUNT.
// Sem a chave, os pushes para Android são ignorados com um aviso.
import { createSign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { DeviceRow } from '../db';
import type { Notifier, PushMessage } from './index';

export const ANDROID_CHANNEL_ID = 'alerts';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const DEFAULT_KEY_PATH = new URL('../../data/firebase-service-account.json', import.meta.url).pathname;

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

/**
 * Mensagem só de dados, no formato que o expo-notifications monta sozinho no Android:
 * title/message viram o texto, body (JSON) vira `content.data` no app.
 */
export function fcmMessage(token: string, msg: PushMessage) {
  return {
    message: {
      token,
      data: {
        title: msg.title,
        message: msg.body,
        body: JSON.stringify(msg.data),
        channelId: ANDROID_CHANNEL_ID,
        ...msg.data,
      },
      android: { priority: 'high' as const, ttl: '600s' },
    },
  };
}

const base64url = (s: string | Buffer) => Buffer.from(s).toString('base64url');

export class FcmNotifier implements Notifier {
  private account: ServiceAccount | null;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(keyPath = process.env.FCM_SERVICE_ACCOUNT ?? DEFAULT_KEY_PATH) {
    this.account = existsSync(keyPath) ? (JSON.parse(readFileSync(keyPath, 'utf8')) as ServiceAccount) : null;
    if (this.account) console.log(`[push:android] Firebase configurado (projeto ${this.account.project_id})`);
  }

  get configured() {
    return this.account !== null;
  }

  /** Token de acesso do Google (dura 1 h), assinado com a chave da conta de serviço. */
  private async accessToken(acc: ServiceAccount): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) return this.token.value;
    const tokenUri = acc.token_uri ?? 'https://oauth2.googleapis.com/token';
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(JSON.stringify({ iss: acc.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }));
    const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(acc.private_key);
    const res = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${header}.${claims}.${base64url(signature)}`,
      }),
    });
    if (!res.ok) throw new Error(`token do Google falhou: HTTP ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return json.access_token;
  }

  async send(devices: DeviceRow[], msg: PushMessage): Promise<void> {
    const acc = this.account;
    if (!acc) {
      console.warn(`[push:android] ${devices.length} aparelho(s) ignorado(s): Firebase não configurado`);
      return;
    }
    const withToken = devices.filter((d) => d.pushToken);
    if (withToken.length < devices.length) {
      console.warn(`[push:android] ${devices.length - withToken.length} aparelho(s) sem token de push`);
    }
    if (!withToken.length) return;

    try {
      const auth = await this.accessToken(acc);
      const url = `https://fcm.googleapis.com/v1/projects/${acc.project_id}/messages:send`;
      await Promise.all(
        withToken.map(async (d) => {
          const res = await fetch(url, {
            method: 'POST',
            headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json' },
            body: JSON.stringify(fcmMessage(d.pushToken!, msg)),
          });
          if (res.ok) console.log(`[push:android] ${msg.title} | ${msg.body}`);
          else console.error(`[push:android] erro para ${d.id}: HTTP ${res.status} ${await res.text()}`);
        }),
      );
    } catch (e) {
      console.error('[push:android]', (e as Error).message);
    }
  }
}
