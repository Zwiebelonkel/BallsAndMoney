# BallsAndMoney

Ein Angular-basiertes Idle-Spiel, in dem Kollisionen zwischen Kugeln Geld erzeugen.

## Entwicklung

```bash
npm install
npm start
```

## Production Build

```bash
npm run build
```

## GitHub Pages Deploy

Der Workflow `.github/workflows/deploy.yml` baut die Angular-App bei Pushes auf `main` und veröffentlicht den Inhalt aus `dist/balls-and-money/browser` über GitHub Pages.
