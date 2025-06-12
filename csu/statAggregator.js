// Import necessary functions from other modules if they are to be called directly here.
// For example, if we were to call getProcessedItemData directly:
// import { getProcessedItemData } from './items.js';
// import { parseItemStatsFromString } from './itemStatsParser.js';
// import { getProcessedRuneData } from './runes.js';
// import { parseRuneStatsFromString } from './runeStatsParser.js';

/**
 * Aggregates stats from a list of item IDs.
 *
 * @param {string[]} itemIds - Array of item IDs to aggregate stats from.
 * @param {function} getProcessedItemDataFunc - Async function to fetch and process item data (e.g., from items.js).
 * @param {function} itemStatsParserFunc - Function to parse item description strings (e.g., from itemStatsParser.js).
 * @returns {Promise<object>} A promise that resolves to an object containing aggregated item stats.
 *                            Example: { FlatAttackDamageMod: X, PercentAttackSpeedMod: Y, ... }
 */
export async function aggregateItemStats(itemIds, getProcessedItemDataFunc, itemStatsParserFunc) {
  const aggregatedStats = {};
  const uniquePassivesApplied = new Set(); // For handling UNIQUE passives that grant stats

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return aggregatedStats;
  }
  if (typeof getProcessedItemDataFunc !== 'function' || typeof itemStatsParserFunc !== 'function') {
    console.error("Missing required functions for item processing.");
    return aggregatedStats;
  }

  for (const itemId of itemIds) {
    const itemData = await getProcessedItemDataFunc(itemId, itemStatsParserFunc);
    if (itemData && itemData.finalStats) { // finalStats is the combined stats from items.js
      // Basic stat summation
      for (const [statName, value] of Object.entries(itemData.finalStats)) {
        if (typeof value === 'number') {
          aggregatedStats[statName] = (aggregatedStats[statName] || 0) + value;
        }
      }

      // Rudimentary UNIQUE passive handling for stats:
      // This is highly simplified. A full system would need to parse passive names and effects.
      // For V1, if an item has a known unique stat passive that the parser can tag (e.g. "UNIQUE_Haste_10"),
      // we could check uniquePassivesApplied. The current itemStatsParser doesn't do this yet.
      // Example: if itemData.uniqueStatPassives = { "Haste": 10 }
      // if (itemData.uniqueStatPassives) {
      //   for (const [passiveName, passiveValue] of Object.entries(itemData.uniqueStatPassives)) {
      //     if (!uniquePassivesApplied.has(passiveName)) {
      //       const statToApply = "FlatAbilityHasteMod"; // Assuming "Haste" maps to this
      //       aggregatedStats[statToApply] = (aggregatedStats[statToApply] || 0) + passiveValue;
      //       uniquePassivesApplied.add(passiveName);
      //     }
      //   }
      // }
      // For now, simple summation is done above. Refinement of unique passives is for later.
    }
  }
  return aggregatedStats;
}

/**
 * Aggregates stats from a list of rune IDs, focusing on stat shards.
 *
 * @param {string[]} runeIds - Array of rune IDs to aggregate stats from.
 * @param {function} getProcessedRuneDataFunc - Async function to fetch and process rune data (e.g., from runes.js).
 * @param {function} runeStatsParserFunc - Function to parse rune description strings (e.g., from runeStatsParser.js).
 * @returns {Promise<object>} A promise that resolves to an object containing aggregated rune stats.
 */
export async function aggregateRuneStats(runeIds, getProcessedRuneDataFunc, runeStatsParserFunc) {
  const aggregatedStats = {};
  if (!Array.isArray(runeIds) || runeIds.length === 0) {
    return aggregatedStats;
  }
  if (typeof getProcessedRuneDataFunc !== 'function' || typeof runeStatsParserFunc !== 'function') {
    console.error("Missing required functions for rune processing.");
    return aggregatedStats;
  }

  for (const runeId of runeIds) {
    const runeData = await getProcessedRuneDataFunc(runeId, runeStatsParserFunc);
    // Only sum up stats if it's a stat shard and has parsedStats
    if (runeData && runeData.isStatShard && runeData.parsedStats) {
      for (const [statName, value] of Object.entries(runeData.parsedStats)) {
        if (typeof value === 'number') {
          aggregatedStats[statName] = (aggregatedStats[statName] || 0) + value;
        }
      }
    }
  }
  return aggregatedStats;
}


/**
 * Calculates the final champion stats after applying item and rune bonuses.
 * Note: This is a complex area with many specific rules in League of Legends.
 * This implementation provides a baseline and may need refinement for edge cases or specific champion interactions.
 *
 * @param {object} championBaseStats - Output from Champion.getBaseStatsAtLevel().
 * @param {object} totalItemStats - Aggregated stats from items.
 * @param {object} totalRuneStats - Aggregated stats from runes.
 * @returns {object} An object containing the final champion stats.
 */
