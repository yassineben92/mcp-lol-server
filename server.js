import { Server, BaseTool } from '@modelcontextprotocol/sdk/server';
import axios from 'axios';
import 'dotenv/config'; // Pour charger les variables d'environnement

// On garde ta clé API Riot
const RIOT_API_KEY = process.env.RIOT_API_KEY;
const RIOT_API_BASE_URL = 'https://euw1.api.riotgames.com'; // Change si tu es sur un autre serveur (ex: na1)

// L'outil pour chercher les stats d'un champion
class ChampionStatsTool extends BaseTool {
    constructor() {
        super({
            name: "get_champion_stats",
            description: "Récupère les statistiques de base d'un champion de League of Legends par son nom.",
            parameters: {
                type: "object",
                properties: {
                    championName: {
                        type: "string",
                        description: "Le nom du champion (ex: Yasuo, Ahri)."
                    }
                },
                required: ["championName"]
            }
        });
    }

    async _call(params) {
        const championName = params.championName;
        if (!RIOT_API_KEY) {
            return "Erreur: RIOT_API_KEY n'est pas configurée.";
        }

        try {
            // D'abord, on récupère la dernière version des données du jeu
            const versionsResponse = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
            const latestVersion = versionsResponse.data[0];

            // Ensuite, on récupère les données de tous les champions pour cette version
            const allChampionsResponse = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
            const championsData = allChampionsResponse.data.data;

            // On cherche le champion par son nom. Il faut être malin car les noms peuvent avoir des capitalisations différentes.
            // Et l'API utilise des "ID" qui sont souvent le nom capitalisé (Yasuo, MissFortune, etc.)
            let championKey = Object.keys(championsData).find(key => key.toLowerCase() === championName.toLowerCase());
            
            // Si on ne trouve pas par nom direct, on peut essayer de matcher l'ID (qui est souvent le nom capitalisé)
            if (!championKey) {
                 championKey = Object.keys(championsData).find(key => championsData[key].id.toLowerCase() === championName.toLowerCase());
            }
            // Cas spéciaux comme "Wukong" qui est "MonkeyKing" dans l'API
            if (championName.toLowerCase() === "wukong") championKey = "MonkeyKing";


            if (!championKey || !championsData[championKey]) {
                return `Champion "${championName}" non trouvé. Vérifie l'orthographe. Noms valides : ${Object.keys(championsData).slice(0,5).join(', ')}...`;
            }

            const champion = championsData[championKey];
            return {
                id: champion.id,
                name: champion.name,
                title: champion.title,
                stats: champion.stats,
                tags: champion.tags,
                blurb: champion.blurb
            };
        } catch (error) {
            console.error("Erreur Riot API:", error.response ? error.response.data : error.message);
            return `Erreur lors de la récupération des stats pour ${championName}. Détails: ${error.message}`;
        }
    }
}

// On crée une fonction qui fabrique notre serveur MCP.
// Ca nous permettra de l'utiliser dans app.js
export function createMCPLoLServer() {
    const server = new Server({
        tools: [new ChampionStatsTool()],
        // Tu pourras ajouter d'autres outils ici
    });
    return server;
}

// On retire la partie qui démarrait le serveur automatiquement ici,
// car c'est app.js qui va s'en charger.
// console.log("MCP LoL Server (version module) prêt à être utilisé par app.js");