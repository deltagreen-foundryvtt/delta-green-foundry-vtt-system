import { describe, expect, test } from "@jest/globals";
import fs from "node:fs";

import {
  ExtractAttributes,
  ExtractSkills,
  tokenize,
  determineNextState,
  groupEntriesUntilNextSection,
  States,
  ParseStatBlock,
} from "../../module/macros/stat-block-parser.js";

describe("determineNextState", () => {
  test.each([
    { nextToken: "skills:", expected: States.SkillPairs },
    { nextToken: "fox", expected: States.Unknown },
    { nextToken: "attacks:", expected: States.Attacks },
    { nextToken: ".", expected: States.EndEntry },
  ])(
    ".determineNextState() for $nextToken is $expected",
    ({ nextToken, expected }) => {
      expect(determineNextState(nextToken)).toEqual(expected);
    },
  );
  test.each("str dex con int pow cha hp wp san".split(" "))(
    `determineNextState(%s) should return ${States.AttributePairs}`,
    (stat) => {
      expect(determineNextState(stat)).toEqual(States.AttributePairs);
    },
  );
});

describe("groupEntriesUntilNextSection", () => {
  test("extracting multiple attacks followed by a new section", () => {
    const entryOne = "abra cadabra alakazam".split(" ");
    const entryTwo = "hocus pocus".split(" ");
    const entryThree = "wibbly wobbly timey wimey".split(" ");
    const input = [
      ...entryOne,
      ".",
      ...entryTwo,
      ".",
      ...entryThree,
      ".",
      "skills:",
    ];
    const expected = [entryOne, entryTwo, entryThree];
    const [results, remainingTokens] = groupEntriesUntilNextSection(input);
    expect(remainingTokens).toEqual(["skills:"]);
    expect(results).toEqual(expected);
  });
});

describe("tokenize", () => {
  const expectedOutput = [
    "str",
    "10",
    "con",
    "10",
    "pow",
    "14",
    "skills:",
    "firearms",
    "45",
    "heavy",
    "weapons",
    "50",
    "melee",
    "weapons",
    "75",
    "science",
    "(biology)",
    "50",
    ".",
  ];

  test.each([
    {
      input: "75%.",
      expected: ["75", "."],
    },
    {
      input:
        "str 10 con 10 pow 14\n\nSKILLS: Firearms 45%, HEAVY WEAPONS 50%, Melee Weapons 75%, Science (Biology) 50%.",
      expected: expectedOutput,
    },
    {
      input:
        "STR 10 CON 10 POW 14\n\nSKILLS: FIREARMS 45%, HEAVY WEAPONS 50%, MELEE WEAPONS 75%, SCIENCE (BIOLOGY) 50%.",
      expected: expectedOutput,
    },
  ])(".normalize() on $input", ({ input, expected }) => {
    expect(tokenize(input)).toEqual(expected);
  });
});

describe("ExtractAttributes", () => {
  const validAttributes =
    "STR 10 con 10 Dex 13 Int 10 pOW 14 ChA 10\n\nHp 10 wp 14\n\t\nsaN 10\nSKILLS:";
  const invalidAttributes = "Bear 10 Criminal 2 STr 10 con 11 Int 10";
  const incompleteAttributes = "Str 10 con 10 Dex 10 10 Int";

  test("extracting valid attributes", () => {
    const [result, rest] = ExtractAttributes(tokenize(validAttributes));
    expect(rest).toEqual(["skills:"]);
    expect(result).toEqual({
      str: 10,
      dex: 13,
      con: 10,
      int: 10,
      pow: 14,
      cha: 10,
      hp: 10,
      wp: 14,
      san: 10,
    });
  });

  test("extracting invalid attributes", () => {
    const tokens = tokenize(invalidAttributes);
    const [result, rest] = ExtractAttributes(tokens);
    expect(rest).toEqual(tokens);
    expect(result).toEqual({ incomplete: true });
  });

  test("extracting incomplete attributes", () => {
    const [result, rest] = ExtractAttributes(tokenize(incompleteAttributes));
    expect(rest).toEqual(["10", "int"]);
    expect(result).toEqual({
      str: 10,
      con: 10,
      dex: 10,
      incomplete: true,
    });
  });
});

describe("ExtractSkills", () => {
  test.each([
    {
      testName: "valid skills extract cleanly",
      input:
        "Firearms 45%, Heavy Weapons 35%, Melee Weapons 50%, Unarmed Combat 60%.",
      expected: {
        firearms: 45,
        "heavy weapons": 35,
        "melee weapons": 50,
        "unarmed combat": 60,
      },
    },
    {
      testName: "homebrewed skills extract cleanly",
      input:
        "Firearms 45%, Heavy Weapons 35%, Basket Weaving 30%, Science (Blinding) 80%.",
      expected: {
        firearms: 45,
        "heavy weapons": 35,
        "basket weaving": 30,
        "science (blinding)": 80,
      },
    },
    {
      testName: "incomplete skills are dropped",
      input: "Firearms, Heavy Weapons, Unarmed Combat.",
      expected: {},
    },
    {
      testName:
        "incomplete skills mixed with complete skills results in garbled skils",
      input:
        "Firearms 45%, Heavy Weapons 35%, Melee Weapons, Unarmed Combat 60%.",
      justification: [
        "It really difficult to fully know if a skill name is that long or if its because",
        "the skill was incomplete. In this scenario the skill names will be merged, which should",
        "hopefully provide enough information to the user that something went wrong.",
        "Something more preferable would be tagging the skillset with an error flag but nothing",
        "is coming to mind at the moment.",
      ],
      expected: {
        firearms: 45,
        "heavy weapons": 35,
        "melee weapons unarmed combat": 60,
      },
    },
  ])(".ExtractSkills() on $testName", ({ input, expected }) => {
    const tokens = tokenize(input);
    const [result, rest] = ExtractSkills(tokens);
    expect(rest).toEqual([]);
    expect(result).toEqual(expected);
  });
});

describe("ParseStatBlock", () => {
  const readStatblock = (name) =>
    fs.readFileSync(`${__dirname}/statblocks/${name}.txt`, "utf8");

  test.each([
    {
      testName: "Parsing a basic NPC statblock",
      input: readStatblock("basic-stats"),
      expected: {
        name: "some dude",
        attributes: {
          str: 10,
          con: 10,
          dex: 13,
          int: 10,
          pow: 14,
          cha: 10,
          hp: 10,
          wp: 14,
          san: 0,
        },
        skills: {
          firearms: 45,
          "heavy weapons": 35,
          "melee weapons": 50,
          "unarmed combat": 60,
        },
        attacks: [
          {
            name: "Assault Rifle",
            skillModifier: 45,
            damage: "1d12+1",
            lethality: 10,
            armorPiercing: 3,
            notes: "",
          },
          {
            name: "Heavy Rifle",
            skillModifier: 45,
            damage: "1d12+2",
            armorPiercing: 3,
            notes: "",
          },
          {
            name: "Big Knife",
            skillModifier: 50,
            damage: "1d8",
            notes: "",
          },
        ],
      },
    },
  ])("$testName", ({ input, expected }) => {
    const actualStatBlock = ParseStatBlock(input);
    expect(actualStatBlock).toEqual(expected);
  });
});