export function calculateFinalChampionStats(championBaseStats, totalItemStats, totalRuneStats) {
  const finalStats = { ...championBaseStats }; // Start with base stats

  // Helper to get stat value or default (0)
  const getItemStat = (statName) => totalItemStats[statName] || 0;
  const getRuneStat = (statName) => totalRuneStats[statName] || 0;

  // --- Pre-calculation for Adaptive Force from Runes ---
  // Determine if AD or AP is higher from base stats to apply Adaptive Force
  let adaptiveForceValue = getRuneStat('AdaptiveForce');
  if (adaptiveForceValue > 0) {
    // Simplified: compare base AD vs 0 AP (since base AP is 0).
    // A more complex version would look at existing bonus AD/AP from items if runes were last.
    // For now, assume adaptive force converts before other item/rune stats are fully tallied for this check.
    // Typically, Adaptive Force is granted as AD if Bonus AD > Bonus AP, else AP.
    // If equal, it defaults to a champion's primary damage type (often pre-set).
    // Let's assume it defaults to AD if base AD is present, otherwise AP.
    // This is a simplification.
    if (championBaseStats.ad > (championBaseStats.ap || 0)) { // Assuming 'ap' might exist in base stats if a champ had base AP
        totalRuneStats.FlatAttackDamageMod = (totalRuneStats.FlatAttackDamageMod || 0) + adaptiveForceValue;
    } else {
        totalRuneStats.FlatAbilityPowerMod = (totalRuneStats.FlatAbilityPowerMod || 0) + adaptiveForceValue;
    }
  }


  // --- Health ---
  const baseHp = championBaseStats.hp;
  const flatHp = getItemStat('FlatHealthMod') + getRuneStat('FlatHealthMod');
  const percentHp = getItemStat('PercentHealthMod') + getRuneStat('PercentHealthMod'); // e.g. Overgrowth rune
  finalStats.hp = (baseHp + flatHp) * (1 + percentHp);

  // --- Mana ---
  const baseMp = championBaseStats.mp;
  const flatMp = getItemStat('FlatManaMod') + getRuneStat('FlatManaMod');
  const percentMp = getItemStat('PercentManaMod') + getRuneStat('PercentManaMod'); // Less common
  finalStats.mp = (baseMp + flatMp) * (1 + percentMp);

  // --- Attack Damage (AD) ---
  const baseAd = championBaseStats.ad; // This is total AD at current level from base + per level
  const flatBonusAd = getItemStat('FlatAttackDamageMod') + getRuneStat('FlatAttackDamageMod');
  // Percent AD usually applies to BONUS AD, but some effects might apply to total.
  // For simplicity, LoL usually has % AD apply to *bonus* AD.
  // However, if an item says "+X% Attack Damage", it often means total. This needs clarification per effect.
  // Let's assume for now PercentAttackDamageMod applies to base AD for simplicity, though this is often not the case.
  // A more accurate model: finalAD = (BaseAD + BonusAD) * (1 + relevant multipliers)
  // BonusAD = FlatADFromItemsRunes + (BaseAD * PercentBaseADBonus)
  // For now:
  finalStats.ad = (baseAd + flatBonusAd) * (1 + getItemStat('PercentAttackDamageMod') + getRuneStat('PercentAttackDamageMod'));
  // Store bonus AD as it's often used in scalings
  finalStats.bonusAd = (finalStats.ad - baseAd);


  // --- Ability Power (AP) ---
  const baseAp = championBaseStats.ap || 0; // Assuming base AP is 0 unless specified
  const flatAp = getItemStat('FlatAbilityPowerMod') + getRuneStat('FlatAbilityPowerMod');
  const percentAp = getItemStat('PercentAbilityPowerMod') + getRuneStat('PercentAbilityPowerMod'); // e.g., Rabadon's Deathcap
  // Rabadon's usually applies to total AP from other sources.
  // So, AP = (BaseAP + FlatAPFromItemsRunes) * (1 + PercentTotalAPMultiplier)
  finalStats.ap = (baseAp + flatAp) * (1 + percentAp);


  // --- Armor ---
  const baseArmor = championBaseStats.armor;
  const flatArmor = getItemStat('FlatArmorMod') + getRuneStat('FlatArmorMod');
  const percentArmor = getItemStat('PercentArmorMod') + getRuneStat('PercentArmorMod'); // Usually bonus armor
  finalStats.armor = (baseArmor + flatArmor) * (1 + percentArmor);


  // --- Magic Resist (MR) ---
  const baseMr = championBaseStats.magicResist;
  const flatMr = getItemStat('FlatMagicResistMod') + getRuneStat('FlatMagicResistMod');
  const percentMr = getItemStat('PercentMagicResistMod') + getRuneStat('PercentMagicResistMod'); // Usually bonus MR
  finalStats.magicResist = (baseMr + flatMr) * (1 + percentMr);

  // --- Attack Speed (AS) ---
  // AS = BaseAS_Level1 * (1 + (AS_Growth_From_Level-1) + Sum_of_Percent_AS_Bonuses_from_Items_Runes)
  // championBaseStats.attackSpeed is ALREADY BaseAS_Level1 * (1 + AS_Growth_From_Level-1)
  // So, we need the true base AS at level 1 and the growth from level.
  // championBaseStats.baseAttackSpeedValue is base AS at level 1.
  // championBaseStats.attackSpeedRatio is what item AS % often scales off, but can be base AS itself.
  // The percent bonus from items/runes is added to the growth multiplier.
  // AS = ChampionBaseAS_Lvl1 * (1 + (ASGrowthFactorFromLevel) + TotalPercentASFromItemsAndRunes)
  // ASGrowthFactorFromLevel = (championBaseStats.attackSpeed / championBaseStats.baseAttackSpeedValue) - 1

  const asBonusPercentFromItemsRunes = getItemStat('PercentAttackSpeedMod') + getRuneStat('PercentAttackSpeedMod');
  // The championBaseStats.attackSpeed already includes the per-level growth based on its formula.
  // The typical LoL formula: FinalAS = BaseAS_Lvl1 * (1 + (AS_from_Level_Multiplier) + Sum_AS_Item_Rune_Percentages)
  // Where AS_from_Level_Multiplier is (championBaseStats.attackSpeed / championBaseStats.baseAttackSpeedValue) - 1
  // Or, more simply, if championBaseStats.attackSpeed is the AS *with* level scaling (but no items/runes):
  // Bonus AS % from items/runes applies to the champion's base AS (level 1).

  // Let AS_at_level_L_no_items = championBaseStats.attackSpeed (this is already calculated with level growth)
  // Bonus_AS_Percent = sum from items/runes
  // Final_AS = AS_at_level_L_no_items + (Champion_Base_AS_at_Level_1 * Bonus_AS_Percent) -> This is incorrect for LoL.

  // Correct LoL formula:
  // Final AS = BaseAS_at_Level_1 * (1 + TotalASPercentageBonus)
  // TotalASPercentageBonus = AS_Growth_From_Champion_Level + AS_From_Items_Runes_Etc
  // AS_Growth_From_Champion_Level = (Value derived from championBaseStats.attackSpeed and championBaseStats.baseAttackSpeedValue)
  // Let's use the `attackSpeedGrowthPercentage` from `championBaseStats`
  // BaseAS_Lvl1 * (1 + ( (level-1) * attackSpeedGrowthPercentage/100 ) + itemAS% + runeAS% )

  const asFromLevelFactor = (championBaseStats.attackSpeed / championBaseStats.baseAttackSpeedValue) -1;
  finalStats.attackSpeed = championBaseStats.baseAttackSpeedValue * (1 + asFromLevelFactor + asBonusPercentFromItemsRunes);
  // Cap Attack Speed at 2.5, though some champs can exceed this. For now, standard cap.
  if (finalStats.attackSpeed > 2.5) {
    finalStats.attackSpeed = 2.5;
  }

  // --- Critical Strike Chance ---
  const baseCritChance = championBaseStats.critChance || 0;
  const flatCritChance = getItemStat('PercentCritChanceMod') + getRuneStat('PercentCritChanceMod'); // Crit chance is always %
  finalStats.critChance = Math.min(1.0, baseCritChance + flatCritChance); // Cap at 100%

  // --- Critical Strike Damage ---
  // Base is 1.75 (handled by combatFormulas.getCritDamageMultiplier)
  // Bonus comes from items like Infinity Edge.
  finalStats.bonusCritDamagePercent = getItemStat('PercentCritDamageMod') + getRuneStat('PercentCritDamageMod');


  // --- Movement Speed (MS) ---
  // MS = (BaseMS + FlatMSBonuses) * (1 + PercentMSBonusesProduct) * (1 + OtherPercentMSBonusesProduct)
  // Multiplicative stacking of %MS is complex (diminishing returns after certain thresholds).
  // For V1: (BaseMS + FlatMS) * (1 + SumOfHighestPercentBonuses) - simplified.
  const baseMs = championBaseStats.moveSpeed;
  const flatMs = getItemStat('FlatMovementSpeedMod') + getRuneStat('FlatMovementSpeedMod');
  // Percent MS from items/runes - sum them for now. True LoL formula has diminishing returns for multiple % sources.
  const percentMs = getItemStat('PercentMovementSpeedMod') + getRuneStat('PercentMovementSpeedMod');
  finalStats.moveSpeed = (baseMs + flatMs) * (1 + percentMs);
  // TODO: Apply MS soft caps if necessary (e.g. over 415, over 490)


  // --- Ability Haste & Cooldown Reduction ---
  // Ability Haste is linear. CDR is multiplicative and capped at 40-45% typically.
  // CSU will use Ability Haste.
  finalStats.abilityHaste = (getItemStat('FlatAbilityHasteMod') + getRuneStat('FlatAbilityHasteMod'));
  // CDR can be calculated from Haste: CDR = Haste / (100 + Haste)
  finalStats.cooldownReduction = finalStats.abilityHaste / (100 + finalStats.abilityHaste);

  // --- Penetrations ---
  finalStats.lethality = getItemStat('FlatLethalityMod') + getRuneStat('FlatLethalityMod');
  finalStats.flatMagicPen = getItemStat('FlatMagicPenetrationMod') + getRuneStat('FlatMagicPenetrationMod');
  finalStats.percentArmorPen = getItemStat('PercentArmorPenetrationMod') + getRuneStat('PercentArmorPenetrationMod'); // e.g. Last Whisper
  finalStats.percentMagicPen = getItemStat('PercentMagicPenetrationMod') + getRuneStat('PercentMagicPenetrationMod'); // e.g. Void Staff

  // --- Other stats ---
  finalStats.healAndShieldPower = getItemStat('PercentHealAndShieldPowerMod') + getRuneStat('PercentHealAndShieldPowerMod');
  finalStats.manaRegen = (championBaseStats.manaRegen || 0) * (1 + getItemStat('PercentBaseManaRegenMod') + getRuneStat('PercentBaseManaRegenMod'));
  finalStats.healthRegen = (championBaseStats.healthRegen || 0) * (1 + getItemStat('PercentBaseHealthRegenMod') + getRuneStat('PercentBaseHealthRegenMod'));
  // TODO: Omnivamp, Lifesteal, Tenacity etc. will be added later.

  // Round final values where appropriate
  for (const key in finalStats) {
    if (typeof finalStats[key] === 'number') {
        // Basic rounding, can be more specific per stat
        if (['hp', 'mp', 'ad', 'ap', 'armor', 'magicResist', 'moveSpeed'].includes(key)) {
            finalStats[key] = parseFloat(finalStats[key].toFixed(1));
        } else if (['attackSpeed', 'manaRegen', 'healthRegen'].includes(key)) {
            finalStats[key] = parseFloat(finalStats[key].toFixed(3));
        } else if (['critChance', 'cooldownReduction', 'percentArmorPen', 'percentMagicPen'].includes(key)) {
            finalStats[key] = parseFloat(finalStats[key].toFixed(4)); // Percentages often need more precision
        }
    }
  }

  return finalStats;
}


