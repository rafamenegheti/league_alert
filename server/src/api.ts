import Fastify from 'fastify';
import { toLang, type AlertPrefs, type GamesResponse, type RegisterDeviceBody } from '@league-alert/shared';
import type { Db } from './db';
import { currentGameDay } from './espn';
import { groupByLang, type GameService } from './games';
import { testMessage } from './messages';
import type { Notifier } from './notifier';
import { startSimulation, type SimulationOptions } from './simulation';

export function buildApi(db: Db, games: GameService, notifier: Notifier) {
  const app = Fastify({ logger: { level: 'warn' } });

  const requireDevice = (id: string) => {
    const d = db.getDevice(id);
    if (!d) throw Object.assign(new Error('Device not registered'), { statusCode: 404 });
    return d;
  };

  app.get('/health', async () => ({ ok: true }));

  app.get<{ Querystring: { date?: string } }>('/games', async (req): Promise<GamesResponse> => {
    const date = req.query.date && /^\d{8}$/.test(req.query.date) ? req.query.date : currentGameDay();
    return { date, games: await games.getGames(date) };
  });

  app.get<{ Params: { id: string } }>('/games/:id', async (req) => games.getDetail(req.params.id));

  app.get('/teams', async () => games.getTeams());

  app.post<{ Body: RegisterDeviceBody }>('/devices', async (req) => {
    const { deviceId, platform, pushToken = null, lang } = req.body;
    if (!deviceId || (platform !== 'simulator' && platform !== 'ios')) {
      throw Object.assign(new Error('deviceId and platform are required'), { statusCode: 400 });
    }
    db.registerDevice(deviceId, platform, pushToken, toLang(lang));
    return db.getDevice(deviceId);
  });

  app.get<{ Params: { id: string } }>('/devices/:id', async (req) => requireDevice(req.params.id));

  app.put<{ Params: { id: string }; Body: { teamIds: string[] } }>('/devices/:id/favorites', async (req) => {
    requireDevice(req.params.id);
    db.setFavorites(req.params.id, req.body.teamIds ?? []);
    return db.getDevice(req.params.id);
  });

  app.put<{ Params: { id: string; gameId: string } }>('/devices/:id/games/:gameId', async (req) => {
    requireDevice(req.params.id);
    db.setGameSub(req.params.id, req.params.gameId, true);
    return db.getDevice(req.params.id);
  });

  app.delete<{ Params: { id: string; gameId: string } }>('/devices/:id/games/:gameId', async (req) => {
    requireDevice(req.params.id);
    db.setGameSub(req.params.id, req.params.gameId, false);
    return db.getDevice(req.params.id);
  });

  app.put<{ Params: { id: string }; Body: { prefs: Partial<AlertPrefs> } }>('/devices/:id/prefs', async (req) => {
    requireDevice(req.params.id);
    db.setPrefs(req.params.id, req.body.prefs ?? {});
    return db.getDevice(req.params.id);
  });

  // ---------- rotas de desenvolvimento ----------

  app.post<{ Body: { deviceId?: string } }>('/dev/test-push', async (req) => {
    const devices = req.body?.deviceId ? db.allDevices().filter((d) => d.id === req.body.deviceId) : db.allDevices();
    const list = await games.getGames();
    const gameId = list[0]?.id ?? 'test';
    for (const [lang, group] of groupByLang(devices)) {
      await notifier.send(group, { ...testMessage(lang), data: { gameId, alertType: 'test' } });
    }
    return { sentTo: devices.length, gameId };
  });

  app.post<{ Body: SimulationOptions }>('/dev/simulate', async (req) => {
    const game = startSimulation(games, await games.getTeams(), req.body ?? {});
    return { gameId: game.id, matchup: `${game.away.abbr} x ${game.home.abbr}` };
  });

  return app;
}
