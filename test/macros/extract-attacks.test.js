import { describe, expect, test } from "@jest/globals";
import {
  ExtractAttacks,
  extractLethalities,
} from "../../module/macros/extract-attacks.js";

const assaultRifleEntry = {
  input:
    "assault rifle 45 damage 1d12+1 (or lethality 10) armor piercing 3".split(
      " ",
    ),
  expectedAttacks: [
    {
      name: "Assault Rifle",
      skillModifier: 45,
      damage: "1d12+1",
      lethality: 10,
      armorPiercing: 3,
    },
  ],
  expectedTokensRemaining: [],
};
const heavyRifleEntry = {
  input: "heavy rifle 45 damage 1d12+2 armor piercing 3".split(" "),
  expectedAttacks: [
    {
      name: "Heavy Rifle",
      skillModifier: 45,
      damage: "1d12+2",
      armorPiercing: 3,
    },
  ],
  expectedTokensRemaining: [],
};
const meleeWeaponEntry = {
  input: "big knife 50 damage 1d8".split(" "),
  expectedAttacks: [
    {
      name: "Big Knife",
      skillModifier: 50,
      damage: "1d8",
    },
  ],
  expectedTokensRemaining: [],
};
const handGrenadeEntry = {
  input: "hand grenade 50 lethality 15".split(" "),
  expectedAttacks: [
    {
      name: "Hand Grenade",
      skillModifier: 50,
      lethality: 15,
    },
  ],
  expectedTokensRemaining: [],
};
const complexLethality = {
  input: "danger stick 55 lethality 2 or 15 or 25 (see dangerous)".split(" "),
  expectedAttacks: [
    {
      name: "Danger Stick",
      skillModifier: 55,
      lethality: 2,
    },
    {
      name: "Danger Stick",
      skillModifier: 55,
      lethality: 15,
    },
    {
      name: "Danger Stick",
      skillModifier: 55,
      lethality: 25,
    },
  ],
  expectedTokensRemaining: ["(see", "dangerous)"],
};

describe("AttackParser", () => {
  test("parsing a simple stat block", () => {
    const [attacks, remainingTokens] = ExtractAttacks(meleeWeaponEntry.input);
    expect(remainingTokens).toEqual(meleeWeaponEntry.expectedTokensRemaining);
    expect(attacks).toEqual(meleeWeaponEntry.expectedAttacks);
  });

  test.each([
    { ...meleeWeaponEntry, testName: "Simple stat block" },
    {
      ...assaultRifleEntry,
      testName: "Weapon with lethality and armor piercing",
    },
    { ...heavyRifleEntry, testName: "Weapon with armor piercing" },
    { ...handGrenadeEntry, testName: "Explosive weapon with just lethality" },
    { ...complexLethality, testName: "Attack with complex lethality rules" },
  ])("$testName", ({ input, expectedAttacks, expectedTokensRemaining }) => {
    const [actual, remainingTokens] = ExtractAttacks(input);
    expect(remainingTokens).toEqual(expectedTokensRemaining);
    expect(actual).toEqual(expectedAttacks);
  });
});

describe("extractLethalities", () => {
  const templateAttack = {
    name: "Danger Stick",
    skillModifier: 55,
  };
  test.each([
    {
      testName: "when there are multiple lethalities",
      input: ["2", "15", "25", "(see", "dangerous)"],
      expectedAttacks: [
        { ...templateAttack, lethality: 2 },
        { ...templateAttack, lethality: 15 },
        { ...templateAttack, lethality: 25 },
      ],
      expectedTokensRemaining: ["(see", "dangerous)"],
    },
    {
      testName: "when there is a single lethality",
      input: ["10", "armor", "piercing", "3"],
      expectedAttacks: [{ ...templateAttack, lethality: 10 }],
      expectedTokensRemaining: ["armor", "piercing", "3"],
    },
    {
      testName: "when there is nothing after the lethality rating",
      input: ["15"],
      expectedAttacks: [{ ...templateAttack, lethality: 15 }],
      expectedTokensRemaining: [],
    },
  ])(
    ".extractLethalities() on $testName",
    ({ input, expectedAttacks, expectedTokensRemaining }) => {
      const [actualAttacks, actualRemainingTokens] = extractLethalities(
        input,
        templateAttack,
      );
      expect(actualAttacks).toEqual(expectedAttacks);
      expect(actualRemainingTokens).toEqual(expectedTokensRemaining);
    },
  );
});
