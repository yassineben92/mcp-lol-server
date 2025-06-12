import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMCPLoLServer } from './server.js';
import 'dotenv/config'; // Pour s'assurer que les variables d'environnement sont chargées
import cors from 'cors';

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000; // Railway nous donne le port via process.env.PORT

// On crée notre instance de serveur MCP LoL
const mcpLoLServer = createMCPLoLServer();


const sseTransports = {};

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

// Endpoint SSE pour établir la connexion
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  sseTransports[transport.sessionId] = transport;
  res.on('close', () => {
    delete sseTransports[transport.sessionId];
  });
  await mcpLoLServer.connect(transport);
});

// Endpoint pour recevoir les messages du client
app.post('/messages', express.json(), async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = sseTransports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

// Middleware de gestion des erreurs pour éviter les crashs en cas de requête
// interrompue ou de JSON invalide
app.use((err, req, res, next) => {
  console.error('Error handling request:', err.message);
  if (err.type === 'request.aborted') {
    return res.status(400).send('Request aborted');
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).send('Payload too large');
  }
  if (err instanceof SyntaxError) {
    return res.status(400).send('Invalid JSON');
  }
  res.status(500).send('Internal server error');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MCP LoL Server (via HTTP wrapper) running on port ${PORT}`);
  console.log(`Claude.ai integration should be available at /sse`);
  if (!process.env.RIOT_API_KEY) {
    console.warn("ATTENTION: La variable d'environnement RIOT_API_KEY n'est pas définie ! L'outil ne fonctionnera pas.");
  } else {
    console.log("RIOT_API_KEY est bien configurée.");
  }
});