// Example usage (conceptual, requires actual setup with imported functions)
// async function testAggregation() {
//   // These would be the actual functions imported from other files
//   const { getProcessedItemData } = await import('./items.js');
//   const { parseItemStatsFromString } = await import('./itemStatsParser.js');
//   const { getProcessedRuneData } = await import('./runes.js');
//   const { parseRuneStatsFromString } = await import('./runeStatsParser.js');
//   const { getRawChampionData } = await import('./championRawStats.js');
//   const { Champion } = await import('./champion.js');

//   const itemIds = ["3006", "6672"]; // Berserker's, Kraken Slayer
//   const runeIds = [5005, 5008]; // Example: AS Shard, Adaptive Shard (ensure these exist in your data)

//   const totalItemStats = await aggregateItemStats(itemIds, getProcessedItemData, parseItemStatsFromString);
//   console.log("Total Item Stats:", totalItemStats);

//   const totalRuneStats = await aggregateRuneStats(runeIds, getProcessedRuneData, parseRuneStatsFromString);
//   console.log("Total Rune Stats:", totalRuneStats);

//   const rawAhriData = await getRawChampionData("Ahri");
//   if (rawAhriData) {
//     const ahri = new Champion("Ahri", 10, rawAhriData);
//     const baseStatsAhri = ahri.getBaseStatsAtLevel();
//     console.log("Ahri Base Stats (Lvl 10):", baseStatsAhri);

//     const finalAhriStats = calculateFinalChampionStats(baseStatsAhri, totalItemStats, totalRuneStats);
//     console.log("Ahri Final Stats (Lvl 10 with items/runes):", finalAhriStats);
//   }
// }
// testAggregation().catch(console.error);
