import { calculateFinalChampionStats } from './statAggregator.js'; // Assuming other functions are tested via simulation

// Helper to compare floating point numbers with a tolerance
function approxEqual(val1, val2, epsilon = 0.01) {
    if (val1 === undefined || val2 === undefined) return val1 === val2;
    if (val1 === null || val2 === null) return val1 === val2;
    return Math.abs(val1 - val2) < epsilon;
}

// Helper for deep equality check for relevant parts of objects
function statsObjectsPartiallyEqual(actual, expected) {
    for (let key in expected) {
        if (!approxEqual(actual[key], expected[key])) {
            console.error(`Mismatch for key ${key}: Actual ${actual[key]}, Expected ${expected[key]}`);
            return false;
        }
    }
    return true;
}


function runTests() {
  console.log("--- Running statAggregator.js Tests (calculateFinalChampionStats) ---");
  let allTestsPassed = true;

  function test(description, condition, expected, actual) {
    if (!condition) {
      console.error(`FAIL: ${description}`);
      // For objects, log them to see the difference
      if (typeof expected === 'object' && typeof actual === 'object') {
          console.log("Expected subset:", expected);
          console.log("Actual full:", actual);
      }
      allTestsPassed = false;
    } else {
      console.log(`PASS: ${description}`);
    }
  }

  // Sample Base Stats (e.g., a level 1 champion)
  const sampleBaseStats = {
    hp: 600, mp: 300, ad: 60, ap: 0, armor: 30, magicResist: 30,
    attackSpeed: 0.625, // This is AS with level 1 growth (i.e. base AS * (1 + 0))
    baseAttackSpeedValue: 0.625, // True base AS at level 1
    attackSpeedGrowthPercentage: 2.0, // 2% per level (not directly used by calcFinal, but part of baseStats input)
    critChance: 0, bonusCritDamagePercent: 0, // Base crit damage is 1.75, bonus is 0
    moveSpeed: 325, abilityHaste: 0, cooldownReduction: 0,
    lethality: 0, flatMagicPen: 0, percentArmorPen: 0, percentMagicPen: 0,
    healAndShieldPower: 0, manaRegen: 8, healthRegen: 5,
    level: 1, // Level is part of base stats from champion.js
  };

  // Test Case 1: No items or runes
  let noItems = {};
  let noRunes = {};
  let finalStats1 = calculateFinalChampionStats(sampleBaseStats, noItems, noRunes);
  let expectedStats1 = { hp: 600, ad: 60, attackSpeed: 0.625, armor: 30, abilityHaste: 0 };
  test("calculateFinalChampionStats: No items/runes", statsObjectsPartiallyEqual(finalStats1, expectedStats1), expectedStats1, finalStats1);

  // Test Case 2: Flat AD and HP from items
  let items2 = { FlatAttackDamageMod: 25, FlatHealthMod: 180 };
  let finalStats2 = calculateFinalChampionStats(sampleBaseStats, items2, noRunes);
  // Expected: HP = 600 + 180 = 780; AD = 60 + 25 = 85
  let expectedStats2 = { hp: 780, ad: 85, attackSpeed: 0.625 };
  test("calculateFinalChampionStats: Flat AD/HP items", statsObjectsPartiallyEqual(finalStats2, expectedStats2), expectedStats2, finalStats2);

  // Test Case 3: Percent Attack Speed from runes
  let runes3 = { PercentAttackSpeedMod: 0.10 }; // 10% Attack Speed
  let finalStats3 = calculateFinalChampionStats(sampleBaseStats, noItems, runes3);
  // Expected AS = BaseAS_Lvl1 * (1 + AS_from_Level_Factor + BonusPercent)
  // AS_from_Level_Factor for level 1 is 0.
  // Expected AS = 0.625 * (1 + 0 + 0.10) = 0.625 * 1.10 = 0.6875
  let expectedStats3 = { attackSpeed: 0.6875 };
  test("calculateFinalChampionStats: Percent AS runes", statsObjectsPartiallyEqual(finalStats3, expectedStats3), expectedStats3, finalStats3);

  // Test Case 4: Mixed items and runes, including AdaptiveForce
  let items4 = { FlatArmorMod: 20, FlatAbilityPowerMod: 30 };
  let runes4 = { AdaptiveForce: 9, FlatMagicResistMod: 8 }; // Ahri's AD > AP initially (60 vs 0), so Adaptive -> AD
  let finalStats4 = calculateFinalChampionStats(sampleBaseStats, items4, runes4);
  // Expected: Armor = 30 + 20 = 50
  // Expected: MR = 30 + 8 = 38
  // Expected: AP = 0 + 30 = 30
  // Expected: AD = 60 (base) + 9 (adaptive) = 69
  let expectedStats4 = { armor: 50, magicResist: 38, ap: 30, ad: 69 };
  test("calculateFinalChampionStats: Mixed, AdaptiveForce to AD", statsObjectsPartiallyEqual(finalStats4, expectedStats4), expectedStats4, finalStats4);

  // Test Case 5: Percent Health and Rabadon-like AP boost
  let sampleBaseStatsHighAP = { ...sampleBaseStats, ap: 50 }; // Give some base AP for %AP to make sense
  let items5 = { PercentHealthMod: 0.15, FlatAbilityPowerMod: 100, PercentAbilityPowerMod: 0.35 }; // e.g. Overgrowth, Rabadon's
  let finalStats5 = calculateFinalChampionStats(sampleBaseStatsHighAP, items5, noRunes);
  // Expected HP = (600 (base) + 0 (flat)) * (1 + 0.15) = 600 * 1.15 = 690
  // Expected AP = (50 (base) + 100 (flat)) * (1 + 0.35) = 150 * 1.35 = 202.5
  let expectedStats5 = { hp: 690, ap: 202.5 };
  test("calculateFinalChampionStats: Percent HP and AP items", statsObjectsPartiallyEqual(finalStats5, expectedStats5), expectedStats5, finalStats5);

  // Test Case 6: Crit Chance and Bonus Crit Damage
  let items6 = { PercentCritChanceMod: 0.20, PercentCritDamageMod: 0.35 }; // e.g. Cloak + IE passive part
  let finalStats6 = calculateFinalChampionStats(sampleBaseStats, items6, noRunes);
  // Expected CritChance = 0 + 0.20 = 0.20
  // Expected BonusCritDamagePercent = 0 + 0.35 = 0.35
  let expectedStats6 = { critChance: 0.20, bonusCritDamagePercent: 0.35 };
  test("calculateFinalChampionStats: Crit items", statsObjectsPartiallyEqual(finalStats6, expectedStats6), expectedStats6, finalStats6);

  // Test Case 7: Lethality and Percent Armor Pen
  let items7 = { FlatLethalityMod: 10, PercentArmorPenetrationMod: 0.30 };
  // These don't change champion stats directly, but are stored on the finalStats object
  let finalStats7 = calculateFinalChampionStats(sampleBaseStats, items7, noRunes);
  let expectedStats7 = { lethality: 10, percentArmorPen: 0.30 };
  test("calculateFinalChampionStats: Penetration items", statsObjectsPartiallyEqual(finalStats7, expectedStats7), expectedStats7, finalStats7);


  console.log(`--- statAggregator.js Tests Complete. All Passed: ${allTestsPassed} ---`);
  if (!allTestsPassed) {
      console.error("One or more statAggregator.js tests failed.");
  }
  return allTestsPassed;
}

// runTests();
export { runTests as runStatAggregatorTests };
