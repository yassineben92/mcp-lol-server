import { getRawChampionData, getAllRawChampionData } from './championRawStats.js';
import { Champion } from './champion.js';
import { getProcessedItemData, getAllRawItemData } from './items.js'; // getAllRawItemData might be useful
import { parseItemStatsFromString } from './itemStatsParser.js';
import { getProcessedRuneData, getAllRawRunesData } from './runes.js'; // getAllRawRunesData for consistency
import { parseRuneStatsFromString } from './runeStatsParser.js';
import { aggregateItemStats, aggregateRuneStats, calculateFinalChampionStats } from './statAggregator.js';
import { StandardizedTargetV1 } from './target.js';
import {
  calculateAttackTimer,
  calculateDamageMultiplier,
  calculateEffectiveArmor,
  getCritDamageMultiplier,
  convertLethalityToFlatPen
} from './combatFormulas.js';

/**
 * Runs a basic auto-attack simulation for a given champion configuration against a standardized target.
 *
 * @param {object} simulationInput - The input parameters for the simulation.
 * @param {string} simulationInput.championId - ID of the champion.
 * @param {number} simulationInput.championLevel - Level of the champion.
 * @param {string[]} [simulationInput.itemIds=[]] - Array of item IDs.
 * @param {string[]} [simulationInput.runeIds=[]] - Array of rune IDs (primarily for stat shards).
 * @param {number} [simulationInput.maxSimulationTimeInSeconds=60] - Maximum duration for the simulation.
 * @returns {Promise<object>} A promise that resolves to an object containing simulation results:
 *                            { ttk, dps, totalDamageDealt, attackCount, finalChampionStats, targetFinalHealth, simulationTimeTaken }
 */
