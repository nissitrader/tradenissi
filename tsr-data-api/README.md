# tsr-data-api

Backend Node.js local pour lire les donnees TSR depuis `J:\tsr-trading-data` sans exposer le disque directement.

## Lancer

Depuis `D:\goldtradetsr\tsr-data-api` :

```powershell
$env:TSR_DATA_API_KEY="votre-cle-locale"
$env:TSR_DATA_DIR="J:\tsr-trading-data"
$env:PORT="4000"
npm start
```

## Securite

- Toutes les routes applicatives exigent le header `x-api-key`.
- CORS est limite a `https://tradenissi.vercel.app`.
- Les reponses et erreurs ne renvoient jamais le chemin disque local.
- Les fichiers sont resolus par candidats internes controles, jamais via un chemin fourni par l'utilisateur.

## Endpoints

- `GET /health`
- `GET /history?symbol=XAUUSD&timeframe=M15&date=2026-06-14&limit=500`
- `GET /replay?symbol=XAUUSD&timeframe=M15&date=2026-06-14`
- `GET /signals?date=2026-06-14&mode=TSR%20Smart%20Money`
- `POST /logs`

Formats lus automatiquement quand disponibles : JSON, JSONL, CSV.
