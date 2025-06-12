/**
 * Parses a rune's description string to extract known stat shard bonuses.
 * This parser is specifically for simple stat shards like "+9 Adaptive Force", "+6 Armor", etc.
 * It's not intended for complex keystone or major rune descriptions.
 *
 * @param {string} descriptionString - The `shortDesc` or `longDesc` from the rune data.
 * @returns {object} An object containing parsed stats.
 *                   Example: { FlatArmorMod: 6, PercentAttackSpeedMod: 0.10, AdaptiveForce: 9 }
 */
export function parseRuneStatsFromString(descriptionString) {
  const stats = {};
  if (!descriptionString || typeof descriptionString !== 'string') {
    return stats;
  }

  // Stat shards usually have very simple descriptions.
  // Regex patterns for common stat shards:
  const statShardPatterns = [
    // Adaptive Force is special, not "Flat" or "Percent" but a category of its own.
    // We'll store it as { AdaptiveForce: value }
    { name: 'AdaptiveForce', pattern: /\+(\d+)\s+Adaptive Force/i, valueType: 'adaptive' },

    // Flat Stats
    { name: 'FlatArmorMod', pattern: /\+(\d+)\s+Armor/i, valueType: 'flat' },
    { name: 'FlatMagicResistMod', pattern: /\+(\d+)\s+Magic Resist/i, valueType: 'flat' },
    { name: 'FlatMagicResistMod', pattern: /\+(\d+)\s+Magic Resistance/i, valueType: 'flat' }, // Alias
    { name: 'FlatHealthMod', pattern: /\+(\d+)\s+Health/i, valueType: 'flat' }, // Scaling health shard
    // Ability Haste is also common
    { name: 'FlatAbilityHasteMod', pattern: /\+(\d+)\s+Ability Haste/i, valueType: 'flat'},

    // Percent Stats
    { name: 'PercentAttackSpeedMod', pattern: /\+(\d+)%\s+Attack Speed/i, valueType: 'percent' },
    // Other potential shards, though less common or might be phrased differently:
    // { name: 'PercentTenacityMod', pattern: /\+(\d+)%\s+Tenacity/i, valueType: 'percent' },
    // { name: 'PercentMovementSpeedMod', pattern: /\+(\d+)%\s+Movement Speed/i, valueType: 'percent' },
    // { name: 'CooldownReduction', pattern: /\+(\d+)%\s+Cooldown Reduction/i, valueType: 'percent'} // Older CDR stat
  ];

  for (const shardPattern of statShardPatterns) {
    const match = descriptionString.match(shardPattern.pattern);
    if (match) {
      let value = parseInt(match[1], 10);

      if (shardPattern.valueType === 'percent') {
        value /= 100; // Convert percentage to decimal (e.g., 10% -> 0.10)
      }

      // For AdaptiveForce, it's a special case. We might handle it differently later
      // (e.g., converting it to AD or AP based on champion's other stats).
      // For now, just store it as is.
      if (shardPattern.name === 'AdaptiveForce') {
        stats[shardPattern.name] = (stats[shardPattern.name] || 0) + value;
      } else {
        // Standard flat or percent mod
        stats[shardPattern.name] = (stats[shardPattern.name] || 0) + value;
      }
      // Since stat shards provide one specific stat, we can often break after the first match.
      // However, to be safe and handle potential combined descriptions (unlikely for shards), we continue.
    }
  }
  return stats;
}

// Example Usage:
// console.log(parseRuneStatsFromString("+9 Adaptive Force"));
// // Expected: { AdaptiveForce: 9 }

// console.log(parseRuneStatsFromString("+6 Armor"));
// // Expected: { FlatArmorMod: 6 }

// console.log(parseRuneStatsFromString("+10% Attack Speed"));
// // Expected: { PercentAttackSpeedMod: 0.10 }

// console.log(parseRuneStatsFromString("+15-140 Health (based on level)")); // More complex, current parser won't get scaling
// // Expected: {} (or { FlatHealthMod: 15 } if it just grabs the first number, which might be wrong)
// // The current { name: 'FlatHealthMod', pattern: /\+(\d+)\s+Health/i } would grab +15 Health.
// // This is acceptable for a V1, acknowledging that scaling shards need more logic.

// console.log(parseRuneStatsFromString("Hitting a champion with 3 separate attacks or abilities...")); // Keystone
// // Expected: {}