export async function runAutoAttackSimulation(simulationInput) {
  const {
    championId,
    championLevel,
    itemIds = [],
    runeIds = [],
    maxSimulationTimeInSeconds = 60,
  } = simulationInput;

  if (!championId || !championLevel) {
    throw new Error("Champion ID and Level are required for simulation.");
  }

  try {
    // --- Initialization ---
    const rawChampionInfo = await getRawChampionData(championId); // Specific champion's raw data
    if (!rawChampionInfo) {
      throw new Error(`Raw data for champion ${championId} not found.`);
    }
    // For item/rune processing, we pass the raw data collections if needed by getProcessedItem/RuneData
    // However, our current getProcessedItemData and getProcessedRuneData load their own raw data.
    // To avoid multiple loads, it's better if they can accept raw data as a parameter.
    // For now, will rely on their internal loading. This can be optimized later.

    const champion = new Champion(championId, championLevel, rawChampionInfo);
    const championBaseStats = champion.getBaseStatsAtLevel();

    // Stat Aggregation
    // The getProcessedItemData/RuneData functions currently load their own data.
    // This is not ideal for `aggregateItemStats` which might call them repeatedly.
    // Let's adjust the lambda to pass the full data set if the processing functions supported it.
    // For now, the provided structure of aggregateItemStats expects a function that takes an ID and a parser.
    // The current getProcessedItemData is `(itemId, itemStatsParserFunc)`
    // We need to ensure `itemStatsParserFunc` is correctly passed.
    const totalItemStats = await aggregateItemStats(itemIds, getProcessedItemData, parseItemStatsFromString);
    const totalRuneStats = await aggregateRuneStats(runeIds, getProcessedRuneData, parseRuneStatsFromString);

    const finalChampionStats = calculateFinalChampionStats(championBaseStats, totalItemStats, totalRuneStats);

    // Target Setup (make a mutable copy)
    const target = {
        ...StandardizedTargetV1,
        stats: { ...StandardizedTargetV1.stats } // Deep copy stats for modification
    };
    const initialTargetHealth = target.stats.hp;


    // Simulation Variables
    let currentTime = 0;
    let totalDamageDealt = 0;
    let attackCount = 0;
    const attackTimer = calculateAttackTimer(finalChampionStats.attackSpeed);

    if (attackTimer === Infinity) { // Cannot attack
        return {
            ttk: null,
            dps: 0,
            totalDamageDealt: 0,
            attackCount: 0,
            finalChampionStats,
            targetFinalHealth: target.stats.hp,
            simulationTimeTaken: 0,
            remarks: "Champion cannot attack (zero or invalid attack speed)."
        };
    }

    // --- Simulation Loop ---
    while (target.stats.hp > 0 && currentTime < maxSimulationTimeInSeconds) {
      // 1. Calculate Damage for one auto-attack
      const baseADForAttack = finalChampionStats.ad; // AD is already final AD
      const isCrit = Math.random() < finalChampionStats.critChance;
      const critMultiplier = isCrit ? getCritDamageMultiplier(finalChampionStats.bonusCritDamagePercent) : 1;
      const damageBeforeMitigation = baseADForAttack * critMultiplier;

      // 2. Calculate Effective Armor of Target
      // Lethality to Flat Pen conversion
      const flatPenFromLethality = convertLethalityToFlatPen(finalChampionStats.lethality || 0, championLevel);
      const totalFlatArmorPen = (finalChampionStats.flatArmorPen || 0) + flatPenFromLethality;

      const effectiveArmor = calculateEffectiveArmor(
        target.stats.armor,
        finalChampionStats.percentArmorPen || 0,
        totalFlatArmorPen
      );

      // 3. Calculate Damage Multiplier (from resistance)
      const damageMultiplier = calculateDamageMultiplier(effectiveArmor);

      // 4. Damage This Hit
      const damageThisHit = damageBeforeMitigation * damageMultiplier;

      // 5. Apply Damage and Update Stats
      target.stats.hp -= damageThisHit;
      totalDamageDealt += damageThisHit;
      attackCount++;

      if (target.stats.hp <= 0) {
        target.stats.hp = 0; // Don't let health go negative for reporting
        // The TTK will be the currentTime of this attack's completion.
        // If first attack (currentTime = 0), TTK = 0 (or attackTimer if we consider time to first hit).
        // With current loop, currentTime is time of *next* attack.
        // If attack happens, then time advances:
        // Attack at t=0, currentTime becomes attackTimer.
        // Attack at t=attackTimer, currentTime becomes 2*attackTimer.
        // So if target dies, TTK is current `currentTime` value *after* it's incremented.
        // Let's adjust: If target dies, the time taken is `currentTime` plus the time for this attack to land.
        // If first attack is at t=0, and it kills, TTK is effectively 0 or very small.
        // If loop is: ATTACK -> ADVANCE_TIME.
        // currentTime at point of death is the time the *next* attack *would have started*.
        // So, actual TTK is currentTime - attackTimer (if not first hit) or 0 (if first hit).
        // This is tricky. Let's assume loop is:
        // WHILE (health > 0 && time < max) { ATTACK; ADVANCE_TIME_TO_NEXT_ATTACK_START }
        // If target dies, TTK = currentTime (which is start of next attack, so end of current attack interval)
        break;
      }

      // 6. Advance Time to Next Attack
      currentTime += attackTimer;
    }

    // --- Results ---
    // If loop finished due to time limit but target alive, current Time is maxSimulationTime.
    // If target died, currentTime is the time the lethal attack "landed" (end of its interval).
    const simulationTimeTaken = target.stats.hp <= 0 ? currentTime : maxSimulationTimeInSeconds;

    const ttk = target.stats.hp <= 0 ? simulationTimeTaken : null;
    // DPS should be based on the actual time damage was being dealt, or up to simulation cap.
    const dpsCalculationTime = simulationTimeTaken > 0 ? simulationTimeTaken : (attackCount > 0 ? attackTimer : 0) ; // Avoid division by zero if no time passed but 1 hit
    const dps = dpsCalculationTime > 0 ? totalDamageDealt / dpsCalculationTime : (totalDamageDealt > 0 ? totalDamageDealt / attackTimer : 0) ;


    return {
      ttk,
      dps: parseFloat(dps.toFixed(2)),
      totalDamageDealt: parseFloat(totalDamageDealt.toFixed(2)),
      attackCount,
      finalChampionStats,
      targetInitialHealth: initialTargetHealth,
      targetFinalHealth: parseFloat(target.stats.hp.toFixed(2)),
      simulationTimeTaken: parseFloat(simulationTimeTaken.toFixed(3)),
      remarks: target.stats.hp <= 0 ? "Target eliminated." : "Max simulation time reached."
    };

  } catch (error) {
    console.error("Error during auto-attack simulation:", error);
    // Propagate error or return a specific error object
    throw error;
    // return { error: error.message, ttk: null, dps: 0, totalDamageDealt: 0, attackCount: 0 };
  }
}


// Example Conceptual Usage:
// async function runExample() {
//   const input = {
//     championId: "Ahri", // Ensure Ahri is in your champions.json
//     championLevel: 11,
//     itemIds: ["3031", "3006"], // Example: Infinity Edge, Berserker's Greaves (ensure they are in items.json)
//     runeIds: [5008, 5005] // Example: Adaptive Force, Attack Speed shards (ensure in runes.json & parsable)
//   };
//   try {
//     const results = await runAutoAttackSimulation(input);
//     console.log("Simulation Results:", results);
//     if (results.ttk !== null) {
//         console.log(`TTK: ${results.ttk.toFixed(3)}s`);
//     } else {
//         console.log(`Target not killed within ${input.maxSimulationTimeInSeconds || 60}s. Damage dealt: ${results.totalDamageDealt}`);
//     }
//     console.log(`DPS: ${results.dps}`);
//     console.log(`Final AD: ${results.finalChampionStats.ad}, Final AS: ${results.finalChampionStats.attackSpeed}`);
//     console.log(`Final Crit Chance: ${results.finalChampionStats.critChance * 100}%`);

//   } catch (e) {
//     console.error("Simulation failed:", e);
//   }
// }
// runExample();
