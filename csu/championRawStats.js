import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Determine directory name for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let rawChampionDataStore = null;

/**
 * Loads the champion data from the JSON file.
 * This function is called internally to populate the rawChampionDataStore.
 * @returns {Promise<object>} A promise that resolves to the parsed champion data.
 */
async function loadRawChampionData() {
  if (!rawChampionDataStore) {
    try {
      // Construct the path relative to the current file's directory
      const championsFilePath = path.join(__dirname, '..', 'data', 'champions.json');
      const jsonData = await readFile(championsFilePath, 'utf-8');
      rawChampionDataStore = JSON.parse(jsonData);
    } catch (error) {
      console.error('Failed to load or parse champions.json:', error);
      // Fallback to an empty object or throw, depending on desired error handling
      rawChampionDataStore = {};
      throw error; // Re-throw to make it clear loading failed
    }
  }
  return rawChampionDataStore;
}

/**
 * Retrieves the raw static data for a specific champion.
 * Loads data on first call.
 * @param {string} championId - The ID of the champion (e.g., "Ahri", "Yasuo"). Case-sensitive.
 * @returns {Promise<object|null>} A promise that resolves to the champion's data object, or null if not found or error.
 */
export async function getRawChampionData(championId) {
  try {
    const data = await loadRawChampionData();
    if (data && data[championId]) {
      return data[championId];
    } else {
      console.warn(`Champion data for ID "${championId}" not found.`);
      return null;
    }
  } catch (error) {
    // Error already logged by loadRawChampionData
    return null;
  }
}

/**
 * Utility function to get all loaded raw champion data.
 * Useful for scenarios where you need to iterate over all champions.
 * @returns {Promise<object|null>} A promise that resolves to all champion data, or null if an error occurs.
 */
export async function getAllRawChampionData() {
  try {
    return await loadRawChampionData();
  } catch (error) {
    return null;
  }
}

// Pre-load data if needed, or let it load lazily on first getRawChampionData call
// loadRawChampionData().catch(err => console.error("Initial champion data load failed:", err));
