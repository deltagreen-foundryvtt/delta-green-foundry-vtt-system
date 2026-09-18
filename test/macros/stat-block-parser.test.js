import { describe, expect, jest, test } from "@jest/globals";
import fs from "node:fs";

import {
  ExtractAttributes,
  ExtractSkills,
  ExtractArmorAndEquipment,
  ExtractDisordersAndAdaptations,
  tokenize,
  collectTokensUntilNextSection,
  determineNextState,
  groupEntriesUntilNextSection,
  States,
  ParseStatBlock,
} from "../../module/macros/stat-block-parser.js";

describe("determineNextState", () => {
  test.each([
    { nextLine: ["skills:"], expected: States.SkillPairs },
    { nextLine: ["fox"], expected: States.Unknown },
    { nextLine: ["attacks:"], expected: States.Attacks },
    { nextLine: ["."], expected: States.EndEntry },
  ])(
    ".determineNextState() for $nextToken is $expected",
    ({ nextLine, expected }) => {
      expect(determineNextState(nextLine)).toEqual(expected);
    },
  );
  test.each("str dex con int pow cha hp wp san".split(" "))(
    `determineNextState(%s) should return ${States.AttributePairs}`,
    (stat) => {
      expect(determineNextState([stat])).toEqual(States.AttributePairs);
    },
  );
});

describe("groupEntriesUntilNextSection", () => {
  test("extracting multiple attacks", () => {
    const entryOne = "abra cadabra alakazam".split(" ");
    const entryTwo = "hocus pocus".split(" ");
    const entryThree = "wibbly wobbly timey wimey".split(" ");
    const input = [...entryOne, ".", ...entryTwo, ".", ...entryThree, "."];
    const expected = [entryOne, entryTwo, entryThree];
    const results = groupEntriesUntilNextSection(input);
    expect(results).toEqual(expected);
  });

  test("extracting multiple attacks when the attack terminator is buried in a quote", () => {
    const entryOne = "kiss damage special see 'kiss.'".split(" ");
    const entryTwo = "wrangle damage special see 'wrangle.'".split(" ");
    const entryThree = "throttle damage special see 'throttle.'".split(" ");
    const input = [...entryOne, ...entryTwo, ...entryThree];
    const expected = [entryOne, entryTwo, entryThree];
    const results = groupEntriesUntilNextSection(input);
    expect(results).toEqual(expected);
  });
});

