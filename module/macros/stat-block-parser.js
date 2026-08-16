import { ExtractAttacks } from "./extract-attacks.js";

const SKILL_SECTION = "skills:";
const ATTACKS_SECTION = "attacks:";
const COMMA = ",";
const ENTRY_END = ".";
const BREAKING = "breaking";
// Make assumption that the following sections
// always end in the same token
const ARMOR_AND_EQUIPMENT_SECTION = "equipment:";
const DISORDERS_AND_ADAPTATIONS_SECTION = "adaptations:";

export const States = {
  BeginStatblock: "begin-statblock",
  EndEntry: "end-statblock",
  AttributePairs: "attribute-pair",
  SkillPairs: "skill-pair",
  Attacks: "attack",
  ArmorAndEquipment: "armor-and-equipment",
  DisordersAndAdaptations: "disorders-and-adaptations",
  Unknown: "unknown",
};

const Attributes = {
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  pow: "POW",
  cha: "CHA",
  hp: "HP",
  wp: "WP",
  san: "SAN",
};

const OptionalAttributes = {
  breaking: "breaking",
  point: "point",
  breaking_point: "breaking_point",
};

const EXTRANEOUS_CHARACTERS = /%/g;
const COMMA_MATCHER = /(.+),/;
const SECTION_TERMINATOR = /(.+)\./;
const ARMOR_MATCHER = /armou?r/g;

export function tokenize(stream) {
  return stream
    .toLowerCase()
    .split(/[\n|\r\n]+/)
    .map((line) => {
      return line
        .split(/\s+/)
        .flatMap((token) => {
          const strippedToken = token.replaceAll(EXTRANEOUS_CHARACTERS, "");
          const commaMatch = COMMA_MATCHER.exec(strippedToken);
          if (commaMatch != null) {
            return [commaMatch[1], COMMA];
          }
          const sectionTerminatorMatch = SECTION_TERMINATOR.exec(strippedToken);
          if (sectionTerminatorMatch !== null) {
            return [sectionTerminatorMatch[1], ENTRY_END];
          }
          return strippedToken;
        })
        .filter((token) => token.length > 0);
    })
    .filter((line) => line.length > 0);
}

export function collectTokensUntilNextSection(lines) {
  let tokens = [];
  let otherLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const colonIndex = line.findIndex((token) => token.includes(":"));
    const rest = line.slice(colonIndex);
    if (colonIndex >= 0 && tokens.length > 0) {
      otherLines = lines.slice(i);
      break;
    } else if (colonIndex > 0) {
      tokens = [...tokens, ...rest];
    } else {
      tokens = [...tokens, ...line];
    }
  }

  return [tokens, otherLines];
}

export function groupEntriesUntilNextSection(tokens) {
  const groups = [];

  tokens.reduce((accum, token) => {
    if (token === ENTRY_END) {
      groups.push(accum);
      return [];
    }
    const cleanedToken = token.replaceAll(/\(|\)/g, "");
    if (cleanedToken === "or") {
      return accum;
    }

    accum.push(token);
    return accum;
  }, []);

  return groups;
}

const attributeKeys = Object.keys(Attributes);
export function determineNextState(nextLine) {
  if (nextLine === undefined) {
    return States.Unknown;
  }

  const token = nextLine.find((t) => t.includes(":")) || nextLine[0];
  if (attributeKeys.indexOf(token) >= 0) {
    return States.AttributePairs;
  }

  switch (token) {
    case ENTRY_END:
      return States.EndEntry;
    case SKILL_SECTION:
      return States.SkillPairs;
    case ATTACKS_SECTION:
      return States.Attacks;
    case DISORDERS_AND_ADAPTATIONS_SECTION:
      return States.DisordersAndAdaptations;
    case ARMOR_AND_EQUIPMENT_SECTION:
      return States.ArmorAndEquipment;
    default:
      return States.Unknown;
  }
}

