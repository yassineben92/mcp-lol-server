import express from 'express';
import { createSseHandler } from '@modelcontextprotocol/sdk/server';
import { createMCPLoLServer } from './server.js'; // On importe notre fonction depuis server.js
import 'dotenv/config'; // Pour s'assurer que les variables d'environnement sont chargées

const app = express();
const PORT = process.env.PORT || 3000; // Railway nous donne le port via process.env.PORT

// On crée notre instance de serveur MCP LoL
const mcpLoLServer = createMCPLoLServer();

// On crée le "handler" SSE pour notre serveur MCP
// Ce handler va gérer la communication spéciale que Claude attend sur /sse
const sseHandler = createSseHandler(mcpLoLServer);

// Route pour le health check (pour que Railway soit content)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'MCP LoL Server is healthy' });
});

// Route racine, juste pour dire bonjour
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'MCP LoL Server - HTTP interface. Claude.ai integration is at /sse',
    instructions: 'Connect Claude.ai to the /sse endpoint of this URL.'
  });
});

// LA ROUTE MAGIQUE POUR CLAUDE : /sse
// On dit à Express d'utiliser notre sseHandler pour toutes les requêtes sur /sse
app.all('/sse', sseHandler); // .all pour GET, POST, etc.

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MCP LoL Server (via HTTP wrapper) running on port ${PORT}`);
  console.log(`Claude.ai integration should be available at /sse`);
  if (!process.env.RIOT_API_KEY) {
    console.warn("ATTENTION: La variable d'environnement RIOT_API_KEY n'est pas définie ! L'outil ne fonctionnera pas.");
  } else {
    console.log("RIOT_API_KEY est bien configurée.");
  }
});