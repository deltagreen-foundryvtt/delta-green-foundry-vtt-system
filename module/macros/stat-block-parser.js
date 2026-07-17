import { ExtractAttacks } from "./extract-attacks.js";

const SKILL_SECTION = "skills:";
const ATTACKS_SECTION = "attacks:";
const ENTRY_END = ".";

export const States = {
  BeginStatblock: "begin-statblock",
  EndEntry: "end-statblock",
  AttributePairs: "attribute-pair",
  SkillPairs: "skill-pair",
  Attacks: "attack",
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

export function groupEntriesUntilNextSection(tokens) {
  const groups = [];
  const rest = [];

  tokens.reduce((accum, token) => {
    if (token.includes(":") || accum === "DONE") {
      rest.push(token);
      return "DONE";
    }
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

  return [groups, rest];
}

const attributeKeys = Object.keys(Attributes);
export function determineNextState(token) {
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
    default:
      return States.Unknown;
  }
}

function extractAttributesImpl(tokens, accumulator) {
  if (tokens === []) {
    return [accumulator, tokens];
  }

  const currentKeys = new Set(Object.keys(accumulator));
  const expectedKeys = new Set(Object.keys(Attributes));
  if (currentKeys.intersection(expectedKeys).size === expectedKeys.size) {
    delete accumulator.incomplete;
    return [accumulator, tokens];
  }

  const [attr, rawValue, ...rest] = tokens;
  const value = parseInt(rawValue);

  if (Attributes[attr] == null || Number.isNaN(value)) {
    return [accumulator, tokens];
  }

  accumulator[attr] = value;
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

function parseStatBlockImpl(tokens, state, statBlock) {
  if (tokens.length === 0) {
    return statBlock;
  }

  const [nextToken, ...rest] = tokens;
  const nextState = determineNextState(nextToken);

  if (state === States.BeginStatblock && nextState === States.Unknown) {
    const characterNameParts = [...(statBlock.name || []), nextToken];
    return parseStatBlockImpl(rest, state, {
      ...statBlock,
      name: characterNameParts,
    });
  }

  if (state === States.BeginStatblock) {
    const name = (statBlock.name || []).join(" ");
    return parseStatBlockImpl(tokens, nextState, {
      ...statBlock,
      name,
    });
  }

  if (state === States.AttributePairs) {
    const [attributes, remainingTokens] = ExtractAttributes(tokens);
    return parseStatBlockImpl(remainingTokens, States.Unknown, {
      ...statBlock,
      attributes,
    });
  }

  if (nextState === States.SkillPairs) {
    const [skills, remainingTokens] = ExtractSkills(rest);
    return parseStatBlockImpl(remainingTokens, States.Unknown, {
      ...statBlock,
      skills,
    });
  }

  if (nextState === States.Attacks) {
    const [groupedAttacks, remainingTokens] =
      groupEntriesUntilNextSection(rest);
    const attacks = groupedAttacks.flatMap((group) => {
      const [results, trailingTokens] = ExtractAttacks(group);
      return results.map((a) => {
        return { ...a, notes: trailingTokens.join(" ") };
      });
    });
    return parseStatBlockImpl(remainingTokens, States.Unknown, {
      ...statBlock,
      attacks,
    });
  }

  return parseStatBlockImpl(rest, nextState, statBlock);
}

export function ParseStatBlock(stream) {
  return parseStatBlockImpl(tokenize(stream), States.BeginStatblock, {});
}
