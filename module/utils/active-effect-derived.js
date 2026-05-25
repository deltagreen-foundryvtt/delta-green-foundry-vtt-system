import {
  applyAgentResourceMaxBonuses,
  calculateHealthMax,
  setSkillTargetProficiencies,
  calculateMeleeDamageBonusFormula,
  clampSanityRitualValue,
  prepareAgentSkillFlags,
  prepareBreakingPointHit,
  prepareStatisticsX5,
} from "./derived-actor-data.js";

/**
 * @param {number} current
 * @param {number} base
 * @returns {string}
 */
function getActiveEffectModificationClass(current, base) {
  if (current == null || base == null || current === base) return "";
  return current > base ? "ae-mod-increase" : "ae-mod-decrease";
}

/**
 * Attach sheet display classes comparing prepared data to persisted source (pre–AE).
 * @param {Actor} actor
 * @returns {void}
 */
export function prepareAgentActiveEffectDisplay(actor) {
  if (actor.type !== "agent") return;

  const system = actor.system;
  const source = actor._source?.system;
  if (!source) return;

  for (const [key, stat] of Object.entries(system.statistics ?? {})) {
    const baseValue = source.statistics?.[key]?.value;
    const effective = stat.effectiveValue ?? stat.value;
    stat.valueDisplayClass = getActiveEffectModificationClass(
      effective,
      baseValue,
    );
    stat.statisticAeModifier = stat.valueDisplayClass
      ? effective - (baseValue ?? 0)
      : 0;
  }

  const persistedStats = source.statistics ?? system.statistics;
  const healthFormulaMax = calculateHealthMax(persistedStats, persistedStats);
  const wpFormulaMax = persistedStats.pow?.value ?? 0;
  const persistedUnnatural =
    source.skills?.unnatural?.proficiency ?? system.skills?.unnatural?.proficiency ?? 0;
  const sanityFormulaMax = 99 - persistedUnnatural;

  const healthBaseMax = healthFormulaMax + (source.health?.maxBonus ?? 0);
  system.health.maxDisplayClass = getActiveEffectModificationClass(
    system.health.max,
    healthBaseMax,
  );

  const wpBaseMax = wpFormulaMax + (source.wp?.maxBonus ?? 0);
  system.wp.maxDisplayClass = getActiveEffectModificationClass(
    system.wp.max,
    wpBaseMax,
  );

  const sanityBaseMax = sanityFormulaMax + (source.sanity?.maxBonus ?? 0);
  system.sanity.maxDisplayClass = getActiveEffectModificationClass(
    system.sanity.max,
    sanityBaseMax,
  );
}

/**
 * Recompute agent fields that depend on Active Effects (final phase) and refresh sheet display.
 * Single post-AE pass for agents — do not mirror this logic in AgentData.prepareDerivedData.
 * @param {Actor} actor
 * @returns {void}
 */
export function refreshDerivedAfterActiveEffects(actor) {
  if (actor.type !== "agent") return;

  const system = actor.system;

  const sourceStatistics = actor._source?.system?.statistics;
  prepareStatisticsX5(system.statistics, sourceStatistics);
  applyAgentResourceMaxBonuses(system, sourceStatistics);
  setSkillTargetProficiencies(system.skills);
  setSkillTargetProficiencies(system.typedSkills);
  prepareAgentSkillFlags(system.skills);
  clampSanityRitualValue(system.sanity);
  prepareBreakingPointHit(system.sanity);
  system.statistics.str.meleeDamageBonusFormula =
    calculateMeleeDamageBonusFormula(
      system.statistics.str.effectiveValue ?? system.statistics.str.value,
    );

  prepareAgentActiveEffectDisplay(actor);
}
