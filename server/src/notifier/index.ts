import type { PushData } from '@league-alert/shared';
import type { DeviceRow } from '../db';
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
 * Simulador: xcrun simctl push. iPhone de verdade: APNs (entra quando houver a conta paga).
 */
export class PushDispatcher implements Notifier {
  private simulator = new SimulatorNotifier();

  async send(devices: DeviceRow[], msg: PushMessage): Promise<void> {
    const sims = devices.filter((d) => d.platform === 'simulator');
    const phones = devices.filter((d) => d.platform === 'ios');
    const jobs: Promise<void>[] = [];
    if (sims.length) jobs.push(this.simulator.send(sims, msg));
    if (phones.length) {
      console.warn(`[push] ${phones.length} iPhone(s) ignorado(s): envio via APNs ainda não configurado`);
    }
    await Promise.all(jobs);
  }
}
