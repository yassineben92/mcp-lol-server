import * as formulas from './combatFormulas.js';

function runTests() {
  console.log("--- Running combatFormulas.js Tests ---");
  let allTestsPassed = true;

  function test(description, condition) {
    if (!condition) {
      console.error(`FAIL: ${description}`);
      allTestsPassed = false;
    } else {
      console.log(`PASS: ${description}`);
    }
  }

  // Test calculateDamageMultiplier
  test("calculateDamageMultiplier: 100 resistance", formulas.calculateDamageMultiplier(100) === 0.5);
  test("calculateDamageMultiplier: 0 resistance", formulas.calculateDamageMultiplier(0) === 1.0);
  test("calculateDamageMultiplier: -50 resistance", formulas.calculateDamageMultiplier(-50) === 1.3333333333333333); // Approx 4/3
  test("calculateDamageMultiplier: 200 resistance", formulas.calculateDamageMultiplier(200) === 100/300);

  // Test calculateEffectiveArmor
  test("calculateEffectiveArmor: no penetration", formulas.calculateEffectiveArmor(100, 0, 0) === 100);
  test("calculateEffectiveArmor: percent penetration", formulas.calculateEffectiveArmor(100, 0.3, 0) === 70);
  test("calculateEffectiveArmor: flat penetration", formulas.calculateEffectiveArmor(100, 0, 20) === 80);
  test("calculateEffectiveArmor: both penetrations", formulas.calculateEffectiveArmor(100, 0.3, 20) === 50); // 100 * 0.7 = 70. 70 - 20 = 50
  test("calculateEffectiveArmor: pen making armor negative", formulas.calculateEffectiveArmor(50, 0.5, 30) === -5); // 50 * 0.5 = 25. 25 - 30 = -5

  // Test getCritDamageMultiplier
  test("getCritDamageMultiplier: no bonus", formulas.getCritDamageMultiplier(0) === 1.75);
  test("getCritDamageMultiplier: with bonus (e.g., IE 35%)", formulas.getCritDamageMultiplier(0.35) === 2.10);

  // Test calculateAttackTimer
  test("calculateAttackTimer: 1.0 AS", formulas.calculateAttackTimer(1.0) === 1.0);
  test("calculateAttackTimer: 2.0 AS", formulas.calculateAttackTimer(2.0) === 0.5);
  test("calculateAttackTimer: 0.5 AS", formulas.calculateAttackTimer(0.5) === 2.0);
  test("calculateAttackTimer: 0 AS", formulas.calculateAttackTimer(0) === Infinity);

  // Test convertLethalityToFlatPen
  // Lethality * (0.6 + 0.4 * AttackerLevel / 18)
  test("convertLethalityToFlatPen: 10 lethality, level 1", formulas.convertLethalityToFlatPen(10, 1) === 10 * (0.6 + 0.4 * 1 / 18)); // 6.222...
  test("convertLethalityToFlatPen: 10 lethality, level 9", formulas.convertLethalityToFlatPen(10, 9) === 10 * (0.6 + 0.4 * 9 / 18)); // 8.0
  test("convertLethalityToFlatPen: 10 lethality, level 18", formulas.convertLethalityToFlatPen(10, 18) === 10 * (0.6 + 0.4 * 18 / 18)); // 10.0
  test("convertLethalityToFlatPen: 0 lethality, level 18", formulas.convertLethalityToFlatPen(0, 18) === 0);

  console.log(`--- combatFormulas.js Tests Complete. All Passed: ${allTestsPassed} ---`);
  if (!allTestsPassed) {
      // throw new Error("One or more combatFormulas tests failed.");
      console.error("One or more combatFormulas tests failed.");
  }
  return allTestsPassed;
}

// runTests(); // Call this if running the file directly e.g. `node csu/combatFormulas.test.js`
// For now, we are just creating the file. Execution will be summarized later.
export { runTests as runCombatFormulasTests };
