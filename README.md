# TSR Gold Intelligence Engine

Nouvelle application V1 pour analyser XAUUSD autour d'un graphique TradingView officiel, avec le branding TSR Gold Intelligence Engine.

## Lancer l'application

Ouvrir `index.html` dans un navigateur moderne.

## Backend local

Le dossier `tsr-data-api` contient une API Node.js locale separee pour lire les donnees XAUUSD depuis le stockage local configure par `TSR_DATA_DIR`.

```powershell
cd D:\goldtradetsr\tsr-data-api
$env:TSR_DATA_API_KEY="votre-cle-locale"
$env:TSR_DATA_DIR="J:\tsr-trading-data"
$env:PORT="4000"
npm start
```

Routes disponibles: `GET /health`, `GET /history`, `GET /replay`, `GET /signals`, `POST /logs`.

## Connexion TSR Data API

Le frontend Vercel passe par `/api/tsr-data`, qui ajoute la cle API cote serveur et evite d'exposer `TSR_DATA_API_KEY` dans le navigateur.

Variables Vercel requises :

```text
NEXT_PUBLIC_TSR_DATA_API_URL=https://votre-tunnel-cloudflare
TSR_DATA_API_KEY=votre-cle-locale
```

Les donnees lourdes ne sont pas stockees sur Vercel : historique, replay, signaux et logs passent par TSR Data API.

Si `/replay` et `/history` repondent correctement mais sans bougies pour la date choisie, l'interface active un replay d'entrainement local afin de garder les controles utilisables. Quand l'API est indisponible, le replay affiche le message de blocage demande et ne masque pas l'erreur.

## Ce que contient la V1

- Graphique TradingView `OANDA:XAUUSD` visible au centre.
- Logo TSR intégré dans l'en-tête et utilisé comme favicon.
- Timeframes H4, H1, M30, M15, M5, M1 et 30s.
- Panneaux modulables, mode graphique large et plein écran.
- Indicateurs Smart Money activables: Order Blocks, FVG, Equal High/Low, Liquidity Sweep, BOS, ChoCH, trendlines, sessions, previous high/low et zones d'entrée.
- Indicateurs classiques activables séparément: EMA 20, EMA 50, EMA 200, VWAP, SuperTrend, Volume et RSI 14 avec niveaux 30/50/70.
- Tableau de décision avec score 0-100, blocs de validation, raison exacte d'attente et niveaux de setup.
- Deux modes d'analyse cliquables:
  - TSR Smart Money: analyse rapide et réactive.
  - TSR Gold Intelligence: couche stricte au-dessus du Mode 1 avec H1, OB H1, raffinement M15 et confirmations avancées.
- Option pour afficher les deux analyses côte à côte.
- Mode Replay historique avec date, timeframe, Play/Pause, avance/recul bougie, vitesse x1/x2/x5/x10 et journal des signaux.
- Le replay analyse uniquement les bougies déjà révélées à l'instant rejoué, sans utiliser les bougies futures.
- Chargement quotidien des news USD critiques via cache local quand le flux public est disponible.

## Note technique

Le widget TradingView est la référence visuelle en temps réel. Les overlays applicatifs sont rendus au-dessus du widget, car l'iframe TradingView public ne permet pas d'injecter des dessins ou de lire directement les bougies. Pour transformer cette V1 en moteur de signal totalement réel, il faudra brancher un flux OHLC XAUUSD exploitable par l'application ou la bibliothèque officielle TradingView Advanced Charts avec licence.