describe("tokenize", () => {
  const expectedOutput = [
    ["str", "10", "con", "10", "pow", "14"],
    [
      "skills:",
      "firearms",
      "45",
      ",",
      "heavy",
      "weapons",
      "50",
      ",",
      "melee",
      "weapons",
      "75",
      ",",
      "science",
      "(biology)",
      "50",
      ".",
    ],
  ];

  test.each([
    {
      input: "75%.",
      expected: [["75", "."]],
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

describe("collectTokensUntilNextSection", () => {
  test.each([
    {
      testName: "collects all attribute tokens",
      input: [
        ["str", "10", "pow", "10"],
        ["con", "12", "int", "9"],
        ["hp", "11"],
        ["san", "67"],
        ["skills:"],
        ["firearms", "50"],
      ],
      expected: [
        "str 10 pow 10 con 12 int 9 hp 11 san 67".split(" "),
        [["skills:"], ["firearms", "50"]],
      ],
    },
    {
      testName: "stops on lines where the colon is somewhere in the line",
      input: [
        "str 10 pow 10".split(" "),
        "disorders and adaptations: adapted to violence".split(" "),
        ["skills:"],
      ],
      expected: [
        "str 10 pow 10".split(" "),
        [
          "disorders and adaptations: adapted to violence".split(" "),
          ["skills:"],
        ],
      ],
    },
  ])(
    ".collectTokensUntilNextSection() on $testName",
    ({ input, expected: [expectedTokens, expectedOtherLines] }) => {
      const [actualTokens, actualOtherLines] =
        collectTokensUntilNextSection(input);
      expect(actualTokens).toEqual(expectedTokens);
      expect(actualOtherLines).toEqual(expectedOtherLines);
    },
  );
});

describe("ExtractAttributes", () => {
  const validAttributes =
    "STR 10 con 10 Dex 13 Int 10 pOW 14 ChA 10 Hp 10 wp 14 saN 10";
  const invalidAttributes = "Bear 10 Criminal 2 STr 10 con 11 Int 10";
  const incompleteAttributes = "Str 10 con 10 Dex 10 10 Int";

  test("extracting valid attributes", () => {
    const result = ExtractAttributes(tokenize(validAttributes)[0]);
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
    const tokens = tokenize(invalidAttributes)[0];
    const result = ExtractAttributes(tokens);
    expect(result).toEqual({ str: 10, con: 11, int: 10, incomplete: true });
  });

  test("extracting incomplete attributes", () => {
    const result = ExtractAttributes(tokenize(incompleteAttributes)[0]);
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
    const [tokens] = collectTokensUntilNextSection(tokenize(input));
    const [result, rest] = ExtractSkills(tokens);
    expect(rest).toEqual([]);
    expect(result).toEqual(expected);
  });
});

describe("ExtractArmorAndEquipment", () => {
  test.each([
    {
      testName: "correctly extracts armor information and equipment list",
      input:
        "advanced kevlar vest armor 4, three extra pistol magazines, flashlight , nightvision goggles",
      expected: {
        armor: {
          name: "advanced kevlar vest",
          value: 4,
        },
        equipment: [
          "three extra pistol magazines",
          "flashlight",
          "nightvision goggles",
        ],
      },
    },
  ])(".ExtractArmorAndEquipment() on $testName", ({ input, expected }) => {
    const [tokens] = collectTokensUntilNextSection(tokenize(input));
    const result = ExtractArmorAndEquipment(tokens);
    expect(result).toEqual(expected);
  });
});

describe("ExtractDisordersAndAdaptations", () => {
  test.each([
    {
      testName: "correctly extracts disorders",
      input: "intermittent explosive disorder, cocaine addiction",
      expected: {
        adaptations: [],
        disorders: ["intermittent explosive disorder", "cocaine addiction"],
      },
    },
    {
      testName: "correctly extracts adaptations",
      input: "adapted to violence, adapted to helplessness",
      expected: {
        adaptations: ["violence", "helplessness"],
        disorders: [],
      },
    },
    {
      testName:
        "correctly extract adaptations and disorders, regardless of where they are",
      input:
        "cocaine addiction, adapted to violence, intermittent explosive disorder, adapted to helplessness",
      expected: {
        adaptations: ["violence", "helplessness"],
        disorders: ["cocaine addiction", "intermittent explosive disorder"],
      },
    },
  ])(
    ".ExtractDisordersAndAdaptations() on $testName",
    ({ input, expected }) => {
      const [tokens] = collectTokensUntilNextSection(tokenize(input));
      const result = ExtractDisordersAndAdaptations(tokens);
      expect(result).toEqual(expected);
    },
  );
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
        notes: "",
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
    {
      testName: "Parsing a complex NPC statblock",
      input: readStatblock("complex-stats"),
      expected: {
        name: "private military contractor",
        notes: "",
        attributes: {
          str: 14,
          con: 13,
          dex: 12,
          int: 11,
          pow: 12,
          cha: 7,
          hp: 14,
          wp: 10,
          san: 53,
          breaking_point: 48,
        },
        armor: {
          name: "advanced kevlar vest",
          value: 4,
        },
        adaptations: ["violence"],
        disorders: [],
        skills: {
          alertness: 60,
          athletics: 50,
          dodge: 40,
          driving: 40,
          firearms: 60,
          humint: 40,
          law: 30,
          "melee weapons": 50,
          persuade: 40,
          search: 50,
          "unarmed combat": 60,
        },
        equipment: [
          "three extra pistol magazines",
          "flashlight",
          "nightvision goggles",
          "a dozen cable ties (for use as plastic handcuffs)",
          "the carbines are stored in a secured locker",
          "not usually carried",
        ],
        attacks: [
          {
            name: "Medium Pistol",
            skillModifier: 60,
            damage: "1d10",
            notes: "",
          },
          {
            name: "Carbine",
            skillModifier: 60,
            damage: "1d12",
            armorPiercing: 3,
            notes: "",
          },
          {
            name: "Baton",
            skillModifier: 50,
            damage: "1d6+1",
            notes: "",
          },
          {
            name: "Unarmed",
            skillModifier: 60,
            damage: "1d4",
            notes: "",
          },
        ],
      },
    },
    {
      testName: "Parsing the alien steward statblock",
      input: readStatblock("alien-steward-stats"),
      expected: {
        name: "hope",
        notes: [
          // The notes don't parse perfectly like this. They will be all the lines
          // lowercased, with spaces in between punctuation marks and percentage symbols
          // removed.
          // This is a known issue that will need to be addressed by skipping unparsable lines
          // and grabbing the original text by line number.
          "Hapless protomatter Steward, age 28",
          "(use Hope's stats for any Steward)",
          "Stewards are unharmed by all melee and unarmed blows.",
          "Firearms have all damage reduced to 1, and Hope regenerates 1D4 HP per round",
          "Fire, electricity, acid, chemical irritants and hypergeometric rituals inflict",
          "damage normally and stop all regeneration for the remainder of combat.",
          "ELECTRIC GUN: This weapon appears as a pulsing,",
          "softball-sized glob with three dangling tendrils. When",
          "the weapon is picked up, the tendrils wrap around",
          "the user’s forearm. The weapon is a biomechanical organism that can eject bolts of electrical current, sort",
          "of like an electric eel. The charge of lightning emitted",
          "from the weapon is variable, but Hope has no need",
          "for anything but the deadliest setting. The only reason",
          "she would turn down the charge would be to protect",
          "her beloved Valiant, but in such instances, she gives",
          "her master the gun and attempts to suffocate or rend his",
          "enemies up close. The electric gun ignores body armor",
          "but can be blocked by cover.",
          "DRAW CLOSE: After a successful grapple, a victim must",
          "succeed on a STR×5 check opposing Hope’s successful",
          "attack roll to break free. On a failure, they suffer either",
          "Swallow or Kiss the next round.",
          "KISS: Hope spurts protomatter down the grappled victim’s",
          "throat and takes control of their body. Any Agent",
          "subjected to the Kiss loses control of their character",
          "until Hope is destroyed or withdraws her parasitic",
          "protomatter. The victim loses 1/1D6 SAN due to",
          "helplessness.",
          "SWALLOW: After successfully grappling a victim, Hope",
          "liquifies herself, surrounds, and engulfs the body in",
          "a constricting protomatter sac. Hope can then inflict",
          "2D6 damage to the victim with each action without an",
          "attack roll. The victim must take an action and roll STR×5",
          "to break free.",
        ],
        attributes: {
          str: 26,
          con: 23,
          dex: 15,
          int: 11,
          pow: 10,
          cha: 14,
          hp: 19,
          wp: 10,
          san: 0,
        },
        sanloss: {
          successLoss: "1",
          failedLoss: "1d6",
          type: "unnatural",
          notes: "if seen as protomatter",
        },
        skills: {
          "art (photography)": 53,
          athletics: 93,
          "computer science": 24,
          "craft (electronics)": 64,
          "craft (lockpick)": 74,
          disguise: 74,
          dodge: 38,
          drive: 52,
          persuade: 47,
          sigint: 61,
          stealth: 92,
          "unarmed combat": 44,
          unnatural: 14,
        },
        attacks: [
          {
            name: "Slam And Strangle",
            skillModifier: 44,
            damage: "2d6",
            notes: "",
          },
          {
            name: "Grapple",
            skillModifier: 44,
            notes: "see “draw close",
          },
          {
            name: "Swallow See “swallow",
            damage: "special",
            skillModifier: 0,
            notes: "",
          },
          {
            name: "Kiss See “kiss",
            damage: "special",
            skillModifier: 0,
            notes: "",
          },
          {
            name: "Mi-go Electric Gun",
            skillModifier: 27,
            lethality: 2,
            notes: "ignores armor",
          },
          {
            name: "Mi-go Electric Gun",
            skillModifier: 27,
            lethality: 15,
            notes: "ignores armor",
          },
          {
            name: "Mi-go Electric Gun",
            skillModifier: 27,
            lethality: 25,
            notes: "ignores armor",
          },
        ],
      },
    },
    {
      testName: "Parsing the megalomaniac statblock",
      input: readStatblock("megalomaniac-stats"),
      expected: {
        name: "ronald “prince” valiant/doug walters",
        notes: [
          // The notes don't parse perfectly like this. They will be all the lines
          // lowercased, with spaces in between punctuation marks and percentage symbols
          // removed.
          // This is a known issue that will need to be addressed by skipping unparsable lines
          // and grabbing the original text by line number.
          "Unloved megalomaniac, age 35 in 1997 (stats in parentheses are when using the Boost power)",
          "OBTRUSIONS: Valiant has awakened several deadly but draining gifts called obtrusions.",
          "If the Agents confront him before he leeches power from his followers (see THE MEETING on page 38), he can perform only 1 Obtrusion.",
          "If the Agents interrupt the meeting soon after it begins, he can perform 10 Obtrusions.",
          "If they stop it late, he can perform 20.",
          "If they fail to interrupt the meeting at all, Valiant can perform 40 Obtrusions.",
          "Each can be used any number of times at a cost of 1 Obtrusion per use.",
          "Each use is his action for the turn.",
          "• Ascendance: Valiant can fly up to 50 meters, shining brightly.",
          "If he has grappled an Agent, he can carry them with him.",
          "Whatever Valiant’s altitude after using this power, he lands safely unless unconscious.",
          "• Boost: Valiant can add 6 each to his STR, DEX, and CON for the next five turns, glowing faintly.",
          "He starts a fight with this power.",
          "• Disruption: If he has lost hit points since his last action, Valiant can angrily channel a flash of force into his hands.",
          "The next time he hits with an unarmed attack, its damage is Lethality 10%.",
          "• Impulsion: By touch, Valiant can plant an emotion in the target.",
          "It lasts 20 hours. To resist the sway of this emotion requires succeeding at a WP×5 test and then spending 1D6 WP.",
          "If the WP cost is too high, the target can choose to obey the emotion after all rather than spending it.",
          "• Protection: As an action, Valiant can surround himself in a glittering aura that causes all LETHALITY rolls to fail and deflects damage.",
          "The aura remains without his taking further actions, but upon stopping 30 points of damage, it flickers out.",
          "• Repulsion: As an action, Valiant can lash out with a bright flare of force.",
          "This cannot be blocked or dodged.",
          "He can affect any number of targets within 5 meters, each costing 1 Obtrusion.",
          "Every target flies 10 meters, takes 1D6 damage, and is stunned, unable to act until they succeed at a CON×5 test.",
        ],
        attributes: {
          str: 16,
          con: 16,
          dex: 12,
          int: 12,
          pow: 10,
          cha: 18,
          hp: 16,
          wp: 10,
          san: 0,
        },
        skills: {
          accounting: 35,
          alertness: 33,
          athletics: 63,
          bureaucracy: 35,
          "computer science": 22,
          disguise: 19,
          dodge: 33,
          drive: 56,
          firearms: 62,
          "first aid": 34,
          "foreign language (spanish)": 14,
          humint: 31,
          "melee weapons": 57,
          "military science": 38,
          navigate: 24,
          persuade: 59,
          pharmacy: 34,
          sigint: 18,
          stealth: 53,
          survival: 38,
          "unarmed combat": 73,
        },
        attacks: [
          {
            name: "Unarmed",
            skillModifier: 73,
            damage: "1d4",
            notes: "(1d8)",
          },
          {
            name: "Too complicated to parse. See notes.",
            notes:
              "(after the meeting [see page 38] , valiant uses no weapons but his hands and his psychic powers",
          },
          {
            name: "Knife (marine Ka-bar)",
            skillModifier: 57,
            damage: "1d6+1",
            notes: "(1d6+3) armor piercing 3",
          },
          {
            name: "S&w Model",
            skillModifier: 645,
            notes: "pistol 62 damage 1d10",
          },
          {
            name: "Colt M16a2 Assault Rifle",
            skillModifier: 62,
            damage: "1d12",
            lethality: 10,
            notes: "",
            armorPiercing: 3,
          },
          {
            name: "Luigi Franchi Spas-12 Shotgun",
            skillModifier: 82,
            damage: "2d8",
            notes: "×2 armor",
          },
          {
            name: "Mi-go Electric Gun",
            skillModifier: 12,
            lethality: 2,
            notes: "(see notes for hope on this page)",
          },
          {
            name: "Mi-go Electric Gun",
            skillModifier: 12,
            lethality: 15,
            notes: "(see notes for hope on this page)",
          },
          {
            name: "Mi-go Electric Gun",
            skillModifier: 12,
            lethality: 25,
            notes: "(see notes for hope on this page)",
          },
        ],
      },
    },
  ])("$testName", ({ input, expected, skip }) => {
    if (skip) {
      return;
    }

    const actualStatBlock = ParseStatBlock(input);
    const expectedStatBlock = expected;
    expect(actualStatBlock.attacks).toEqual(expected.attacks);
    expect(actualStatBlock.skills).toEqual(expected.skills);
    expect(actualStatBlock.attributes).toEqual(expected.attributes);
    expect(actualStatBlock.adaptations).toEqual(expected.adaptations);
    if (expected.notes.length > 0) {
      expect(actualStatBlock.notes.length).toBeGreaterThan(0);
    }

    delete actualStatBlock.notes;
    delete expectedStatBlock.notes;
    expect(actualStatBlock).toEqual(expectedStatBlock);
  });
});
