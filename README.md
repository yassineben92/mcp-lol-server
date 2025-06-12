# MCP LoL Server

This project wraps the Model Context Protocol server with an Express HTTP interface for easy deployment on platforms like Railway.

## Running locally

```bash
npm install
npm start
```

The server exposes a health check at `/health` and provides an SSE endpoint at `/sse` for MCP clients.
