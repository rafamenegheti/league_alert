import { buildApi } from './api';
import { Db } from './db';
import { GameService } from './games';
import { PushDispatcher } from './notifier';

const PORT = Number(process.env.PORT ?? 3000);

const db = new Db();
const notifier = new PushDispatcher();
const games = new GameService(db, notifier);
const api = buildApi(db, games, notifier);

await api.listen({ port: PORT, host: '0.0.0.0' });
console.log(`League Alert rodando em http://localhost:${PORT}`);
games.start();

const shutdown = async () => {
  games.stop();
  await api.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
