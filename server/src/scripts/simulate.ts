// Inicia um jogo simulado no servidor que já está rodando.
// Uso: npm run simulate -w server -- [VISITANTE] [MANDANTE] [segundos-por-passo]
const [awayAbbr = 'LAL', homeAbbr = 'BOS', step = '5'] = process.argv.slice(2);
const url = process.env.API_URL ?? 'http://localhost:3000';

const res = await fetch(`${url}/dev/simulate`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ awayAbbr, homeAbbr, stepSeconds: Number(step) }),
});
const data = await res.json();
console.log(data);
console.log('O jogo aparece na lista do app em "Hoje". Ligue o sino nos próximos 20 segundos.');

export {};
