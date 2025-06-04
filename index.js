import express from 'express';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MCP LoL Server is running' });
});

app.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
  
  // Lance le serveur MCP en arrière-plan
  const mcpServer = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: process.env
  });
  
  mcpServer.on('error', (err) => {
    console.error('Failed to start MCP server:', err);
  });
});