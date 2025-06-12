/**
 * Represents a League of Legends champion with stats calculated at a specific level.
 */
export class Champion {
  /**
   * @param {string} championId - The ID of the champion (e.g., "Ahri").
   * @param {number} level - The champion's current level (1-18).
   * @param {object} rawChampionData - The raw static data object for this champion, typically from champions.json.
   */
  constructor(championId, level, rawChampionData) {
    if (!rawChampionData) {
      throw new Error(`Raw data for champion ${championId} is missing.`);
    }
    if (level < 1 || level > 18) {
      throw new Error(`Invalid level ${level} for champion. Must be between 1 and 18.`);
    }

    this.championId = championId;
    this.level = parseInt(level, 10);
    this.rawStats = rawChampionData.stats; // Direct reference to the 'stats' part of the raw data
    this.name = rawChampionData.name;

    // Note: Base Attack Speed is a bit tricky.
    // The 'attackspeed' stat in raw data is often the base AS at level 1.
    // 'attackspeedperlevel' is a percentage growth based on the *base* attack speed.
    // For now, we'll store the level 1 base AS and the per level scaling factor.
    // A more accurate model might need a specific "baseAS" if 'attackspeed' isn't it.
    // Most game data files (like from Riot's DDragon) provide 'attackspeed' as the base AS at level 1.
    // And 'attackspeedperlevel' is the % increase of that base value, per level.
    // Example: BaseAS = 0.625. AS per level = 3.5%.
    // AS at level L = BaseAS * (1 + (ASperlevel_percentage * (L-1)))
    // However, some sources say 'attackspeedperlevel' is an additive value to a ratio.
    // Let's assume the common formula: BaseAS * (1 + (ASRatioModifier * (Level-1)))
    // The 'attackspeedperlevel' in many JSON files is the direct percentage value (e.g., 3.5 for 3.5%)
    // For now, let's use the formula: base_as * (1 + (growth_stat_percentage_value / 100) * (level - 1))
    // This is a common way it's represented. If rawStats.attackspeed is base, and rawStats.attackspeedperlevel is the percentage.
  }

  /**
   * Calculates the champion's base stats at their current level.
   * This does NOT include stats from items, runes, or other temporary buffs.
   * Formulas based on LoL Wiki and common stat calculation patterns.
   * @returns {object} An object containing the calculated base stats.
   * Example: { hp, mp, ad, armor, magicResist, attackSpeed, critChance, critDamage, moveSpeed, manaRegen, healthRegen }
   */
  getBaseStatsAtLevel() {
    const s = this.rawStats;
    const lvlMinusOne = this.level - 1;

    // Health and Mana
    const hp = s.hp + s.hpperlevel * lvlMinusOne;
    const mp = s.mp + s.mpperlevel * lvlMinusOne; // Note: Some champs have 0 mp/mpperlevel (e.g., Garen)

    // Offensive Stats
    const ad = s.attackdamage + s.attackdamageperlevel * lvlMinusOne;
    // Base AP is 0 for all champs unless they have a specific passive. Not in raw stats usually.

    // Defensive Stats
    const armor = s.armor + s.armorperlevel * lvlMinusOne;
    const magicResist = s.spellblock + s.spellblockperlevel * lvlMinusOne; // 'spellblock' is common for MR

    // Attack Speed
    // Base AS (at level 1) is s.attackspeed
    // Growth is s.attackspeedperlevel (this is a raw percentage, e.g., 3.5 means 3.5%)
    // Formula: BaseAS * (1 + (AttackSpeedGrowthPercentage / 100) * (Level - 1))
    // Note: This is a simplified model. True LoL AS has a base AS and an AS ratio that growth applies to.
    // For now, let's use the widely cited formula. If s.attackspeed is the base AS at level 1 (e.g. 0.625)
    // and s.attackspeedperlevel is the percentage growth (e.g. 3.4), then:
    const baseAttackSpeed = s.attackspeed; // This is the AS at level 1
    const attackSpeedGrowth = s.attackspeedperlevel / 100; // Convert percentage to decimal
    const attackSpeed = baseAttackSpeed * (1 + attackSpeedGrowth * lvlMinusOne);


    // Critical Strike
    const critChance = s.crit || 0; // Base crit chance, usually 0
    const critPerLevel = s.critperlevel || 0;
    const totalCritChance = critChance + critPerLevel * lvlMinusOne;
    // Base crit damage multiplier is typically 1.75 (175%). Not usually in per-champion stats.

    // Utility Stats
    const moveSpeed = s.movespeed; // Movespeed is flat, does not scale with level.
    const manaRegen = (s.mpregen || 0) + (s.mpregenperlevel || 0) * lvlMinusOne;
    const healthRegen = (s.hpregen || 0) + (s.hpregenperlevel || 0) * lvlMinusOne;

    // Range is also typically static
    const attackRange = s.attackrange || 0;


    return {
      name: this.name,
      level: this.level,
      hp: parseFloat(hp.toFixed(2)),
      mp: parseFloat(mp.toFixed(2)),
      ad: parseFloat(ad.toFixed(2)),
      armor: parseFloat(armor.toFixed(2)),
      magicResist: parseFloat(magicResist.toFixed(2)),
      attackSpeed: parseFloat(attackSpeed.toFixed(3)), // AS often has 3 decimal places
      baseAttackSpeedValue: parseFloat(baseAttackSpeed.toFixed(3)), // The actual base AS at level 1
      attackSpeedRatio: parseFloat(s.attackspeedratio ? s.attackspeedratio : baseAttackSpeed.toFixed(3)), // if available, else use baseAS
      attackSpeedGrowthPercentage: s.attackspeedperlevel, // The raw per level %
      critChance: parseFloat(totalCritChance.toFixed(2)), // As a decimal, e.g., 0.25 for 25%
      // critDamage: 1.75, // Standard base critical damage multiplier, not usually champion-specific
      moveSpeed: parseFloat(moveSpeed.toFixed(0)),
      manaRegen: parseFloat(manaRegen.toFixed(3)),
      healthRegen: parseFloat(healthRegen.toFixed(3)),
      attackRange: parseFloat(attackRange.toFixed(0)),
    };
  }
}

// Example Usage (requires getRawChampionData from championRawStats.js)
// import { getRawChampionData } from './championRawStats.js';
//
// async function testChampion() {
//   const rawAhriData = await getRawChampionData('Ahri');
//   if (rawAhriData) {
//     const ahriLvl1 = new Champion('Ahri', 1, rawAhriData);
//     console.log('Ahri Level 1 Stats:', ahriLvl1.getBaseStatsAtLevel());
//
//     const ahriLvl18 = new Champion('Ahri', 18, rawAhriData);
//     console.log('Ahri Level 18 Stats:', ahriLvl18.getBaseStatsAtLevel());
//   }
//
//   const rawYasuoData = await getRawChampionData('Yasuo');
//   if (rawYasuoData) {
//     const yasuoLvl6 = new Champion('Yasuo', 6, rawYasuoData);
//     console.log('Yasuo Level 6 Stats:', yasuoLvl6.getBaseStatsAtLevel());
//   }
// }
//
// testChampion().catch(console.error);
