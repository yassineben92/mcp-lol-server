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

// Import CSU simulation function
import { runAutoAttackSimulation } from './csu/simulation.js';

// CSU Simulation API Endpoint
app.post('/api/csu/simulate', express.json(), async (req, res) => { // Ensure express.json() is used for this route if not globally
  try {
    const { championId, championLevel, itemIds, runeIds } = req.body;

    // --- Input Validation ---
    if (!championId || typeof championId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid championId (must be a string).' });
    }
    if (championLevel === undefined || typeof championLevel !== 'number' || championLevel < 1 || championLevel > 18) {
      return res.status(400).json({ error: 'Missing or invalid championLevel (must be a number between 1 and 18).' });
    }
    if (itemIds !== undefined && !Array.isArray(itemIds)) {
      return res.status(400).json({ error: 'Invalid itemIds (must be an array of strings).' });
    }
    if (itemIds && itemIds.some(id => typeof id !== 'string')) {
        return res.status(400).json({ error: 'Invalid itemIds (array must contain only strings).' });
    }
    if (runeIds !== undefined && !Array.isArray(runeIds)) {
      return res.status(400).json({ error: 'Invalid runeIds (must be an array of strings/numbers).' });
    }
    // Rune IDs can be numbers from the JSON, ensure they are handled if passed as numbers from client.
    // The simulation function expects strings/numbers that can be found in the data.
    // Forcing them to string for consistency if they are numbers.
    const processedRuneIds = runeIds ? runeIds.map(id => String(id)) : [];


    const simulationInput = {
      championId,
      championLevel,
      itemIds: itemIds || [], // Default to empty array if undefined
      runeIds: processedRuneIds, // Default to empty array if undefined
      // maxSimulationTimeInSeconds can be added here if configurable via API
    };

    // --- Run Simulation ---
    const results = await runAutoAttackSimulation(simulationInput);
    return res.status(200).json(results);

  } catch (error) {
    console.error('API /csu/simulate Error:', error);
    // Check for specific error types if runAutoAttackSimulation throws custom errors
    // Based on current simulation.js, errors might be generic.
    if (error.message.toLowerCase().includes("not found") || error.message.toLowerCase().includes("invalid")) {
      return res.status(404).json({ error: error.message }); // Or 400 if it's more like a validation error post-start
    }
    // General server error for other issues
    return res.status(500).json({ error: 'An error occurred during the simulation.', details: error.message });
  }
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
