# MCP LoL Server

This project wraps the Model Context Protocol server with an Express HTTP interface for easy deployment on platforms like Railway.

## Running locally

```bash
npm install
npm start
```

The server exposes a health check at `/health` and provides an SSE endpoint at `/sse` for MCP clients.

## Tools disponibles

Cette instance MCP expose désormais trois outils&nbsp;:

1. **get_champion_stats** – Récupère les statistiques de base d'un champion par son nom.
2. **get_all_items** – Retourne la liste complète des objets ou permet de filtrer par nom ou par tag.
3. **get_all_runes** – Retourne la liste complète des runes disponibles.

### Mode hors ligne

Lors de la première requête, le serveur met en cache les données récupérées auprès de Riot Games.
En cas d'échec ou hors connexion, il se rabat automatiquement sur les fichiers
`data/items.json` et `data/runes.json`. Ainsi, `get_all_items` et `get_all_runes`
fonctionnent même sans accès réseau.