function extractAttributesImpl(tokens, accumulator) {
  if (tokens.length === []) {
    return accumulator;
  }

  const [attr, rawValue, ...rest] = tokens;
  const value = parseInt(rawValue);

  if (attr === OptionalAttributes.breaking) {
    return extractAttributesImpl([rawValue, ...rest], accumulator);
  }

  if (attr === OptionalAttributes.point) {
    accumulator[OptionalAttributes.breaking_point] = value;
    return extractAttributesImpl(rest, accumulator);
  }

  const currentKeys = new Set(Object.keys(accumulator));
  const expectedKeys = new Set(Object.keys(Attributes));
  if (currentKeys.intersection(expectedKeys).size === expectedKeys.size) {
    delete accumulator.incomplete;
    return accumulator;
  }

  if (Attributes[attr] == null || Number.isNaN(value)) {
    if (rest.length <= 0) return accumulator;

    return extractAttributesImpl([rawValue, ...rest], accumulator);
  }

  accumulator[attr] = value;
  return extractAttributesImpl(rest, accumulator);
}

function extractSkillsImpl(tokens, skillsAccum, skillNameAccum) {
  if (tokens === []) {
    return skillsAccum;
  }

  const [partialSkillName, maybeSkillScore, ...rest] = tokens;
  if (partialSkillName === ENTRY_END) {
    return [skillsAccum, [maybeSkillScore, ...rest]];
  }

  if (partialSkillName === COMMA) {
    return extractSkillsImpl(
      [maybeSkillScore, ...rest],
      skillsAccum,
      skillNameAccum,
    );
  }

  const skillValue = parseInt(maybeSkillScore);
  if (Number.isNaN(skillValue)) {
    return extractSkillsImpl([maybeSkillScore, ...rest], skillsAccum, [
      ...skillNameAccum,
      partialSkillName,
    ]);
  }

  const skillName = [...skillNameAccum, partialSkillName].join(" ");
  const skills = skillsAccum;
  skills[skillName] = skillValue;

  return extractSkillsImpl(rest, skills, []);
}

function extractArmorAndEquipmentImpl(
  tokens,
  armorAndEquipmentAccum,
  equipmentAccum,
) {
  if (tokens.length === 0) {
    return armorAndEquipmentAccum;
  }

  const [maybeArmor, ...tail] = tokens;

  if (maybeArmor === COMMA && equipmentAccum.length === 0) {
    return extractArmorAndEquipmentImpl(
      tail,
      armorAndEquipmentAccum,
      equipmentAccum,
    );
  }

  const matchesArmor = ARMOR_MATCHER.exec(maybeArmor);
  if (matchesArmor !== null) {
    const [maybeArmorValue, ...rest] = tail;
    const armorName = equipmentAccum.join(" ");
    const armorValue = parseInt(maybeArmorValue);
    return extractArmorAndEquipmentImpl(
      rest,
      {
        ...armorAndEquipmentAccum,
        armor: {
          name: armorName,
          value: armorValue,
        },
      },
      [],
    );
  }

  if (maybeArmor === COMMA || tail.length === 0) {
    const entry =
      tail.length === 0 ? [...equipmentAccum, maybeArmor] : equipmentAccum;
    const equipment = [...armorAndEquipmentAccum.equipment, entry.join(" ")];
    return extractArmorAndEquipmentImpl(
      tail,
      {
        ...armorAndEquipmentAccum,
        equipment,
      },
      [],
    );
  }

  return extractArmorAndEquipmentImpl(tail, armorAndEquipmentAccum, [
    ...equipmentAccum,
    maybeArmor,
  ]);
}

function extractDisordersAndAdaptationsImpl(
  tokens,
  adaptationsAccum,
  adaptationNameAccum,
) {
  const [maybeAdaptation, ...rest] = tokens;

  if (maybeAdaptation === COMMA && adaptationNameAccum.length === 0) {
    return extractDisordersAndAdaptationsImpl(rest, adaptationsAccum, []);
  }

  if (tokens.length === 0) {
    return adaptationsAccum;
  }

  if (adaptationNameAccum[0] === "adapted" && adaptationNameAccum[1] === "to") {
    const adaptations = [...adaptationsAccum.adaptations, maybeAdaptation];
    return extractDisordersAndAdaptationsImpl(
      rest,
      { ...adaptationsAccum, adaptations },
      [],
    );
  }

  if (maybeAdaptation === COMMA || rest.length === 0) {
    const disorder =
      rest.length === 0
        ? [...adaptationNameAccum, maybeAdaptation]
        : adaptationNameAccum;
    const disorders = [...adaptationsAccum.disorders, disorder.join(" ")];
    return extractDisordersAndAdaptationsImpl(
      rest,
      { ...adaptationsAccum, disorders },
      [],
    );
  }

  return extractDisordersAndAdaptationsImpl(rest, adaptationsAccum, [
    ...adaptationNameAccum,
    maybeAdaptation,
  ]);
}

