// Regras de quando pedir apoio. Funções puras (sem React Native) para poder testar.
//
// A ideia é pedir pouco e na hora certa:
// - só depois de a pessoa usar o app por um tempo (7 dias e 10 aberturas);
// - só logo depois do fim de um jogo que ela acompanhou, e nunca com jogo dela ao vivo;
// - no máximo 1 vez a cada 30 dias; depois de 2 "Agora não", 1 vez a cada 90 dias;
// - nunca mais depois de "Não perguntar mais" ou de um apoio.

const DAY = 24 * 60 * 60 * 1000;

export const SUPPORT_RULES = {
  minDaysOfUse: 7,
  minSessions: 10,
  /** Voltar ao app depois de pelo menos isso conta como uma nova abertura. */
  sessionGapMs: 30 * 60 * 1000,
  cooldownDays: 30,
  longCooldownDays: 90,
  /** A partir de quantos "Agora não" o intervalo fica longo. */
  dismissalsForLongCooldown: 2,
};

export interface SupportState {
  firstOpenAt: number;
  sessions: number;
  lastSessionAt: number;
  lastPromptAt: number | null;
  /** Jogo que motivou o último pedido (não pede duas vezes pelo mesmo jogo). */
  lastPromptGameId: string | null;
  dismissals: number;
  neverAsk: boolean;
  supportedAt: number | null;
}

export function initialSupportState(now: number): SupportState {
  return {
    firstOpenAt: now,
    sessions: 1,
    lastSessionAt: now,
    lastPromptAt: null,
    lastPromptGameId: null,
    dismissals: 0,
    neverAsk: false,
    supportedAt: null,
  };
}

/** Chamado quando o app volta para a frente. */
export function registerSession(s: SupportState, now: number): SupportState {
  if (now - s.lastSessionAt < SUPPORT_RULES.sessionGapMs) return { ...s, lastSessionAt: now };
  return { ...s, sessions: s.sessions + 1, lastSessionAt: now };
}

export interface PromptContext {
  now: number;
  /** Um jogo acompanhado (sino ou time favorito) que já terminou hoje. */
  finishedGameId: string | null;
  /** Algum jogo acompanhado está acontecendo agora. */
  followedGameLive: boolean;
}

export function cooldownDays(s: SupportState): number {
  return s.dismissals >= SUPPORT_RULES.dismissalsForLongCooldown
    ? SUPPORT_RULES.longCooldownDays
    : SUPPORT_RULES.cooldownDays;
}

export function shouldPrompt(s: SupportState, ctx: PromptContext): boolean {
  if (s.neverAsk || s.supportedAt !== null) return false;
  if (ctx.now - s.firstOpenAt < SUPPORT_RULES.minDaysOfUse * DAY) return false;
  if (s.sessions < SUPPORT_RULES.minSessions) return false;
  if (s.lastPromptAt !== null && ctx.now - s.lastPromptAt < cooldownDays(s) * DAY) return false;
  if (!ctx.finishedGameId || ctx.finishedGameId === s.lastPromptGameId) return false;
  if (ctx.followedGameLive) return false;
  return true;
}

export function promptShown(s: SupportState, now: number, gameId: string | null): SupportState {
  return { ...s, lastPromptAt: now, lastPromptGameId: gameId };
}

export function promptDismissed(s: SupportState): SupportState {
  return { ...s, dismissals: s.dismissals + 1 };
}

export function neverAskAgain(s: SupportState): SupportState {
  return { ...s, neverAsk: true };
}

export function supported(s: SupportState, now: number): SupportState {
  return { ...s, supportedAt: now };
}
