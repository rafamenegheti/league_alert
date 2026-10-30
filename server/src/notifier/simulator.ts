// Entrega o push no Simulador do iOS que estiver aberto, como se viesse da Apple.
import { spawn } from 'node:child_process';
import type { DeviceRow } from '../db';
import type { Notifier, PushMessage } from './index';

export const BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? 'com.rafael.leaguealert';

export function apnsPayload(msg: PushMessage) {
  return {
    aps: {
      alert: { title: msg.title, body: msg.body },
      sound: 'default',
      'thread-id': msg.data.gameId,
    },
    // O expo-notifications expõe a chave "body" como `content.data` no iOS;
    // os dados também vão no topo, para quem lê o payload bruto.
    body: msg.data,
    ...msg.data,
  };
}

export class SimulatorNotifier implements Notifier {
  // Todos os aparelhos "simulador" são o mesmo Simulador aberto: envia uma vez só.
  async send(_devices: DeviceRow[], msg: PushMessage): Promise<void> {
    const payload = JSON.stringify(apnsPayload(msg));
    await new Promise<void>((resolve) => {
      const child = spawn('xcrun', ['simctl', 'push', 'booted', BUNDLE_ID, '-']);
      let err = '';
      child.stderr.on('data', (d) => (err += d));
      child.on('error', (e) => {
        console.error('[push:simulador] falhou ao rodar xcrun:', e.message);
        resolve();
      });
      child.on('close', (code) => {
        if (code === 0) console.log(`[push:simulador] ${msg.title} | ${msg.body}`);
        else console.error(`[push:simulador] erro (${code}): ${err.trim()}`);
        resolve();
      });
      child.stdin.end(payload);
    });
  }
}
