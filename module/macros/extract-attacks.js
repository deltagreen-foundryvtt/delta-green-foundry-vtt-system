const ENTRY_END = ".";

const Attacks = {
  damage: "damage",
  armorPiercing: "armor piercing",
  lethality: "lethality",
};

function capitalize(string) {
  const [firstChar, ...rest] = string;
  return [firstChar.toUpperCase(), ...rest].join("");
}

function extractLethalitiesImpl(tokens, accumulator, attackTemplate) {
  const [first, ...rest] = tokens;
  const lethalityPercent = parseInt(first);
  if (Number.isNaN(lethalityPercent)) {
    return [accumulator, tokens];
  }

  return extractLethalitiesImpl(
    rest,
    [...accumulator, { ...attackTemplate, lethality: lethalityPercent }],
    attackTemplate,
  );
}

export function extractLethalities(tokens, attackTemplate) {
  return extractLethalitiesImpl(tokens, [], attackTemplate);
}

function extractAttacksImpl(tokens, accumulatedAttacks, incompleteAttack) {
  if (tokens.length === 0) {
    return [[...accumulatedAttacks, incompleteAttack], tokens];
  }
  const partialAttack = incompleteAttack;
  const [attackName, maybeAttackDetail, ...rest] = tokens;

  if (attackName === Attacks.lethality) {
    const [lethalityAttacks, remainingTokens] = extractLethalities(
      [maybeAttackDetail, ...rest],
      partialAttack,
    );
    if (lethalityAttacks.length === 1) {
      return extractAttacksImpl(remainingTokens, accumulatedAttacks, {
        ...incompleteAttack,
        ...lethalityAttacks[0],
      });
    }
    return extractAttacksImpl(
      remainingTokens,
      [...accumulatedAttacks, ...lethalityAttacks],
      incompleteAttack,
    );
  }

  if (attackName === Attacks.damage) {
    partialAttack.damage = maybeAttackDetail;
    return extractAttacksImpl(rest, accumulatedAttacks, partialAttack);
  }

  const maybeArmorPiercing = [attackName, maybeAttackDetail].join(" ");
  if (maybeArmorPiercing === Attacks.armorPiercing) {
    return extractAttacksImpl(
      [maybeArmorPiercing, ...rest],
      accumulatedAttacks,
      partialAttack,
    );
  }

  const skillModifier = parseInt(maybeAttackDetail);
  if (attackName === Attacks.armorPiercing) {
    partialAttack.armorPiercing = skillModifier;
    return extractAttacksImpl(rest, accumulatedAttacks, partialAttack);
  }

  if (Number.isNaN(skillModifier) && typeof partialAttack.name !== "string") {
    partialAttack.name = [...partialAttack.name, attackName];
    return extractAttacksImpl(
      [maybeAttackDetail, ...rest],
      accumulatedAttacks,
      partialAttack,
    );
  }

  if (typeof partialAttack.name !== "string") {
    partialAttack.name = [...partialAttack.name, attackName]
      .map(capitalize)
      .join(" ");
    partialAttack.skillModifier = skillModifier;
    return extractAttacksImpl(rest, accumulatedAttacks, partialAttack);
  }

  return [accumulatedAttacks, tokens];
}

export function ExtractAttacks(tokens) {
  const simplifiedTokens = tokens.filter(
    (token) => token.replaceAll(/\(|\)/g, "") !== "or",
  );
  return extractAttacksImpl(simplifiedTokens, [], { name: [] });
}
