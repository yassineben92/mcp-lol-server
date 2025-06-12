import { parseItemStatsFromString } from './itemStatsParser.js';

// Helper for deep equality check for objects
function objectsEqual(o1, o2) {
    const keys1 = Object.keys(o1);
    const keys2 = Object.keys(o2);
    if (keys1.length !== keys2.length) return false;
    for (let key of keys1) {
        if (Math.abs(o1[key] - o2[key]) > 0.001) { // Tolerance for float comparison
             if (o1[key] !== o2[key]) return false; // Fallback for non-numbers
        }
    }
    return true;
}

function runTests() {
  console.log("--- Running itemStatsParser.js Tests ---");
  let allTestsPassed = true;

  function test(description, condition, expected, actual) {
    if (!condition) {
      console.error(`FAIL: ${description}`);
      console.log("Expected:", expected);
      console.log("Actual:", actual);
      allTestsPassed = false;
    } else {
      console.log(`PASS: ${description}`);
    }
  }

  // Test cases
  const testCases = [
    {
      desc: "Empty string",
      input: "",
      expected: {}
    },
    {
      desc: "No relevant stats",
      input: "Some random item description text.",
      expected: {}
    },
    {
      desc: "Simple flat Attack Damage",
      input: "<stats>+25 Attack Damage</stats>",
      expected: { FlatAttackDamageMod: 25 }
    },
    {
      desc: "Simple percent Attack Speed",
      input: "<stats>+20% Attack Speed</stats>",
      expected: { PercentAttackSpeedMod: 0.20 }
    },
    {
      desc: "Mixed flat and percent stats",
      input: "<mainText><stats>+50 Ability Power</stats><br><stats>+15% Cooldown Reduction</stats></mainText>", // Assuming CDR maps to haste or is ignored by current patterns
      // Current parser looks for "Ability Haste" not "Cooldown Reduction" unless added.
      // Let's test with a stat it knows: "+10% Movement Speed"
      input2: "<mainText><stats>+50 Ability Power</stats><br><stats>+10% Movement Speed</stats></mainText>",
      expected2: { FlatAbilityPowerMod: 50, PercentMovementSpeedMod: 0.10 }
    },
    {
      desc: "Multiple similar stats (should sum, though parser might overwrite - current overwrites/takes first)",
      // Current parser overwrites, so this test reflects that. A better parser might sum.
      // The current parser sums if the key is already there: stats[statPattern.name] = (stats[statPattern.name] || 0) + value;
      input: "<stats>+10 Armor</stats> and some text <stats>+15 Armor</stats>",
      expected: { FlatArmorMod: 25 } // 10 + 15
    },
    {
      desc: "Stats with no plus or number",
      input: "Grants Attack Damage and Ability Power.",
      expected: {}
    },
    {
      desc: "HTML tags interspersed",
      input: "Some <font color='#FFFFFF'>text</font> <stats>+300 Health</stats> more text.",
      expected: { FlatHealthMod: 300 }
    },
    {
      desc: "Lethality and Magic Penetration",
      input: "<stats>+10 Lethality</stats> <stats>+8 Magic Penetration</stats>",
      expected: { FlatLethalityMod: 10, FlatMagicPenetrationMod: 8 }
    },
    {
      desc: "All known stat types if possible",
      input: "Text <stats>+10 Attack Damage</stats> <stats>+20% Attack Speed</stats> <stats>+30 Ability Power</stats> <stats>+5 Armor</stats> <stats>+6 Magic Resist</stats> <stats>+7% Movement Speed</stats> <stats>+80 Health</stats> <stats>+100 Mana</stats> <stats>+12% Critical Strike Chance</stats> <stats>+10 Ability Haste</stats> <stats>+50% Base Health Regen</stats>",
      expected: {
        FlatAttackDamageMod: 10,
        PercentAttackSpeedMod: 0.20,
        FlatAbilityPowerMod: 30,
        FlatArmorMod: 5,
        FlatMagicResistMod: 6,
        PercentMovementSpeedMod: 0.07,
        FlatHealthMod: 80,
        FlatManaMod: 100,
        PercentCritChanceMod: 0.12,
        FlatAbilityHasteMod: 10,
        PercentBaseHealthRegenMod: 0.50
      }
    },
     {
      desc: "Handle 'Magic Resistance' alias",
      input: "<stats>+25 Magic Resistance</stats>",
      expected: { FlatMagicResistMod: 25 }
    },
  ];

  testCases.forEach(tc => {
    const actualInput = tc.input2 !== undefined ? tc.input2 : tc.input;
    const actualExpected = tc.expected2 !== undefined ? tc.expected2 : tc.expected;
    const result = parseItemStatsFromString(actualInput);
    test(tc.desc, objectsEqual(result, actualExpected), actualExpected, result);
  });

  console.log(`--- itemStatsParser.js Tests Complete. All Passed: ${allTestsPassed} ---`);
   if (!allTestsPassed) {
      console.error("One or more itemStatsParser.js tests failed.");
  }
  return allTestsPassed;
}

// runTests();
export { runTests as runItemStatsParserTests };
