import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
// We'll need to import runeStatsParserFunc when using getProcessedRuneData

// Determine directory name for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let rawRunesDataStore = null; // This will store the array of rune trees

/**
 * Loads the rune data from the JSON file.
 * Assumes the JSON file is an array of rune trees.
 * @returns {Promise<Array<object>>} A promise that resolves to the parsed rune data (array of trees).
 */
async function loadRawRunesData() {
  if (!rawRunesDataStore) {
    try {
      // Assuming the file is named 'runes.json' in the 'data' directory
      const runesFilePath = path.join(__dirname, '..', 'data', 'runes.json');
      const jsonData = await readFile(runesFilePath, 'utf-8');
      rawRunesDataStore = JSON.parse(jsonData);
      if (!Array.isArray(rawRunesDataStore)) {
        console.error('Runes data is not an array. Check runes.json format.');
        rawRunesDataStore = []; // Fallback to empty array
        throw new Error('Rune data format error: Expected an array of rune trees.');
      }
    } catch (error) {
      console.error('Failed to load or parse runes.json:', error);
      rawRunesDataStore = []; // Fallback
      throw error; // Re-throw
    }
  }
  return rawRunesDataStore;
}

/**
 * Finds a specific rune by its ID from the loaded rune trees.
 * @param {number} runeId - The ID of the rune to find.
 * @param {Array<object>} allRuneTrees - The array of all rune trees.
 * @returns {object|null} The rune object if found, otherwise null.
 */
function findRuneById(runeId, allRuneTrees) {
  if (!allRuneTrees || !Array.isArray(allRuneTrees)) {
    return null;
  }
  for (const tree of allRuneTrees) {
    if (tree.slots && Array.isArray(tree.slots)) {
      for (const slot of tree.slots) {
        if (slot.runes && Array.isArray(slot.runes)) {
          const foundRune = slot.runes.find(rune => rune.id === runeId);
          if (foundRune) {
            return foundRune;
          }
        }
      }
    }
  }
  return null;
}


/**
 * Retrieves and processes data for a specific rune.
 * If the rune is identified as a simple stat shard, its stats are parsed.
 *
 * @param {number} runeId - The ID of the rune (e.g., 8112 for Electrocute, or a stat shard ID like 5008).
 * @param {function} runeStatsParserFunc - The `parseRuneStatsFromString` function.
 * @returns {Promise<object|null>} A promise that resolves to the processed rune data or null if not found/error.
 * Processed data includes name, ID, descriptions, and `parsedStats` if it's a stat shard.
 */
export async function getProcessedRuneData(runeId, runeStatsParserFunc) {
  try {
    const allRuneTrees = await loadRawRunesData();
    const rawRune = findRuneById(runeId, allRuneTrees);

    if (!rawRune) {
      console.warn(`Rune data for ID "${runeId}" not found.`);
      return null;
    }

    if (typeof runeStatsParserFunc !== 'function') {
        console.error('runeStatsParserFunc is not a function. Cannot parse rune stats from description.');
    }

    let parsedStats = {};
    // Attempt to parse stats if it's likely a stat shard.
    // Stat shards often have very concise shortDesc. We could also rely on known IDs or a specific 'type' field if available.
    // For now, we'll pass all rune descriptions to the parser, and it will only extract stats if they match shard patterns.
    if (rawRune.shortDesc && typeof runeStatsParserFunc === 'function') {
      parsedStats = runeStatsParserFunc(rawRune.shortDesc);
    } else if (rawRune.longDesc && typeof runeStatsParserFunc === 'function' && Object.keys(parsedStats).length === 0) {
      // Fallback to longDesc if shortDesc parsing yielded nothing, though less common for shards
      parsedStats = runeStatsParserFunc(rawRune.longDesc);
    }

    // Determine if it's a stat shard based on whether stats were successfully parsed.
    // This is an approximation. A more robust way would be to have explicit shard identifiers or known ID ranges.
    const isLikelyStatShard = Object.keys(parsedStats).length > 0;

    return {
      id: rawRune.id,
      key: rawRune.key, // Internal key/name
      name: rawRune.name,
      icon: rawRune.icon,
      shortDesc: rawRune.shortDesc,
      longDesc: rawRune.longDesc,
      isStatShard: isLikelyStatShard, // Mark if we think it's a stat shard
      parsedStats: parsedStats, // Contains stats if it's a simple stat shard and parser was successful
      // treeId: rawRune.treeId, // Would be useful to add if we can determine parent tree
      // slotId: rawRune.slotId, // Would be useful
    };
  } catch (error) {
    // Error already logged by loadRawRunesData if it's a loading issue
    console.error(`Error processing rune ID "${runeId}":`, error);
    return null;
  }
}

/**
 * Utility function to get all loaded raw rune data (all trees).
 * @returns {Promise<Array<object>|null>} All raw rune tree data or null on error.
 */
export async function getAllRawRunesData() {
    try {
        return await loadRawRunesData();
    } catch (error) {
        return null;
    }
}

// Example Usage (requires parseRuneStatsFromString from runeStatsParser.js)
// import { parseRuneStatsFromString } from './runeStatsParser.js';
//
// async function testRunes() {
//   // Assuming Electrocute is in your runes.json snippet
//   const electrocute = await getProcessedRuneData(8112, parseRuneStatsFromString);
//   console.log("Electrocute:", electrocute);
//
//   // Test with a hypothetical stat shard ID (these IDs are examples)
//   // The actual data/runes.json might not have these specific shard structures or IDs.
//   // For this to work, your runes.json needs entries that look like stat shards
//   // and the parseRuneStatsFromString function needs to be able to parse their shortDesc.
//
//   // Example: If you had a rune object in your JSON like:
//   // { "id": 5008, "key": "StatModsAdaptiveForce", "icon": "...", "name": "Adaptive Force", "shortDesc": "+9 Adaptive Force", "longDesc": "..." }
//   // const adaptiveShard = await getProcessedRuneData(5008, parseRuneStatsFromString);
//   // console.log("Adaptive Shard:", adaptiveShard);
//
//   // Example: If you had:
//   // { "id": 5005, "key": "StatModsAttackSpeed", "icon": "...", "name": "Attack Speed", "shortDesc": "+10% Attack Speed", "longDesc": "..." }
//   // const asShard = await getProcessedRuneData(5005, parseRuneStatsFromString);
//   // console.log("AS Shard:", asShard);
//
//   // Test a non-existent rune
//   const nonExistentRune = await getProcessedRuneData(0, parseRuneStatsFromString);
//   console.log("Non-existent Rune:", nonExistentRune);
// }
//
// testRunes().catch(console.error);
