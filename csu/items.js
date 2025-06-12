import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
// Assuming parseItemStatsFromString is exported from itemStatsParser.js
// We'll need to import it when we use getProcessedItemData in a context where the parser is also imported.

// Determine directory name for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let rawItemDataStore = null;

/**
 * Loads the item data from the JSON file.
 * This function is called internally to populate the rawItemDataStore.
 * @returns {Promise<object>} A promise that resolves to the parsed item data.
 */
async function loadRawItemData() {
  if (!rawItemDataStore) {
    try {
      const itemsFilePath = path.join(__dirname, '..', 'data', 'items.json');
      const jsonData = await readFile(itemsFilePath, 'utf-8');
      rawItemDataStore = JSON.parse(jsonData);
    } catch (error) {
      console.error('Failed to load or parse items.json:', error);
      rawItemDataStore = {}; // Fallback to an empty object
      throw error; // Re-throw
    }
  }
  return rawItemDataStore;
}

/**
 * Retrieves and processes data for a specific item.
 *
 * @param {string} itemId - The ID of the item (e.g., "3006" for Berserker's Greaves).
 * @param {function} itemStatsParserFunc - The `parseItemStatsFromString` function from itemStatsParser.js.
 * @returns {Promise<object|null>} A promise that resolves to the processed item data or null if not found/error.
 * Processed data includes name, ID, parsed stats from description, and direct stats from the .stats object.
 */
export async function getProcessedItemData(itemId, itemStatsParserFunc) {
  try {
    const allRawItems = await loadRawItemData();
    const rawItem = allRawItems ? allRawItems[itemId] : null;

    if (!rawItem) {
      console.warn(`Item data for ID "${itemId}" not found.`);
      return null;
    }

    if (typeof itemStatsParserFunc !== 'function') {
        console.error('itemStatsParserFunc is not a function. Cannot parse item stats from description.');
        // Proceed without parsing from description, or handle error as preferred
        // For now, we'll just use the direct stats.
    }

    let parsedDescriptionStats = {};
    if (rawItem.description && typeof itemStatsParserFunc === 'function') {
      parsedDescriptionStats = itemStatsParserFunc(rawItem.description);
    }

    // Combine stats from the item's ".stats" object and those parsed from the description.
    // For now, let's assume they don't usually overlap in a conflicting way,
    // or that parsedDescriptionStats might be more comprehensive for what we're trying to capture.
    // A more sophisticated merge might be needed if conflicts are common.
    // For example, if rawItem.stats has { FlatMovementSpeedMod: 45 } and description also yields this,
    // we'd want to ensure it's not double-counted or overwritten incorrectly.
    // Current parser gives { FlatMovementSpeedMod: 45 } from "+45 Movement Speed".
    // Let's give precedence to explicitly defined rawItem.stats if keys are identical.
    const combinedStats = { ...parsedDescriptionStats, ...rawItem.stats };


    return {
      id: itemId,
      name: rawItem.name,
      description: rawItem.description, // Keep original description for reference
      plaintext: rawItem.plaintext,     // Short description
      tags: rawItem.tags || [],
      gold: rawItem.gold, // Will be undefined if not in JSON, but schema expects it
      from: rawItem.from || [], // Component items
      into: rawItem.into || [], // Builds into
      // Stats directly from the item's "stats" object (often more reliable for primary stats)
      directStats: rawItem.stats || {},
      // Stats parsed from the description string
      parsedDescriptionStats: parsedDescriptionStats,
      // Combined stats (simple merge, directStats may overwrite parsedDescriptionStats if keys clash)
      // A better approach would be to sum them if they represent different sources of the same stat,
      // or define clear precedence. For now, simple override by directStats.
      // Let's refine the combination: start with parsed, then overlay with direct.
      // If a stat is ONLY in description (e.g. +X% Attack Speed), it's kept.
      // If a stat is in both (e.g. FlatMovementSpeedMod from boots), directStats is usually the canonical one.
      finalStats: combinedStats,
    };
  } catch (error) {
    // Error already logged by loadRawItemData if it's a loading issue
    console.error(`Error processing item ID "${itemId}":`, error);
    return null;
  }
}

/**
 * Utility function to get all loaded raw item data.
 * @returns {Promise<object|null>} All raw item data or null on error.
 */
export async function getAllRawItemData() {
    try {
        return await loadRawItemData();
    } catch (error) {
        return null;
    }
}


// Example Usage (requires parseItemStatsFromString from itemStatsParser.js)
// import { parseItemStatsFromString } from './itemStatsParser.js';
//
// async function testItems() {
//   const berserkersGreaves = await getProcessedItemData("3006", parseItemStatsFromString);
//   console.log("Berserker's Greaves:", berserkersGreaves);
//
//   const krakenSlayer = await getProcessedItemData("6672", parseItemStatsFromString);
//   console.log("Kraken Slayer:", krakenSlayer);
//
//   const infinityEdge = await getProcessedItemData("3031", parseItemStatsFromString);
//   console.log("Infinity Edge:", infinityEdge);
//
//   // Test with an item that might not be in a minimal items.json
//   const nonExistentItem = await getProcessedItemData("0000", parseItemStatsFromString);
//   console.log("Non-existent Item:", nonExistentItem);
// }
//
// testItems().catch(console.error);
