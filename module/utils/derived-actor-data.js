/**
 * Shared derived-data helpers for actor TypeDataModels.
 */

/**
 * @param {Item[]} items
 * @returns {number}
 */
export function computeEquippedArmorProtection(items) {
  let protection = 0;
  for (const item of items) {
    if (item.type === "armor" && item.system.equipped === true) {
      protection += item.system.protection;
    }
  }
  return protection;
}

/**
 * @param {number} strengthValue
 * @returns {string}
 */
export function calculateMeleeDamageBonusFormula(strengthValue) {
  if (strengthValue < 5) return "-2";
  if (strengthValue < 9) return "-1";
  if (strengthValue > 12 && strengthValue < 17) return "+1";
  if (strengthValue > 16) return "+2";
  return "";
}

/**
 * @param {object} statistics
 * @returns {void}
 */
export function prepareStatisticsX5(statistics) {
  for (const statistic of Object.values(statistics)) {
    statistic.x5 = statistic.value * 5;
  }
}

/**
 * @param {object} skills
 * @returns {void}
 */
export function setSkillTargetProficiencies(skills) {
  for (const skill of Object.values(skills)) {
    skill.targetProficiency = skill.proficiency;
  }
}

/**
 * @param {object} sanity
 * @param {object} statistics
 * @returns {void}
 */
export function initializeSanityIfUnset(sanity, statistics) {
  if (sanity.value >= 100) {
    sanity.value = statistics.pow.x5;
    sanity.currentBreakingPoint = sanity.value - statistics.pow.value;
  }
}

/**
 * @param {object} sanity
 * @returns {void}
 */
export function clampSanityRitualValue(sanity) {
  sanity.ritual = 99 - sanity.value;

  if (sanity.ritual > 99) {
    sanity.ritual = 99;
  } else if (sanity.ritual < 1) {
    sanity.ritual = 1;
  }
}

/**
 * @param {object} adaptations
 * @returns {void}
 */
export function prepareSanityAdaptations(adaptations) {
  adaptations.violence.isAdapted =
    adaptations.violence.incident1 &&
    adaptations.violence.incident2 &&
    adaptations.violence.incident3;

  adaptations.helplessness.isAdapted =
    adaptations.helplessness.incident1 &&
    adaptations.helplessness.incident2 &&
    adaptations.helplessness.incident3;
}

/**
 * @param {object} sanity
 * @returns {void}
 */
export function prepareBreakingPointHit(sanity) {
  sanity.breakingPointHit = sanity.value <= sanity.currentBreakingPoint;
}

/**
 * @param {object} skills
 * @returns {void}
 */
export function prepareAgentSkillFlags(skills) {
  for (const [key, skill] of Object.entries(skills)) {
    skill.cannotBeImprovedByFailure =
      key === "unnatural" || key === "luck" || key === "ritual";
    skill.isCalculatedValue = key === "ritual";
    skill.targetProficiency = skill.proficiency;
  }
}

/**
 * @param {object} system
 * @returns {void}
 */
export function removeLegacyRitualSkill(system) {
  try {
    delete system.skills.ritual;
  } catch {
    // Legacy field may be absent or non-configurable.
  }
}

/**
 * @param {object} statistics
 * @returns {number}
 */
export function calculateHealthMax(statistics) {
  try {
    return Math.ceil(
      (statistics.con.value + statistics.str.value) / 2,
    );
  } catch {
    return 10;
  }
}
