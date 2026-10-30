import { buildApi } from './api';
import { BrSchedule } from './brSchedule';
import { Db } from './db';
import { GameService } from './games';
import { PushDispatcher } from './notifier';

const PORT = Number(process.env.PORT ?? 3000);

const db = new Db();
const notifier = new PushDispatcher();
const br = new BrSchedule();
const games = new GameService(db, notifier, br);
const api = buildApi(db, games, notifier, br);

await api.listen({ port: PORT, host: '0.0.0.0' });
console.log(`League Alert rodando em http://localhost:${PORT}`);
br.start();
games.start();

const shutdown = async () => {
  games.stop();
  br.stop();
  await api.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
