import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import axios from 'axios';
import { z } from 'zod';
import 'dotenv/config';

const RIOT_API_KEY = process.env.RIOT_API_KEY;

export function createMCPLoLServer() {
  const server = new McpServer({
    name: 'mcp-lol-server',
    version: '1.0.0',
  });

  server.registerTool(
    'get_champion_stats',
    {
      description: "Récupère les statistiques de base d'un champion de League of Legends par son nom.",
      inputSchema: {
        championName: z.string().describe('Le nom du champion (ex: Yasuo, Ahri).'),
      },
    },
    async ({ championName }) => {
      if (!RIOT_API_KEY) {
        return {
          content: [
            { type: 'text', text: "Erreur: RIOT_API_KEY n'est pas configurée." },
          ],
          isError: true,
        };
      }
      try {
        const versionsResponse = await axios.get(
          'https://ddragon.leagueoflegends.com/api/versions.json'
        );
        const latestVersion = versionsResponse.data[0];
        const allChampionsResponse = await axios.get(
          `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`
        );
        const championsData = allChampionsResponse.data.data;

        let championKey = Object.keys(championsData).find(
          (key) => key.toLowerCase() === championName.toLowerCase()
        );
        if (!championKey) {
          championKey = Object.keys(championsData).find(
            (key) => championsData[key].id.toLowerCase() === championName.toLowerCase()
          );
        }
        if (championName.toLowerCase() === 'wukong') championKey = 'MonkeyKing';

        if (!championKey || !championsData[championKey]) {
          return {
            content: [
              {
                type: 'text',
                text: `Champion "${championName}" non trouvé.`,
              },
            ],
            isError: true,
          };
        }

        const champion = championsData[championKey];
        return {
          content: [
            { type: 'text', text: JSON.stringify(champion, null, 2) },
          ],
          structuredContent: {
            id: champion.id,
            name: champion.name,
            title: champion.title,
            stats: champion.stats,
            tags: champion.tags,
            blurb: champion.blurb,
          },
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Erreur lors de la récupération des stats pour ${championName}. Détails: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'get_all_items',
    {
      description:
        'Récupère la liste complète des objets de League of Legends avec leurs statistiques.',
      inputSchema: {},
    },
    async () => {
      try {
        const versionsResponse = await axios.get(
          'https://ddragon.leagueoflegends.com/api/versions.json'
        );
        const latestVersion = versionsResponse.data[0];
        const itemsResponse = await axios.get(
          `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/item.json`
        );
        const items = itemsResponse.data.data;
        return {
          content: [{ type: 'text', text: JSON.stringify(items, null, 2) }],
          structuredContent: items,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Erreur lors de la récupération des objets. Détails: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.registerTool(
    'get_all_runes',
    {
      description: 'Récupère la liste complète des runes de League of Legends.',
      inputSchema: {},
    },
    async () => {
      try {
        const versionsResponse = await axios.get(
          'https://ddragon.leagueoflegends.com/api/versions.json'
        );
        const latestVersion = versionsResponse.data[0];
        const runesResponse = await axios.get(
          `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/runesReforged.json`
        );
        const runes = runesResponse.data;
        return {
          content: [{ type: 'text', text: JSON.stringify(runes, null, 2) }],
          structuredContent: runes,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Erreur lors de la récupération des runes. Détails: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}
