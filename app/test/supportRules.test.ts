import { describe, expect, it } from 'vitest';
import {
  SUPPORT_RULES,
  initialSupportState,
  neverAskAgain,
  promptDismissed,
  promptShown,
  registerSession,
  shouldPrompt,
  supported,
  type SupportState,
} from '../src/lib/supportRules';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 9, 1);

/** Usuário que já usa o app há 10 dias e abriu 12 vezes. */
function veteran(): SupportState {
  return { ...initialSupportState(START), sessions: 12, lastSessionAt: START + 10 * DAY };
}
const ctx = (now: number, extra: Partial<{ finishedGameId: string | null; followedGameLive: boolean }> = {}) => ({
  now,
  finishedGameId: 'g1',
  followedGameLive: false,
  ...extra,
});

describe('regras do pedido de apoio', () => {
  it('pede depois do fim de um jogo acompanhado, para quem já usa o app há um tempo', () => {
    expect(shouldPrompt(veteran(), ctx(START + 10 * DAY))).toBe(true);
  });

  it('não pede para quem acabou de instalar', () => {
    const s = { ...initialSupportState(START), sessions: 50 };
    expect(shouldPrompt(s, ctx(START + 3 * DAY))).toBe(false);
  });

  it('não pede antes de 10 aberturas', () => {
    const s = { ...veteran(), sessions: SUPPORT_RULES.minSessions - 1 };
    expect(shouldPrompt(s, ctx(START + 10 * DAY))).toBe(false);
  });

  it('não pede sem jogo acompanhado encerrado nem com jogo dele ao vivo', () => {
    expect(shouldPrompt(veteran(), ctx(START + 10 * DAY, { finishedGameId: null }))).toBe(false);
    expect(shouldPrompt(veteran(), ctx(START + 10 * DAY, { followedGameLive: true }))).toBe(false);
  });

  it('espera 30 dias entre pedidos e não repete o mesmo jogo', () => {
    const now = START + 10 * DAY;
    const s = promptDismissed(promptShown(veteran(), now, 'g1'));
    expect(shouldPrompt(s, ctx(now + 29 * DAY, { finishedGameId: 'g2' }))).toBe(false);
    expect(shouldPrompt(s, ctx(now + 31 * DAY, { finishedGameId: 'g1' }))).toBe(false);
    expect(shouldPrompt(s, ctx(now + 31 * DAY, { finishedGameId: 'g2' }))).toBe(true);
  });

  it('depois de dois "Agora não", espera 90 dias', () => {
    const now = START + 10 * DAY;
    const s = promptDismissed(promptDismissed(promptShown(veteran(), now, 'g1')));
    expect(shouldPrompt(s, ctx(now + 60 * DAY, { finishedGameId: 'g2' }))).toBe(false);
    expect(shouldPrompt(s, ctx(now + 91 * DAY, { finishedGameId: 'g2' }))).toBe(true);
  });

  it('nunca mais pede depois de "Não perguntar mais" ou de um apoio', () => {
    const later = START + 400 * DAY;
    expect(shouldPrompt(neverAskAgain(veteran()), ctx(later))).toBe(false);
    expect(shouldPrompt(supported(veteran(), START), ctx(later))).toBe(false);
  });

  it('conta uma nova abertura só depois de 30 minutos fora', () => {
    const s = initialSupportState(START);
    expect(registerSession(s, START + 10 * 60 * 1000).sessions).toBe(1);
    expect(registerSession(s, START + 31 * 60 * 1000).sessions).toBe(2);
  });
});
