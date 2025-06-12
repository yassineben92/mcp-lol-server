import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import axios from 'axios';
import { z } from 'zod';
import 'dotenv/config';
import { readFile } from 'fs/promises';

let cachedChampions = null;

let cachedItems = null;

async function loadChampion(championName) {
  if (!cachedChampions) {
    try {
      const versionsResponse = await axios.get(
        'https://ddragon.leagueoflegends.com/api/versions.json',
      );
      const latestVersion = versionsResponse.data[0];

      const allChampionsResponse = await axios.get(
        `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`,
      );
      cachedChampions = allChampionsResponse.data.data;
    } catch (_) {
      const json = await readFile(
        new URL('./data/champions.json', import.meta.url),
        'utf-8',
      );
      cachedChampions = JSON.parse(json);
    }
  }

  let championKey = Object.keys(cachedChampions).find(
    (key) => key.toLowerCase() === championName.toLowerCase(),
  );
  if (!championKey) {
    championKey = Object.keys(cachedChampions).find(
      (key) => cachedChampions[key].id.toLowerCase() === championName.toLowerCase(),
    );
  }
  if (championName.toLowerCase() === 'wukong') championKey = 'MonkeyKing';

  if (!championKey || !cachedChampions[championKey]) {
    return null;
  }

  const basicData = cachedChampions[championKey];

  if (basicData.spells) {
    return basicData;
  }

  try {
    const versionsResponse = await axios.get(
      'https://ddragon.leagueoflegends.com/api/versions.json',
    );
    const latestVersion = versionsResponse.data[0];

    const detailResponse = await axios.get(
      `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion/${championKey}.json`,
    );
    const full = detailResponse.data.data[championKey];
    cachedChampions[championKey] = full;
    return full;
  } catch (_) {
    return basicData;
  }
}

async function loadItems() {
  if (cachedItems) return cachedItems;
  try {
    const versionsResponse = await axios.get(
      'https://ddragon.leagueoflegends.com/api/versions.json',
    );
    const latestVersion = versionsResponse.data[0];

    const itemsResponse = await axios.get(
      `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/item.json`,
    );
    cachedItems = itemsResponse.data.data;
    return cachedItems;
  } catch (_) {
    const json = await readFile(new URL('./data/items.json', import.meta.url), 'utf-8');
    cachedItems = JSON.parse(json);
    return cachedItems;
  }
}

const RIOT_API_KEY = process.env.RIOT_API_KEY;

export function createMCPLoLServer() {
  const server = new McpServer({
    name: 'mcp-lol-server',
    version: '1.0.0',
  });

  /* ------------------------------------------------------------------ */
  /*  TOOL : get_champion_stats                                         */
  /* ------------------------------------------------------------------ */
  server.registerTool(
    'get_champion_stats',
    {
      description:
        "Récupère les statistiques de base d'un champion de League of Legends par son nom.",
      inputSchema: {
        championName: z.string().describe('Le nom du champion (ex: Yasuo, Ahri).'),
      },
    },
    async ({ championName }) => {
      if (!RIOT_API_KEY) {
        return {
          content: [
            { type: 'text', text: "Erreur : RIOT_API_KEY n'est pas configurée." },
          ],
          isError: true,
        };
      }

      try {
        const champion = await loadChampion(championName);

        if (!champion) {
          return {
            content: [{ type: 'text', text: `Champion "${championName}" non trouvé.` }],
            isError: true,
          };
        }

        const simplifiedSpells = Array.isArray(champion.spells)
          ? champion.spells.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              cooldown: s.cooldown,
              cost: s.cost,
            }))
          : [];

        return {
          content: [{ type: 'text', text: JSON.stringify(champion, null, 2) }],
          structuredContent: {
            id: champion.id,
            name: champion.name,
            title: champion.title,
            stats: champion.stats,
            tags: champion.tags,
            blurb: champion.blurb,
            passive: champion.passive,
            spells: simplifiedSpells,
          },
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Erreur lors de la récupération des stats pour ${championName}. Détails : ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  /* ------------------------------------------------------------------ */
  /*  TOOL : get_all_items                                              */
  /* ------------------------------------------------------------------ */
  server.registerTool(
    'get_all_items',
    {
      description:
        'Récupère la liste complète ou filtrée des objets de League of Legends.',
      inputSchema: {
        query: z.string().optional().describe("Filtre par nom ou identifiant"),
        tag: z.string().optional().describe("Filtre par tag d'objet (Damage, etc.)"),
      },
    },
    async ({ query, tag }) => {
      try {
        const data = await loadItems();
        let entries = Object.entries(data);

        if (query) {
          const q = query.toLowerCase();
          entries = entries.filter(
            ([id, item]) =>
              id.toLowerCase().includes(q) || item.name.toLowerCase().includes(q),
          );
        }

        if (tag) {
          const t = tag.toLowerCase();
          entries = entries.filter(
            ([, item]) =>
              Array.isArray(item.tags) &&
              item.tags.some((tg) => tg.toLowerCase() === t),
          );
        }

        const simplified = entries.map(([id, item]) => ({
          id,
          name: item.name,
          plaintext: item.plaintext,
          description: item.description,
          tags: item.tags,
          stats: item.stats,
        }));

        return {
          content: [{ type: 'text', text: JSON.stringify(simplified, null, 2) }],
          structuredContent: simplified,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Erreur lors de la récupération des objets. Détails : ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  /* ------------------------------------------------------------------ */
  /*  TOOL : get_all_runes                                              */
  /* ------------------------------------------------------------------ */
  server.registerTool(
    'get_all_runes',
    {
      description: 'Récupère la liste complète des runes de League of Legends.',
      inputSchema: {},
    },
    async () => {
      try {
        const versionsResponse = await axios.get(
          'https://ddragon.leagueoflegends.com/api/versions.json',
        );
        const latestVersion = versionsResponse.data[0];

        const runesResponse = await axios.get(
          `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/runesReforged.json`,
        );
        const runes = runesResponse.data;

        return {
          content: [{ type: 'text', text: JSON.stringify(runes, null, 2) }],
          structuredContent: runes,
        };
      } catch (error) {
        // Fallback local
        try {
          const json = await readFile(
            new URL('./data/runes.json', import.meta.url),
            'utf-8',
          );
          const localData = JSON.parse(json);

          return {
            content: [
              {
                type: 'text',
                text:
                  "Données locales utilisées car la récupération depuis l'API a échoué :\n" +
                  JSON.stringify(localData, null, 2),
              },
            ],
            structuredContent: localData,
          };
        } catch (e) {
          return {
            content: [
              {
                type: 'text',
                text: `Erreur lors de la récupération des runes. Détails : ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }
    },
  );

  return server;
}
