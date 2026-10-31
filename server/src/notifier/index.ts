import type { PushData } from '@league-alert/shared';
import type { DeviceRow } from '../db';
import { FcmNotifier } from './fcm';
import { SimulatorNotifier } from './simulator';

export interface PushMessage {
  title: string;
  body: string;
  data: PushData;
}

export interface Notifier {
  send(devices: DeviceRow[], msg: PushMessage): Promise<void>;
}

/**
 * Escolhe o "entregador" por tipo de aparelho.
 * Simulador: xcrun simctl push. Android: Firebase (FCM).
 * iPhone de verdade: APNs (entra quando houver a conta paga).
 */
export class PushDispatcher implements Notifier {
  private simulator = new SimulatorNotifier();
  private fcm = new FcmNotifier();

  async send(devices: DeviceRow[], msg: PushMessage): Promise<void> {
    const sims = devices.filter((d) => d.platform === 'simulator');
    const phones = devices.filter((d) => d.platform === 'ios');
    const androids = devices.filter((d) => d.platform === 'android');
    const jobs: Promise<void>[] = [];
    if (sims.length) jobs.push(this.simulator.send(sims, msg));
    if (androids.length) jobs.push(this.fcm.send(androids, msg));
    if (phones.length) {
      console.warn(`[push] ${phones.length} iPhone(s) ignorado(s): envio via APNs ainda não configurado`);
    }
    await Promise.all(jobs);
  }
}
