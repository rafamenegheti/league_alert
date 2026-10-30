// Jogo falso que passa por todas as fases em poucos minutos, para testar as notificações
// sem esperar um jogo de verdade. Aparece na lista de jogos de hoje com a marca "SIM".
import type { Game, GameStatus, Play, PlayerLine, Team } from '@league-alert/shared';
import type { GameService } from './games';

interface Step {
  status: GameStatus;
  period: number;
  clock: number; // segundos
  away: number;
  home: number;
  play?: string;
  kind?: string; // tipo do lance (como na ESPN)
}

// Cada linha é um momento do jogo. Os comentários mostram o alerta esperado.
// (O lembrete "começa em 15 min" sai logo ao criar a simulação.)
const TIMELINE: Step[] = [
  { status: 'live', period: 1, clock: 720, away: 0, home: 0 },
  { status: 'live', period: 1, clock: 702, away: 0, home: 2, play: 'Home team makes 2-foot layup', kind: 'Layup Shot' }, // início do jogo
  { status: 'end_period', period: 1, clock: 0, away: 28, home: 25 },
  { status: 'live', period: 2, clock: 720, away: 28, home: 25 },
  { status: 'live', period: 2, clock: 695, away: 31, home: 25 }, // volta entre quartos
  { status: 'live', period: 2, clock: 600, away: 33, home: 37, play: 'Away team makes jumper', kind: 'Jump Shot' },
  { status: 'live', period: 2, clock: 520, away: 33, home: 47, play: 'Home team makes three pointer', kind: 'Jump Shot' }, // corrida 10-0
  { status: 'halftime', period: 2, clock: 0, away: 55, home: 52 },
  { status: 'halftime', period: 2, clock: 0, away: 55, home: 52 }, // intervalo acabando
  { status: 'live', period: 3, clock: 720, away: 55, home: 52 },
  { status: 'live', period: 3, clock: 701, away: 55, home: 54 }, // volta do intervalo
  { status: 'end_period', period: 3, clock: 0, away: 84, home: 80 },
  { status: 'live', period: 4, clock: 698, away: 86, home: 80 }, // volta entre quartos
  { status: 'live', period: 4, clock: 540, away: 92, home: 85, play: 'Lakers Full timeout', kind: 'Full Timeout' },
  { status: 'live', period: 4, clock: 540, away: 92, home: 85, play: 'Player enters the game for Other Player', kind: 'Substitution' },
  { status: 'live', period: 4, clock: 522, away: 92, home: 87, play: 'Home player makes 12-foot jumper', kind: 'Jump Shot' }, // volta de tempo técnico
  { status: 'live', period: 4, clock: 330, away: 100, home: 92 }, // marcos de jogador (40 pts / triplo-duplo)
  { status: 'live', period: 4, clock: 288, away: 100, home: 97 }, // clutch time
  { status: 'live', period: 4, clock: 190, away: 102, home: 99, play: 'Simulated Player ejected', kind: 'Ejection' }, // ejeção
  { status: 'live', period: 4, clock: 95, away: 104, home: 105 }, // virada
  { status: 'live', period: 4, clock: 0, away: 108, home: 108 }, // empate
  { status: 'end_period', period: 4, clock: 0, away: 108, home: 108 },
  { status: 'live', period: 5, clock: 281, away: 110, home: 108 }, // prorrogação
  { status: 'final', period: 5, clock: 0, away: 118, home: 115 }, // fim do jogo
];

/** Dois jogadores fictícios cujos números crescem com o placar, para disparar os marcos. */
function simPlayers(step: Step, awayId: string, homeId: string): PlayerLine[] {
  const base = { starter: true, played: true, min: 30, stl: 1, blk: 0, fg: '-', threes: '-', ft: '-' };
  return [
    // 40% dos pontos do time: passa de 40 quando o visitante chega a 100
    { ...base, id: 'sim-star', name: 'Sim Scorer', shortName: 'S. Scorer', teamId: awayId, pts: Math.floor(step.away * 0.4), reb: 5, ast: 4 },
    // triplo-duplo quando o mandante passa de 90
    {
      ...base,
      id: 'sim-allround',
      name: 'Sim Allrounder',
      shortName: 'S. Allrounder',
      teamId: homeId,
      pts: Math.floor(step.home / 5),
      reb: Math.floor(step.home / 9),
      ast: Math.floor(step.home / 9),
    },
  ];
}

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
  const firstPlayers = simPlayers({ status: 'scheduled', period: 0, clock: 720, away: 0, home: 0 }, awayTeam.id, homeTeam.id);
  service.simulated.set(id, { game: first, plays: [], players: firstPlayers });
  service.process(first, [], firstPlayers);

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
        scoring: /makes/.test(step.play),
        kind: step.kind,
      });
    }
    const game = build(step);
    const players = simPlayers(step, awayTeam.id, homeTeam.id);
    service.simulated.set(id, { game, plays: [...plays], players });
    await service.process(game, plays, players);
    i++;
    if (i < TIMELINE.length) setTimeout(next, stepSeconds * 1000);
    else setTimeout(() => service.simulated.delete(id), 10 * 60_000);
  };
  setTimeout(next, waitSeconds * 1000);
  return first;
}
