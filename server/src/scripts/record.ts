// Grava o placar e os lances dos jogos ao vivo a cada 30s, para virar fixture de teste.
// Uso: npm run record -w server
import { mkdirSync, writeFileSync } from 'node:fs';
import { currentGameDay } from '../espn';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const date = currentGameDay();
const dir = new URL(`../../recordings/${date}/`, import.meta.url).pathname;
mkdirSync(dir, { recursive: true });

async function snapshot() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const board = await (await fetch(`${BASE}/scoreboard?dates=${date}`)).json();
  writeFileSync(`${dir}${stamp}-scoreboard.json`, JSON.stringify(board));
  const live = (board.events ?? []).filter((e: any) => e.status?.type?.state === 'in');
  for (const e of live) {
    const sum = await (await fetch(`${BASE}/summary?event=${e.id}`)).json();
    writeFileSync(`${dir}${stamp}-summary-${e.id}.json`, JSON.stringify(sum));
  }
  console.log(`${stamp}: ${live.length} jogo(s) ao vivo gravado(s)`);
}

await snapshot();
setInterval(() => snapshot().catch((e) => console.error(e.message)), 30_000);
