/**
 * Calculates the damage multiplier based on resistance.
 * Formula: 100 / (100 + Resistance) for positive resistance
 * Formula: 2 - (100 / (100 - Resistance)) for negative resistance
 * @param {number} resistanceValue - The target's resistance (Armor or Magic Resist).
 * @returns {number} Damage multiplier (e.g., 0.5 for 100 resistance).
 */
export function calculateDamageMultiplier(resistanceValue) {
  if (resistanceValue >= 0) {
    return 100 / (100 + resistanceValue);
  } else {
    return 2 - 100 / (100 - resistanceValue);
  }
}

/**
 * Calculates the effective armor of a target after penetrations.
 * Lethality is assumed to be pre-converted to flat armor penetration for the attacker's level.
 * @param {number} targetBaseArmor - The target's base armor.
 * @param {number} attackerPercentArmorPen - Attacker's percentage armor penetration (e.g., 0.30 for 30%).
 * @param {number} attackerFlatArmorPen - Attacker's flat armor penetration (from items, runes, lethality).
 * @returns {number} Effective armor value.
 */
export function calculateEffectiveArmor(targetBaseArmor, attackerPercentArmorPen, attackerFlatArmorPen) {
  let armorAfterPercentPen = targetBaseArmor * (1 - attackerPercentArmorPen);
  let effectiveArmor = armorAfterPercentPen - attackerFlatArmorPen;
  return effectiveArmor;
  // Note: Effective armor can be negative. Damage calculation handles this.
}

/**
 * Calculates the critical strike damage multiplier.
 * @param {number} bonusCritDamagePercent - Attacker's bonus critical strike damage (e.g., 0.75 for Infinity Edge).
 *                                       Base critical damage is 175% (meaning a 0.75 bonus).
 *                                       Some champions might have different base crit damage.
 *                                       For simplicity, we'll assume standard 175% base if bonusCritDamagePercent is 0.
 * @returns {number} Critical strike damage multiplier (e.g., 1.75 for standard crits, 2.10 with IE assuming IE gives +35% crit damage).
 */
export function getCritDamageMultiplier(bonusCritDamagePercent = 0) {
  // Standard crit damage is 175% of AD.
  // bonusCritDamagePercent is additional damage on top of the base AD.
  // So, if base crit is 1.75x AD, and IE gives +0.35x AD (as it states "critical strikes deal +35% damage"),
  // the total multiplier becomes 1.75 + 0.35 = 2.10.
  // However, common interpretation is that base crit is +75% damage (total 175%).
  // Infinity Edge's "Critical Strikes deal 35% increased damage" means it adds to this multiplier.
  // Most sources say default crit is 175%.
  // If an item says "+X% critical strike damage", it usually adds to the 75% bonus part.
  // Let's assume the input `bonusCritDamagePercent` is the *additional* percentage on top of the base 75% bonus.
  // So, if Infinity Edge provides 35% bonus critical damage, it means bonusCritDamagePercent = 0.35
  // Total multiplier = 1 (base AD) + 0.75 (base crit bonus) + bonusCritDamagePercent
  return 1.75 + bonusCritDamagePercent;
}


/**
 * Calculates the time between attacks (attack timer) based on final attack speed.
 * @param {number} finalAttackSpeed - The champion's final attack speed value (e.g., 1.25 attacks per second).
 * @returns {number} Time in seconds between attacks.
 */
export function calculateAttackTimer(finalAttackSpeed) {
  if (finalAttackSpeed <= 0) {
    return Infinity; // Avoid division by zero or negative values
  }
  return 1 / finalAttackSpeed;
}

/**
 * Converts lethality to flat armor penetration based on attacker's level.
 * Formula: FlatPen = Lethality * (0.6 + 0.4 * AttackerLevel / 18)
 * @param {number} lethalityValue - The amount of lethality.
 * @param {number} attackerLevel - The attacker's current level.
 * @returns {number} Flat armor penetration.
 */
export function convertLethalityToFlatPen(lethalityValue, attackerLevel) {
  if (attackerLevel < 1) attackerLevel = 1;
  if (attackerLevel > 18) attackerLevel = 18;
  return lethalityValue * (0.6 + (0.4 * attackerLevel) / 18);
}
