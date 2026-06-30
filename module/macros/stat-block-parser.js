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

export function tokenize(stream) {
  return stream.split(/\s+/);
}

export class StatblockParser {
  constructor(stream) {
    this.state = States.BeginStatblock;
    this.tokens = tokenize(stream);
  }
}

export function ExtractAttributes(tokens, previousState) {
  if (tokens === []) {
    return [previousState, tokens];
  }

  const [rawAttr, rawValue, ...rest] = tokens;
  let accumulator = previousState;
  if (previousState === undefined) {
    accumulator = { incomplete: true };
  }
  const attr = rawAttr.toLowerCase();
  const value = parseInt(rawValue);
  const currentKeys = Object.keys(accumulator);
  if (
    currentKeys !== ["incomplete"] &&
    currentKeys - Object.keys(Attributes) === ["incomplete"]
  ) {
    delete accumulator.incomplete;
  }

  if (Attributes[attr] == null || Number.isNaN(value)) {
    return [accumulator, tokens];
  }

  accumulator[attr] = value;
  return ExtractAttributes(rest, accumulator);
}
