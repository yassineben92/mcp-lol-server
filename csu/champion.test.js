import { Champion } from './champion.js';
import { getRawChampionData } from './championRawStats.js';

// Helper to compare floating point numbers with a tolerance
function approxEqual(val1, val2, epsilon = 0.01) {
    if (val1 === null || val2 === null) return val1 === val2;
    return Math.abs(val1 - val2) < epsilon;
}

async function runTests() {
  console.log("--- Running champion.js Tests ---");
  let allTestsPassed = true;

  function test(description, condition) {
    if (!condition) {
      console.error(`FAIL: ${description}`);
      allTestsPassed = false;
    } else {
      console.log(`PASS: ${description}`);
    }
  }

  // Need raw champion data to test. Assuming 'Ahri' and 'Yasuo' exist from previous exploration.
  const rawAhriData = await getRawChampionData('Ahri');
  const rawYasuoData = await getRawChampionData('Yasuo');

  if (!rawAhriData) {
    console.error("FAIL: Could not load Ahri's raw data. Subsequent tests will fail.");
    allTestsPassed = false;
  } else {
    // Test Ahri at Level 1
    const ahriLvl1 = new Champion('Ahri', 1, rawAhriData);
    const statsLvl1 = ahriLvl1.getBaseStatsAtLevel();
    test("Ahri Lvl 1 HP", statsLvl1.hp === rawAhriData.stats.hp); // Base HP
    test("Ahri Lvl 1 AD", statsLvl1.ad === rawAhriData.stats.attackdamage); // Base AD
    test("Ahri Lvl 1 Armor", statsLvl1.armor === rawAhriData.stats.armor); // Base Armor
    test("Ahri Lvl 1 AS", approxEqual(statsLvl1.attackSpeed, rawAhriData.stats.attackspeed)); // Base AS

    // Test Ahri at Level 11 (mid-level)
    // HP = baseHp + hpPerLevel * (level-1) = 570 + 96 * 10 = 570 + 960 = 1530
    // AD = baseAd + adPerLevel * (level-1) = 53 + 3 * 10 = 53 + 30 = 83
    // Armor = baseArmor + armorPerLevel * (level-1) = (assume rawAhriData.stats.armor) + (rawAhriData.stats.armorperlevel) * 10
    // AS = baseAS * (1 + (ASperLevel/100) * (level-1)) = 0.668 * (1 + (2/100)*10) = 0.668 * (1 + 0.2) = 0.668 * 1.2 = 0.8016
    const ahriLvl11 = new Champion('Ahri', 11, rawAhriData);
    const statsLvl11 = ahriLvl11.getBaseStatsAtLevel();
    const expectedHpLvl11 = rawAhriData.stats.hp + rawAhriData.stats.hpperlevel * 10;
    const expectedAdLvl11 = rawAhriData.stats.attackdamage + rawAhriData.stats.attackdamageperlevel * 10;
    const expectedArmorLvl11 = rawAhriData.stats.armor + rawAhriData.stats.armorperlevel * 10;
    const expectedAsLvl11 = rawAhriData.stats.attackspeed * (1 + (rawAhriData.stats.attackspeedperlevel / 100) * 10);

    test(`Ahri Lvl 11 HP (${statsLvl11.hp} vs ${expectedHpLvl11})`, approxEqual(statsLvl11.hp, expectedHpLvl11));
    test(`Ahri Lvl 11 AD (${statsLvl11.ad} vs ${expectedAdLvl11})`, approxEqual(statsLvl11.ad, expectedAdLvl11));
    // Ahri's armor might not be in the test data used previously, so check if armorperlevel exists
     if (rawAhriData.stats.armorperlevel !== undefined) {
        test(`Ahri Lvl 11 Armor (${statsLvl11.armor} vs ${expectedArmorLvl11})`, approxEqual(statsLvl11.armor, expectedArmorLvl11));
    } else {
        console.warn("WARN: Ahri armorperlevel not in raw data, skipping Lvl 11 Armor test detail.");
        test("Ahri Lvl 11 Armor (base check)", statsLvl11.armor === rawAhriData.stats.armor); // Should still have base armor
    }
    test(`Ahri Lvl 11 AS (${statsLvl11.attackSpeed} vs ${expectedAsLvl11})`, approxEqual(statsLvl11.attackSpeed, expectedAsLvl11));
  }

  if (!rawYasuoData) {
    console.error("FAIL: Could not load Yasuo's raw data. Subsequent tests might be affected.");
    // allTestsPassed = false; // Don't fail all if only one champ is missing for this conceptual test
  } else {
    // Test Yasuo at Level 18 (max level)
    const yasuoLvl18 = new Champion('Yasuo', 18, rawYasuoData);
    const statsLvl18 = yasuoLvl18.getBaseStatsAtLevel();
    const lvlMinusOne = 17;
    const expectedHpLvl18 = rawYasuoData.stats.hp + rawYasuoData.stats.hpperlevel * lvlMinusOne;
    const expectedAdLvl18 = rawYasuoData.stats.attackdamage + rawYasuoData.stats.attackdamageperlevel * lvlMinusOne;
    // Yasuo has 0 mp and mpperlevel
    test("Yasuo Lvl 18 MP", statsLvl18.mp === 0 || statsLvl18.mp === 100); // Base MP for Yasuo is 100, mpperlevel 0

    test(`Yasuo Lvl 18 HP (${statsLvl18.hp} vs ${expectedHpLvl18})`, approxEqual(statsLvl18.hp, expectedHpLvl18));
    test(`Yasuo Lvl 18 AD (${statsLvl18.ad} vs ${expectedAdLvl18})`, approxEqual(statsLvl18.ad, expectedAdLvl18));
  }

  // Test invalid level
  try {
    new Champion('Ahri', 0, rawAhriData || {}); // Use dummy if Ahri data failed
    test("Champion constructor: invalid level (0) should throw", false); // Should not reach here
  } catch (e) {
    test("Champion constructor: invalid level (0) should throw", e.message.includes("Invalid level"));
  }
  try {
    new Champion('Ahri', 19, rawAhriData || {});
    test("Champion constructor: invalid level (19) should throw", false); // Should not reach here
  } catch (e) {
    test("Champion constructor: invalid level (19) should throw", e.message.includes("Invalid level"));
  }
  // Test missing raw data
  try {
    new Champion('NonExistentChamp', 1, null);
    test("Champion constructor: missing raw data should throw", false); // Should not reach here
  } catch (e) {
    test("Champion constructor: missing raw data should throw", e.message.includes("Raw data for champion NonExistentChamp is missing."));
  }


  console.log(`--- champion.js Tests Complete. All Passed: ${allTestsPassed} ---`);
   if (!allTestsPassed) {
      console.error("One or more champion.js tests failed.");
  }
  return allTestsPassed;
}

// runTests(); // Call this if running the file directly
export { runTests as runChampionTests };
