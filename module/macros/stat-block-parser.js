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

export function ExtractAttributes(tokens) {
  return extractAttributesImpl(tokens, { incomplete: true });
}

export function ExtractSkills(tokens) {
  return extractSkillsImpl(tokens, {}, []);
}