export function ExtractAttributes(tokens) {
  return extractAttributesImpl(tokens, { incomplete: true });
}

export function ExtractSkills(tokens) {
  return extractSkillsImpl(tokens, {}, []);
}

export function ExtractArmorAndEquipment(tokens) {
  return extractArmorAndEquipmentImpl(tokens, { equipment: [] }, []);
}

export function ExtractDisordersAndAdaptations(tokens) {
  return extractDisordersAndAdaptationsImpl(
    tokens,
    { adaptations: [], disorders: [] },
    [],
  );
}

function parseStatBlockImpl(lines, state, statBlock) {
  if (lines.length === 0) {
    return { ...statBlock, notes: statBlock.notes.join("\n") };
  }

  const [firstLine, ...rest] = lines;
  if (state === States.BeginStatblock) {
    if (statBlock.name === undefined) {
      return parseStatBlockImpl(rest, determineNextState(rest[0]), {
        ...statBlock,
        name: firstLine.join(" "),
      });
    }
  }

  if (state === States.Unknown) {
    statBlock.notes.push(firstLine.join(" "));
    return parseStatBlockImpl(rest, determineNextState(rest[0]), statBlock);
  }

  const [tokens, otherLines] = collectTokensUntilNextSection(lines);
  const nextState = determineNextState(otherLines[0]);

  if (state === States.AttributePairs && statBlock.attributes === undefined) {
    const attributes = ExtractAttributes(tokens);
    return parseStatBlockImpl(otherLines, nextState, {
      ...statBlock,
      attributes,
    });
  }

  if (state === States.SkillPairs) {
    const [skills] = ExtractSkills(tokens.slice(1));
    return parseStatBlockImpl(otherLines, nextState, {
      ...statBlock,
      skills,
    });
  }

  if (state === States.Attacks) {
    const groupedAttacks = groupEntriesUntilNextSection(tokens.slice(1));
    const attacks = groupedAttacks.flatMap((group) => {
      const [results, trailingTokens] = ExtractAttacks(group);
      return results.map((a) => {
        return { ...a, notes: trailingTokens.join(" ") };
      });
    });
    return parseStatBlockImpl(otherLines, nextState, {
      ...statBlock,
      attacks,
    });
  }

  if (state === States.ArmorAndEquipment) {
    const armorAndEquipmentGroup = groupEntriesUntilNextSection(
      tokens.slice(1),
    );
    const armorAndEquipment = ExtractArmorAndEquipment(
      armorAndEquipmentGroup.flatMap((subarray, i) => {
        if (i + 1 === armorAndEquipmentGroup.length) {
          return subarray;
        }
        return [...subarray, COMMA];
      }),
    );
    return parseStatBlockImpl(otherLines, nextState, {
      ...statBlock,
      ...armorAndEquipment,
    });
  }

  if (state === States.DisordersAndAdaptations) {
    const disordersAndAdaptationsGroup = groupEntriesUntilNextSection(
      tokens.slice(1),
    );
    const disordersAndAdaptations = ExtractDisordersAndAdaptations(
      disordersAndAdaptationsGroup.flatMap((subarray) => subarray),
    );
    return parseStatBlockImpl(otherLines, nextState, {
      ...statBlock,
      ...disordersAndAdaptations,
    });
  }

  return parseStatBlockImpl(otherLines, nextState, statBlock);
}

export function ParseStatBlock(stream) {
  return parseStatBlockImpl(tokenize(stream), States.BeginStatblock, {
    notes: [],
  });
}
