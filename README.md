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
2. **get_all_items** – Retourne la liste complète des objets de League of Legends avec leurs statistiques.
3. **get_all_runes** – Retourne la liste complète des runes disponibles.

### Mode hors ligne

Si l'API Riot Games n'est pas accessible, le serveur utilise les fichiers
`data/items.json` et `data/runes.json` pour répondre aux requêtes
`get_all_items` et `get_all_runes`. Cela garantit que les données restent
disponibles même sans connexion réseau.
