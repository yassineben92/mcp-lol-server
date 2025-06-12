/**
 * Parses an item's description string to extract known flat and percent stats.
 * This is a basic parser and might need to be expanded for more complex descriptions or formats.
 * It looks for patterns like "+X Stat Name" or "+Y% Stat Name".
 *
 * @param {string} descriptionString - The HTML-like description string from the item data.
 * @returns {object} An object containing parsed stats.
 *                   Example: { FlatAttackDamageMod: 10, PercentAttackSpeedMod: 0.25 }
 */
export function parseItemStatsFromString(descriptionString) {
  const stats = {};
  if (!descriptionString || typeof descriptionString !== 'string') {
    return stats;
  }

  // Remove HTML tags for simpler parsing. This is a naive removal.
  // A more robust solution might use a lightweight HTML parser or more complex regex.
  const textOnly = descriptionString.replace(/<[^>]+>/g, ' ');

  // Define regex patterns for various stats.
  // The order can matter if some stat names are substrings of others.
  const statPatterns = [
    // Flat Stats
    { name: 'FlatAttackDamageMod', pattern: /\+(\d+)\s+Attack Damage/i },
    { name: 'FlatAbilityPowerMod', pattern: /\+(\d+)\s+Ability Power/i },
    { name: 'FlatArmorMod', pattern: /\+(\d+)\s+Armor/i },
    { name: 'FlatMagicResistMod', pattern: /\+(\d+)\s+Magic Resist/i }, // or Magic Resistance
    { name: 'FlatMagicResistMod', pattern: /\+(\d+)\s+Magic Resistance/i },
    { name: 'FlatHealthMod', pattern: /\+(\d+)\s+Health/i },
    { name: 'FlatManaMod', pattern: /\+(\d+)\s+Mana/i },
    { name: 'FlatMovementSpeedMod', pattern: /\+(\d+)\s+Movement Speed/i }, // For boots' direct stats often
    // Percent Stats
    { name: 'PercentAttackSpeedMod', pattern: /\+(\d+)%\s+Attack Speed/i, isPercent: true },
    { name: 'PercentMovementSpeedMod', pattern: /\+(\d+)%\s+Movement Speed/i, isPercent: true },
    { name: 'PercentCritChanceMod', pattern: /\+(\d+)%\s+Critical Strike Chance/i, isPercent: true },
    { name: 'PercentCritDamageMod', pattern: /\+(\d+)%\s+Critical Strike Damage/i, isPercent: true }, // e.g. Infinity Edge passive part
    { name: 'FlatLethalityMod', pattern: /\+(\d+)\s+Lethality/i },
    { name: 'FlatMagicPenetrationMod', pattern: /\+(\d+)\s+Magic Penetration/i },
    { name: 'PercentArmorPenetrationMod', pattern: /\+(\d+)%\s+Armor Penetration/i, isPercent: true },
    { name: 'PercentMagicPenetrationMod', pattern: /\+(\d+)%\s+Magic Penetration/i, isPercent: true },
    { name: 'PercentHealAndShieldPowerMod', pattern: /\+(\d+)%\s+Heal and Shield Power/i, isPercent: true },
    { name: 'FlatAbilityHasteMod', pattern: /\+(\d+)\s+Ability Haste/i },
    // Base Regen Percent Stats
    { name: 'PercentBaseHealthRegenMod', pattern: /\+(\d+)%\s+Base Health Regen/i, isPercent: true },
    { name: 'PercentBaseManaRegenMod', pattern: /\+(\d+)%\s+Base Mana Regen/i, isPercent: true },
  ];

  for (const statPattern of statPatterns) {
    const match = textOnly.match(statPattern.pattern);
    if (match) {
      let value = parseInt(match[1], 10);
      if (statPattern.isPercent) {
        value /= 100; // Convert percentage to decimal (e.g., 25% -> 0.25)
      }
      // If the stat was already found (e.g. "Magic Resist" and "Magic Resistance"), add to it if applicable,
      // or decide on a priority. For now, last one wins or adds if different keys.
      // This simple model assumes one entry per stat name.
      stats[statPattern.name] = (stats[statPattern.name] || 0) + value;
    }
  }

  // Handle cases like "UNIQUE Passive - Enhanced Movement: +X Movement Speed" separately if needed,
  // but the generic flat movement speed should catch it if formatted as "+X Movement Speed".
  // The current regex for FlatMovementSpeedMod might catch this already.

  return stats;
}

// Example Usage:
// const description1 = "<stats>+25 Attack Damage</stats><br><stats>+20% Attack Speed</stats>";
// console.log(parseItemStatsFromString(description1));
// Expected: { FlatAttackDamageMod: 25, PercentAttackSpeedMod: 0.20 }

// const description2 = "<mainText><stats>+30 Ability Power</stats><br><stats>+250 Mana</stats><br><stats>+20 Ability Haste</stats></mainText>";
// console.log(parseItemStatsFromString(description2));
// Expected: { FlatAbilityPowerMod: 30, FlatManaMod: 250, FlatAbilityHasteMod: 20 }

// const bootsDescription = "<passive>UNIQUE Passive - Enhanced Movement: +45 Movement Speed</passive>";
// console.log(parseItemStatsFromString(bootsDescription)); // This might not be caught if "+" is missing or format differs.
// The regex `/\+(\d+)\s+Movement Speed/i` needs the "+" and the number directly.
// If boots description is just "<stats>+45 Movement Speed</stats>", it's fine.
// Let's test a more complex one:
// const complexDescription = "<mainText><stats>+70 Ability Power</stats><br><stats>+600 Mana</stats><br><stats>+20 AbilityHaste</stats><br><br><active>Active - Stasis:</active> Champion becomes invulnerable and untargetable for 2.5 seconds, but is unable to move, attack, cast spells, or use items during this time (120s cooldown).</mainText><br><br><hr><br><passive>UNIQUE Passive - <lol-uikit-passive-hextech-component-in-spell-haste-tooltip-value>Empower</lol-uikit-passive-hextech-component-in-spell-haste-tooltip-value>: Takedowns on champions reduce the cooldown of this item's Active effect by 10%. </passive><br><br><hr><br><rules>Only one <font color='#999999'>Hourglass</font> item can be owned.</rules><br>";
// console.log(parseItemStatsFromString(complexDescription));
// Expected: { FlatAbilityPowerMod: 70, FlatManaMod: 600, FlatAbilityHasteMod: 20 } (if "AbilityHaste" matches "Ability Haste")
// The current regex `/\+(\d+)\s+Ability Haste/i` requires a space. "20 AbilityHaste" would fail.
// This indicates the need for more robust regex or pre-processing.
// For now, this is a starting point.
// It also does not parse "UNIQUE Passive: X" for stats yet unless they conform to "+N Stat" format.
