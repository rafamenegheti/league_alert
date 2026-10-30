import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Game } from '@league-alert/shared';
import { Db } from '../src/db';
import { GameService } from '../src/games';
import type { Notifier, PushMessage } from '../src/notifier';

class FakeNotifier implements Notifier {
  sent: { to: string[]; msg: PushMessage }[] = [];
  async send(devices: { id: string }[], msg: PushMessage) {
    this.sent.push({ to: devices.map((d) => d.id), msg });
  }
}

const team = (id: string, abbr: string, score = 0) => ({
  id, abbr, name: abbr, shortName: abbr, logo: '', color: '000', score, linescores: [],
});

const g = (status: Game['status'], period: number, clockSeconds: number): Game => ({
  id: 'g1', startTime: '', status, period, clock: '', clockSeconds,
  home: team('2', 'BOS'), away: team('13', 'LAL'), broadcasts: [],
});

function setup() {
  const db = new Db(':memory:');
  const notifier = new FakeNotifier();
  const service = new GameService(db, notifier);
  db.registerDevice('sino', 'simulator', null);
  db.registerDevice('fã', 'simulator', null);
  db.registerDevice('nada', 'simulator', null);
  db.setGameSub('sino', 'g1', true);
  db.setFavorites('fã', ['13']);
  return { db, notifier, service };
}

afterEach(() => vi.useRealTimers());

describe('GameService.process', () => {
  it('envia só para quem segue o jogo ou o time', async () => {
    const { notifier, service } = setup();
    await service.process(g('halftime', 2, 0));
    await service.process(g('live', 3, 700));
    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0].to.sort()).toEqual(['fã', 'sino']);
    expect(notifier.sent[0].msg.data).toEqual({ gameId: 'g1', alertType: 'halftime_end' });
  });

  it('respeita os tipos de alerta desligados', async () => {
    const { db, notifier, service } = setup();
    db.setPrefs('fã', { halftime_end: false });
    await service.process(g('halftime', 2, 0));
    await service.process(g('live', 3, 700));
    expect(notifier.sent[0].to).toEqual(['sino']);
  });

  it('não envia o mesmo evento duas vezes (ex.: servidor reiniciou)', async () => {
    const { db, notifier } = setup();
    const a = new GameService(db, notifier);
    await a.process(g('halftime', 2, 0));
    await a.process(g('live', 3, 700));
    const b = new GameService(db, notifier); // "reiniciou" no meio do intervalo
    await b.process(g('live', 3, 720));
    await b.process(g('live', 3, 690));
    expect(notifier.sent).toHaveLength(1);
  });

  it('cada aparelho recebe no próprio idioma', async () => {
    const { db, notifier, service } = setup();
    db.registerDevice('fã', 'simulator', null, 'pt'); // muda o idioma de um dos dois
    await service.process(g('halftime', 2, 0));
    await service.process(g('live', 3, 700));
    const byBody = Object.fromEntries(notifier.sent.map((s) => [s.msg.body, s.to]));
    expect(byBody).toEqual({
      'Fim do intervalo: o 3º quarto começou!': ['fã'],
      'Halftime is over: the 3rd quarter has started!': ['sino'],
    });
  });

  it('modo sem spoiler: o título vai sem placar só para quem pediu', async () => {
    const { db, notifier, service } = setup();
    db.setSettings('fã', { hideScores: true });
    await service.process(g('halftime', 2, 0));
    await service.process(g('live', 3, 700));
    const byTitle = Object.fromEntries(notifier.sent.map((s) => [s.msg.title, s.to]));
    expect(byTitle).toEqual({ '🏀 LAL @ BOS': ['fã'], '🏀 LAL 0 – 0 BOS': ['sino'] });
  });

  it('atraso do stream: segura o push pelo tempo configurado', async () => {
    vi.useFakeTimers();
    const { db, notifier, service } = setup();
    db.setSettings('fã', { delaySeconds: 30 });
    await service.process(g('halftime', 2, 0));
    await service.process(g('live', 3, 700));
    expect(notifier.sent.map((s) => s.to)).toEqual([['sino']]); // o outro ainda não
    await vi.advanceTimersByTimeAsync(30_000);
    expect(notifier.sent.map((s) => s.to)).toEqual([['sino'], ['fã']]);
  });

  it('ejeção só para lances novos', async () => {
    const { notifier, service } = setup();
    const old = { id: 'p1', text: 'Someone ejected', period: 2, clock: '5:00', homeScore: 0, awayScore: 0, scoring: false };
    await service.process(g('live', 2, 400), [old]); // já existia quando começou a acompanhar
    const fresh = { ...old, id: 'p2', text: 'Other Player ejected' };
    await service.process(g('live', 2, 380), [fresh, old]);
    expect(notifier.sent.map((s) => s.msg.data.alertType)).toEqual(['ejection']);
    expect(notifier.sent[0].msg.body).toBe('Other Player ejected');
  });
});
