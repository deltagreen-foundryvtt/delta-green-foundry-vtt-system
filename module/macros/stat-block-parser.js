import { ExtractAttacks } from "./extract-attacks.js";

const SKILL_SECTION = "skills";
const ATTACKS_SECTION = "attacks";
const SECTION_BEGINNING = ":";
const ENTRY_END = ".";

export const States = {
  BeginStatblock: "begin-statblock",
  EndStatblock: "end-statblock",
  AttributePair: "attribute-pair",
  SkillPair: "skill-pair",
  Attack: "attack",
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

const Attacks = {
  damage: "damage",
  armorPiercing: "armor piercing",
  lethality: "lethality",
};

const EXTRANEOUS_CHARACTERS = /%|,/g;
const SECTION_TERMINATOR = /(.+)\./g;

export function tokenize(stream) {
  return stream
    .toLowerCase()
    .split(/\s+/)
    .flatMap((token) => {
      const strippedToken = token.replaceAll(EXTRANEOUS_CHARACTERS, "");
      const sectionTerminatorMatch = SECTION_TERMINATOR.exec(strippedToken);
      if (sectionTerminatorMatch !== null) {
        return [sectionTerminatorMatch[1], ENTRY_END];
      }
      return strippedToken;
    });
}

function capitalize(string) {
  const [firstChar, ...rest] = string;
  return [firstChar.toUpperCase(), ...rest].join("");
}

export class StatblockParser {
  constructor(stream) {
    this.state = States.BeginStatblock;
    this.tokens = tokenize(stream);
  }
}

function extractAttributesImpl(tokens, accumulator) {
  if (tokens === []) {
    return [accumulator, tokens];
  }

  const [attr, rawValue, ...rest] = tokens;
  const value = parseInt(rawValue);

  if (Attributes[attr] == null || Number.isNaN(value)) {
    return [accumulator, tokens];
  }

  accumulator[attr] = value;
  const currentKeys = new Set(Object.keys(accumulator));
  const expectedKeys = new Set(Object.keys(Attributes));
  if (currentKeys.intersection(expectedKeys).size === expectedKeys.size) {
    delete accumulator.incomplete;
    return [accumulator, rest];
  }

  return extractAttributesImpl(rest, accumulator);
}

function extractSkillsImpl(tokens, skillsAccum, skillNameAccum) {
  if (tokens === []) {
    return [skillsAccum, tokens];
  }

  const [partialSkillName, maybeSkillScore, ...rest] = tokens;
  if (partialSkillName === ENTRY_END) {
    return [skillsAccum, [maybeSkillScore, ...rest]];
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

function extractLethalities(tokens, accumulator, attackTemplate) {
  const [first, ...rest] = tokens;
  const maybeLethalityValue = first.replaceAll(/\(|\)/g, "");
  if (maybeLethalityValue === "or") {
    const attack = JSON.parse(JSON.stringify(attackTemplate));
    return extractLethalities(rest, [...accumulator, attack], attackTemplate);
  }

  if (maybeLethalityValue === ENTRY_END) {
    const attack = JSON.parse(JSON.stringify(attackTemplate));
    return [[...accumulator, attack], rest];
  }

  const lethalityValue = parseInt(maybeLethalityValue.replaceAll(/\D+/g, ""));
  if (Number.isNaN(lethalityValue)) {
    return [accumulator, tokens];
  }

  return extractLethalities(rest, accumulator, {
    ...attackTemplate,
    lethality: lethalityValue,
  });
}

function extractAttacksImpl(tokens, accumulator, incompleteAttack) {
  if (tokens.length === 0) {
    return [accumulator, tokens];
  }

  const attackAccumulator = incompleteAttack;
  const [attackName, maybeAttackDetail, ...rest] = tokens;

  if (attackName === ENTRY_END) {
    return [
      [incompleteAttack, ...accumulator],
      [maybeAttackDetail, ...rest],
    ];
  }
  if (attackName.length <= 3 && attackName.includes("or")) {
    return extractAttacksImpl(
      [maybeAttackDetail, ...rest],
      accumulator,
      incompleteAttack,
    );
  }

  if (attackName === Attacks.lethality) {
    const [updatedAccumulator, remainingTokens] = extractLethalities(
      [maybeAttackDetail, ...rest],
      accumulator,
      incompleteAttack,
    );
    return extractAttacksImpl(
      remainingTokens,
      updatedAccumulator,
      incompleteAttack,
    );
  }

  if (attackName === Attacks.damage) {
    attackAccumulator.damage = maybeAttackDetail;
    return extractAttacksImpl(rest, accumulator, incompleteAttack);
  }

  const maybeArmorPiercing = [attackName, maybeAttackDetail].join(" ");
  if (maybeArmorPiercing === Attacks.armorPiercing) {
    return extractAttributesImpl(
      [maybeArmorPiercing, ...rest],
      accumulator,
      incompleteAttack,
    );
  }

  const skillModifier = parseInt(maybeAttackDetail);
  if (attackName === Attacks.armorPiercing) {
    attackAccumulator.armorPiercing = skillModifier;
  }

  if (
    Number.isNaN(skillModifier) &&
    typeof attackAccumulator.name !== "string"
  ) {
    attackAccumulator.name = [...incompleteAttack.name, attackName];
    return extractAttacksImpl(
      [maybeAttackDetail, ...rest],
      accumulator,
      attackAccumulator,
    );
  }

  if (typeof attackAccumulator.name !== "string") {
    attackAccumulator.name = [...attackAccumulator.name, attackName]
      .map(capitalize)
      .join(" ");
    attackAccumulator.skillModifier = skillModifier;
    return extractAttacksImpl(rest, accumulator, attackAccumulator);
  }

  return [accumulator, tokens];
}

export function ExtractAttributes(tokens) {
  return extractAttributesImpl(tokens, { incomplete: true });
}

export function ExtractSkills(tokens) {
  return extractSkillsImpl(tokens, {}, []);
}

export function ExtractAttacks(tokens) {
  return extractAttacksImpl(tokens, [], { name: [] });
}
