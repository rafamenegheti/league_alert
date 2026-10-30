# League Alert

App iOS (Expo/React Native) que mostra os jogos da NBA ao vivo e avisa a hora de voltar a assistir.

**Alertas** (cada um pode ser ligado/desligado no app):

- Voltar a assistir: lembrete 15 min antes do jogo, início do jogo, intervalo acabando (~2 min antes),
  volta do intervalo, volta entre quartos, volta de tempo técnico, início de prorrogação.
- Momentos do jogo: clutch time, virada ou empate nos 2 min finais, corrida de 10 pontos seguidos,
  marcos de jogador (40/50 pontos, triplo-duplo), ejeção, fim de jogo.

**Notificações:** modo sem spoiler (sem placar no push) e atraso do stream (segura o push para chegar
junto com a sua transmissão). Textos em português ou inglês, conforme o idioma do iPhone.

**App:** lista de jogos do dia, detalhe com placar por quarto, box score e últimos lances,
times favoritos e widget da tela inicial (pequeno, médio e grande).

```
shared/   tipos usados pelo servidor e pelo app
server/   Node + Fastify: lê a ESPN, detecta eventos, manda push
app/      Expo (SDK 58) + expo-router
```

## Rodar

Servidor (porta 3000):

```bash
npm run server
```

App no Simulador (primeira vez demora; depois só `npm start -w app` se não mudou nada nativo):

```bash
cd app && LANG=en_US.UTF-8 npx expo run:ios
```

Testes do servidor:

```bash
npm test
```

## Testar notificações

- **Push de teste:** aba Alertas → "Enviar notificação de teste".
- **Jogo simulado:** aba Alertas → "Simular um jogo inteiro", ou
  `npm run simulate -w server -- GS NY 5` (visitante, mandante, segundos por fase).
  Ligue o sino no jogo "SIM" antes de ele começar.

## Como o push funciona hoje (sem conta Apple paga)

O servidor entrega o push no Simulador com `xcrun simctl push`, sem passar pela Apple.
Por isso o app está com `enableRemoteNotifications: false` em `app/app.json`.

Para usar no iPhone de verdade (precisa da conta Apple Developer):

1. `enableRemoteNotifications: true` no `app/app.json` e `npx expo prebuild --clean`.
2. Registrar o token de push do aparelho (`getDevicePushTokenAsync`) no `POST /devices`.
3. Implementar `server/src/notifier/apns.ts` (HTTP/2 + chave .p8) e plugar em `PushDispatcher`.
4. Hospedar o servidor fora do Mac (Fly.io, Railway…).

## Idiomas

O app segue o idioma do iPhone: português (qualquer variante) ou inglês (qualquer outro idioma).

- Textos do app: `app/src/lib/i18n.ts`.
- Textos das notificações: `server/src/messages.ts`. O app informa o idioma ao servidor
  ao abrir, e cada aparelho recebe o push no seu idioma.
- Para testar em inglês no Simulador sem mudar o sistema:
  `xcrun simctl launch booted com.rafael.leaguealert -AppleLanguages "(en)"`

## Widget

Usa o `expo-widgets` (`app/src/widgets/GamesWidget.tsx`). O app envia os jogos para o widget sempre que
atualiza a lista; com o app fechado, o widget mostra a última atualização (o horário aparece no canto).
No iPhone de verdade o widget precisa de App Group, que exige a conta Apple Developer paga.

## Fonte dos dados

API pública (não oficial) da ESPN. Todo o parse fica em `server/src/espn.ts`.
