# Signal Sprint

A live multiplayer free-for-all party game for separate devices.

## Game Flow

1. One player creates a room and shares the room code or invite link.
2. At least two players join from their own devices.
3. The host starts four rounds:
   - Spot the Signal: tap the true answer fastest.
   - Answer Storm: type as many valid answers as possible.
   - Combo Lock: choose the exact correct set of items.
   - Letter Dash: drag across letters in order to find hidden words.
4. If first place is tied after round four, Sudden Signal starts as a tiebreaker.
5. The final scoreboard declares the winner or shared victory.

## Multiplayer

The hosted worker exposes room APIs and uses the `DB` D1 binding when available, with an in-memory fallback for local tests. Players poll the room state so phones and laptops stay synchronized without installing anything.

## Local Checks

```sh
npm test
npm run build
```

The build output is written to `dist/` for Sites-style hosting: `dist/client` contains the browser app, `dist/server/index.js` contains the worker, and `dist/.openai/hosting.json` declares the `DB` binding.
