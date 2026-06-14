# TSR Gold Intelligence Engine

Nouvelle application V1 pour analyser XAUUSD autour d'un graphique TradingView officiel, avec le branding TSR Gold Intelligence Engine.

## Lancer l'application

Ouvrir `index.html` dans un navigateur moderne.

## Ce que contient la V1

- Graphique TradingView `OANDA:XAUUSD` visible au centre.
- Logo TSR intégré dans l'en-tête et utilisé comme favicon.
- Timeframes H4, H1, M30, M15, M5, M1 et 30s.
- Panneaux modulables, mode graphique large et plein écran.
- Overlays activables: Order Blocks, FVG, Equal High/Low, Liquidity Sweep, BOS, ChoCH, trendlines, sessions, previous high/low, zones d'entrée, SL/TP et scénarios.
- Tableau de décision avec score 0-100, blocs de validation, raison exacte d'attente et niveaux de setup.
- Chargement quotidien des news USD critiques via cache local quand le flux public est disponible.

## Note technique

Le widget TradingView est la référence visuelle en temps réel. Les overlays applicatifs sont rendus au-dessus du widget, car l'iframe TradingView public ne permet pas d'injecter des dessins ou de lire directement les bougies. Pour transformer cette V1 en moteur de signal totalement réel, il faudra brancher un flux OHLC XAUUSD exploitable par l'application ou la bibliothèque officielle TradingView Advanced Charts avec licence.
