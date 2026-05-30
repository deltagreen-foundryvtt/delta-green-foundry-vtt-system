/**
 * Shared derived-data helpers for actor TypeDataModels.
 *
 * Active Effect validation layers (do not duplicate clamp logic elsewhere):
 * - Schema `NumberField` min/max: enforced when values pass through `field.clean()`
 *   (document updates, Active Effect `applyChange` on registered paths).
 * - `cleanDerivedNumber`: use when assigning derived fields in code (e.g. `health.max`,
 *   `sanity.max`); plain assignment bypasses schema cleaners unless the path has a NumberField.
 * - `clampStatisticValue`: effective ratings after statistic modifier AEs (min 0).
 * - `applyAgentResourceMaxBonuses`: recompute resource max after AE;
 *   agents call these only from `refreshDerivedAfterActiveEffects` (post–final phase).
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
 * @param {number} value
 * @returns {number}
 */
function clampStatisticValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric));
}

/**
 * Effective statistic rating: persisted value plus AE modifier (minimum 0).
 * @param {object} stat Prepared statistic.
 * @param {object} [sourceStat] Persisted statistic from `_source`.
 * @returns {number}
 */
export function getStatisticEffectiveValue(stat, sourceStat) {
  const base = clampStatisticValue(sourceStat?.value ?? stat?.value);
  const modifier = Number(stat?.modifier) || 0;
  return clampStatisticValue(base + modifier);
}

/**
 * @param {object} statistics
 * @param {object} [sourceStatistics] Persisted statistics from `_source`.
 * @returns {void}
 */
export function prepareStatisticsX5(statistics, sourceStatistics) {
  for (const [key, statistic] of Object.entries(statistics ?? {})) {
    statistic.effectiveValue = getStatisticEffectiveValue(
      statistic,
      sourceStatistics?.[key],
    );
    statistic.x5 = statistic.effectiveValue * 5;
  }
}

/**
 * Clamp a derived numeric value through the TypeDataModel field definition when available.
 * @param {foundry.abstract.TypeDataModel} model
 * @param {string} path Dot-delimited path (e.g. "health.max")
 * @param {number} raw
 * @returns {number}
 */
export function cleanDerivedNumber(model, path, raw) {
  const field = model.getFieldForProperty?.(path);
  const numeric = Number(raw);
  if (!field) {
    return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
  }
  return field.clean(numeric, { persisted: false });
}

/**
 * @param {object} statistics
 * @returns {number}
 */
export function calculateHealthMax(statistics, sourceStatistics) {
  try {
    return Math.ceil(
      (getStatisticEffectiveValue(statistics.con, sourceStatistics?.con) +
        getStatisticEffectiveValue(statistics.str, sourceStatistics?.str)) /
        2,
    );
  } catch {
    return 10;
  }
}

/**
 * @param {foundry.abstract.TypeDataModel} model Agent system TypeDataModel.
 * @returns {void}
 */
export function applyAgentResourceMaxBonuses(model, sourceStatistics) {
  const sourceStats = sourceStatistics ?? model._source?.statistics;
  model.health.max = cleanDerivedNumber(
    model,
    "health.max",
    calculateHealthMax(model.statistics, sourceStats) +
      (model.health.maxBonus ?? 0),
  );
  model.wp.max = cleanDerivedNumber(
    model,
    "wp.max",
    getStatisticEffectiveValue(model.statistics.pow, sourceStats?.pow) +
      (model.wp.maxBonus ?? 0),
  );
  model.sanity.max = cleanDerivedNumber(
    model,
    "sanity.max",
    99 - model.skills.unnatural.proficiency + (model.sanity.maxBonus ?? 0),
  );
}

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
    sanity.currentBreakingPoint =
      sanity.value - (statistics.pow.effectiveValue ?? statistics.pow.value);
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
