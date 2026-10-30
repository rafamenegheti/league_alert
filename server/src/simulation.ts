// Jogo falso que passa por todas as fases em poucos minutos, para testar as notificações
// sem esperar um jogo de verdade. Aparece na lista de jogos de hoje como "SIMULAÇÃO".
import type { Game, GameStatus, Play, Team } from '@league-alert/shared';
import type { GameService } from './games';

interface Step {
  status: GameStatus;
  period: number;
  clock: number; // segundos
  away: number;
  home: number;
  play?: string;
}

// Cada linha é um momento do jogo. Os comentários mostram o alerta esperado.
const TIMELINE: Step[] = [
  { status: 'live', period: 1, clock: 720, away: 0, home: 0 },
  { status: 'live', period: 1, clock: 702, away: 0, home: 2, play: 'Home team makes 2-foot layup' }, // início do jogo
  { status: 'end_period', period: 1, clock: 0, away: 28, home: 25 },
  { status: 'live', period: 2, clock: 720, away: 28, home: 25 },
  { status: 'live', period: 2, clock: 695, away: 31, home: 25 }, // volta entre quartos
  { status: 'halftime', period: 2, clock: 0, away: 55, home: 52 },
  { status: 'live', period: 3, clock: 720, away: 55, home: 52 },
  { status: 'live', period: 3, clock: 701, away: 55, home: 54 }, // volta do intervalo
  { status: 'end_period', period: 3, clock: 0, away: 84, home: 80 },
  { status: 'live', period: 4, clock: 698, away: 86, home: 80 }, // volta entre quartos
  { status: 'live', period: 4, clock: 330, away: 100, home: 92 },
  { status: 'live', period: 4, clock: 288, away: 100, home: 97 }, // clutch time
  { status: 'live', period: 4, clock: 190, away: 102, home: 99, play: 'Simulated Player ejected' }, // ejeção
  { status: 'live', period: 4, clock: 0, away: 108, home: 108 },
  { status: 'end_period', period: 4, clock: 0, away: 108, home: 108 },
  { status: 'live', period: 5, clock: 281, away: 110, home: 108 }, // prorrogação
  { status: 'final', period: 5, clock: 0, away: 118, home: 115 }, // fim do jogo
];

export interface SimulationOptions {
  awayAbbr?: string;
  homeAbbr?: string;
  waitSeconds?: number; // tempo "agendado" antes de começar, para dar tempo de ligar o sino
  stepSeconds?: number;
}

export function startSimulation(service: GameService, teams: Team[], opts: SimulationOptions = {}): Game {
  const { awayAbbr = 'LAL', homeAbbr = 'BOS', waitSeconds = 20, stepSeconds = 5 } = opts;
  const find = (abbr: string) => teams.find((t) => t.abbr === abbr) ?? teams[0];
  const awayTeam = find(awayAbbr);
  const homeTeam = find(homeAbbr);
  const id = `sim-${Date.now()}`;
  const startTime = new Date(Date.now() + waitSeconds * 1000).toISOString();
  const plays: Play[] = [];
  const periodEnd = { away: [0], home: [0] }; // placar acumulado no fim de cada período

  const build = (s: Step | null): Game => {
    const step = s ?? { status: 'scheduled' as const, period: 0, clock: 720, away: 0, home: 0 };
    const lines = (side: 'away' | 'home') => {
      const ends = periodEnd[side];
      const out: number[] = [];
      for (let p = 1; p <= step.period; p++) {
        const end = p < ends.length ? ends[p] : step[side];
        out.push(end - ends[p - 1]);
      }
      return out;
    };
    const m = Math.floor(step.clock / 60);
    const sec = step.clock % 60;
    return {
      id,
      simulated: true,
      startTime,
      status: step.status,
      period: step.period,
      clock: step.clock >= 60 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}.0`,
      clockSeconds: step.clock,
      away: { ...awayTeam, score: step.away, linescores: lines('away'), record: 'SIM' },
      home: { ...homeTeam, score: step.home, linescores: lines('home'), record: 'SIM' },
      broadcasts: [],
    };
  };

  const first = build(null);
  service.simulated.set(id, { game: first, plays: [] });
  service.process(first, []);

  let i = 0;
  const next = async () => {
    const step = TIMELINE[i];
    // Ao mudar de período, guarda o placar do fim do anterior (para o placar por quarto).
    const prevStep = TIMELINE[i - 1];
    if (prevStep && step.period > prevStep.period) {
      periodEnd.away[prevStep.period] = prevStep.away;
      periodEnd.home[prevStep.period] = prevStep.home;
    }
    if (step.play) {
      plays.unshift({
        id: `${id}-p${i}`,
        text: step.play,
        period: step.period,
        clock: build(step).clock,
        awayScore: step.away,
        homeScore: step.home,
        scoring: !/ejected/.test(step.play),
      });
    }
    const game = build(step);
    service.simulated.set(id, { game, plays: [...plays] });
    await service.process(game, plays);
    i++;
    if (i < TIMELINE.length) setTimeout(next, stepSeconds * 1000);
    else setTimeout(() => service.simulated.delete(id), 10 * 60_000);
  };
  setTimeout(next, waitSeconds * 1000);
  return first;
}
