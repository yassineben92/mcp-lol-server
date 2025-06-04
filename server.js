#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const REGION = 'euw1'; // Change selon ta région

// Configuration des versions (à mettre à jour régulièrement)
const CURRENT_VERSION = '14.24.1';
const DDRAGON_URL = `https://ddragon.leagueoflegends.com/cdn/${CURRENT_VERSION}`;

class LoLMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'lol-optimizer',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    
    // Cache pour éviter de spam l'API
    this.cache = {
      champions: null,
      items: null,
      runes: null,
      lastUpdate: 0
    };
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_champion_data',
          description: 'Récupère les données détaillées d\'un champion',
          inputSchema: {
            type: 'object',
            properties: {
              championName: {
                type: 'string',
                description: 'Nom du champion (ex: Yasuo, Ahri)',
              },
            },
            required: ['championName'],
          },
        },
        {
          name: 'get_optimal_build',
          description: 'Calcule le build optimal pour un champion contre une composition donnée',
          inputSchema: {
            type: 'object',
            properties: {
              championName: {
                type: 'string',
                description: 'Nom du champion',
              },
              enemyTeam: {
                type: 'array',
                description: 'Liste des champions ennemis',
                items: { type: 'string' }
              },
              gamePhase: {
                type: 'string',
                description: 'Phase du jeu: early, mid, late',
                enum: ['early', 'mid', 'late']
              },
            },
            required: ['championName'],
          },
        },
        {
          name: 'analyze_matchup',
          description: 'Analyse un matchup spécifique entre deux champions',
          inputSchema: {
            type: 'object',
            properties: {
              yourChampion: {
                type: 'string',
                description: 'Ton champion',
              },
              enemyChampion: {
                type: 'string',
                description: 'Champion ennemi',
              },
            },
            required: ['yourChampion', 'enemyChampion'],
          },
        },
        {
          name: 'get_all_items',
          description: 'Récupère tous les items du jeu avec leurs stats',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.tool.name) {
        case 'get_champion_data':
          return await this.getChampionData(request.params.tool.arguments);
        case 'get_optimal_build':
          return await this.getOptimalBuild(request.params.tool.arguments);
        case 'analyze_matchup':
          return await this.analyzeMatchup(request.params.tool.arguments);
        case 'get_all_items':
          return await this.getAllItems();
        default:
          throw new Error(`Unknown tool: ${request.params.tool.name}`);
      }
    });
  }

  async loadGameData() {
    const now = Date.now();
    // Cache de 1 heure
    if (now - this.cache.lastUpdate < 3600000 && this.cache.champions) {
      return;
    }

    try {
      // Charger les champions
      const championsResponse = await axios.get(`${DDRAGON_URL}/data/fr_FR/champion.json`);
      this.cache.champions = championsResponse.data.data;

      // Charger les items
      const itemsResponse = await axios.get(`${DDRAGON_URL}/data/fr_FR/item.json`);
      this.cache.items = itemsResponse.data.data;

      // Charger les runes
      const runesResponse = await axios.get(`${DDRAGON_URL}/data/fr_FR/runesReforged.json`);
      this.cache.runes = runesResponse.data;

      this.cache.lastUpdate = now;
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }

  async getChampionData({ championName }) {
    await this.loadGameData();
    
    // Trouver le champion (insensible à la casse)
    const champion = Object.values(this.cache.champions).find(
      champ => champ.name.toLowerCase() === championName.toLowerCase() ||
               champ.id.toLowerCase() === championName.toLowerCase()
    );

    if (!champion) {
      return {
        content: [
          {
            type: 'text',
            text: `Champion "${championName}" non trouvé. Vérifie l'orthographe.`,
          },
        ],
      };
    }

    // Charger les données détaillées du champion
    try {
      const detailResponse = await axios.get(
        `${DDRAGON_URL}/data/fr_FR/champion/${champion.id}.json`
      );
      const detailedData = detailResponse.data.data[champion.id];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              name: detailedData.name,
              title: detailedData.title,
              stats: detailedData.stats,
              abilities: {
                passive: detailedData.passive,
                Q: detailedData.spells[0],
                W: detailedData.spells[1],
                E: detailedData.spells[2],
                R: detailedData.spells[3],
              },
              tips: {
                ally: detailedData.allytips,
                enemy: detailedData.enemytips,
              },
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Erreur lors de la récupération des données: ${error.message}`,
          },
        ],
      };
    }
  }

  async getOptimalBuild({ championName, enemyTeam = [], gamePhase = 'mid' }) {
    await this.loadGameData();

    // Analyse de la composition ennemie
    let enemyStats = {
      totalAD: 0,
      totalAP: 0,
      totalTanks: 0,
      ccCount: 0,
    };

    // Calcul simplifié pour la démo
    const buildRecommendation = {
      core: [],
      situational: [],
      boots: null,
      runes: {
        primary: null,
        secondary: null,
      },
    };

    // Logique de build basique
    if (gamePhase === 'early') {
      buildRecommendation.core = ['Doran\'s Blade', 'Potion de vie'];
    } else if (gamePhase === 'mid') {
      buildRecommendation.core = ['Kraken Slayer', 'Bottes de berserker'];
    } else {
      buildRecommendation.core = ['Kraken Slayer', 'Soif-de-sang', 'Lame d\'infini'];
    }

    // Recommandations contre certains types d'ennemis
    if (enemyTeam.some(champ => ['Zed', 'Talon', 'Yasuo'].includes(champ))) {
      buildRecommendation.situational.push('Plaque du mort');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(buildRecommendation, null, 2),
        },
      ],
    };
  }

  async analyzeMatchup({ yourChampion, enemyChampion }) {
    await this.loadGameData();

    // Analyse basique du matchup
    const analysis = {
      difficulty: 'Medium',
      keyPoints: [
        'Respecte son niveau 6',
        'Trade quand ses sorts sont en CD',
        'Ward les bushes',
      ],
      itemsToRush: ['Hexdrinker si AP', 'Tabi Ninja si AD'],
      winCondition: 'Snowball en early game',
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  async getAllItems() {
    await this.loadGameData();

    // Filtrer les items importants (pas les consommables de base)
    const importantItems = Object.entries(this.cache.items)
      .filter(([id, item]) => item.gold.total > 500 && item.maps['11'])
      .map(([id, item]) => ({
        id,
        name: item.name,
        cost: item.gold.total,
        stats: item.stats,
        description: item.plaintext,
      }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(importantItems, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP LoL Server démarré');
  }
}

const server = new LoLMCPServer();
server.run().catch(console.error);