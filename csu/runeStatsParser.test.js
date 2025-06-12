import { parseRuneStatsFromString } from './runeStatsParser.js';

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
  console.log("--- Running runeStatsParser.js Tests ---");
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

  const testCases = [
    {
      desc: "Empty string",
      input: "",
      expected: {}
    },
    {
      desc: "Non-stat shard description (e.g., keystone)",
      input: "Hitting a champion with 3 separate attacks or abilities in 3s deals bonus adaptive damage.",
      expected: {}
    },
    {
      desc: "Adaptive Force",
      input: "+9 Adaptive Force",
      expected: { AdaptiveForce: 9 }
    },
    {
      desc: "Armor Shard",
      input: "+6 Armor",
      expected: { FlatArmorMod: 6 }
    },
    {
      desc: "Magic Resist Shard",
      input: "+8 Magic Resist",
      expected: { FlatMagicResistMod: 8 }
    },
    {
      desc: "Attack Speed Shard",
      input: "+10% Attack Speed",
      expected: { PercentAttackSpeedMod: 0.10 }
    },
    {
      desc: "Ability Haste Shard",
      input: "+8 Ability Haste",
      expected: { FlatAbilityHasteMod: 8 }
    },
    {
      desc: "Scaling Health Shard (basic parsing)",
      // The parser is simple and might just grab the first number.
      input: "+15-140 Health (based on level)",
      expected: { FlatHealthMod: 15 } // Current parser should pick up +15 Health
    },
    {
      desc: "Text with stat shard pattern",
      input: "Grants +5 Armor when you stand still.", // This is not a typical shard format but tests robustness
      expected: { FlatArmorMod: 5 } // It should still find "+5 Armor"
    },
    {
        desc: "Magic Resistance (alias)",
        input: "+8 Magic Resistance",
        expected: { FlatMagicResistMod: 8 }
    }
  ];

  testCases.forEach(tc => {
    const result = parseRuneStatsFromString(tc.input);
    test(tc.desc, objectsEqual(result, tc.expected), tc.expected, result);
  });

  console.log(`--- runeStatsParser.js Tests Complete. All Passed: ${allTestsPassed} ---`);
  if (!allTestsPassed) {
      console.error("One or more runeStatsParser.js tests failed.");
  }
  return allTestsPassed;
}

// runTests();
export { runTests as runRuneStatsParserTests };
