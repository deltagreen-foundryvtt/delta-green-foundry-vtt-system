import {
  applyAgentResourceMaxBonuses,
  calculateHealthMax,
  setSkillTargetProficiencies,
  calculateMeleeDamageBonusFormula,
  clampSanityRitualValue,
  prepareAgentSkillFlags,
  prepareBreakingPointHit,
  prepareStatisticsX5,
} from "../../data/derived/actor-derived.js";

/**
 * @param {number} current
 * @param {number} base
 * @returns {string}
 */
export function getActiveEffectModificationClass(current, base) {
  if (current == null || base == null || current === base) return "";
  return current > base ? "ae-mod-increase" : "ae-mod-decrease";
}

/**
 * Sheet color for roll-target modifiers (uses modifier sign, not clamped effective vs base).
 * @param {number} modifier
 * @returns {string}
 */
export function getRollTargetDisplayClassFromModifier(modifier) {
  const numericModifier = Number(modifier) || 0;
  if (!numericModifier) return "";
  return numericModifier > 0 ? "ae-mod-increase" : "ae-mod-decrease";
}

/**
 * Apply a roll-target Active Effect modifier with the same clamp rules as percentile rolls.
 * @param {number} base
 * @param {number} modifier
 * @param {{ allowOver99?: boolean }} [options]
 * @returns {number}
 */
export function clampPercentileRollTarget(
  base,
  modifier,
  { allowOver99 = false } = {},
) {
  const numericBase = Number(base);
  const numericModifier = Number(modifier) || 0;
  if (!numericModifier || !Number.isFinite(numericBase)) return numericBase;

  let target = Math.round(numericBase + numericModifier);
  target = Math.max(1, target);
  if (!allowOver99) {
    target = Math.min(target, 99);
  }
  return target;
}

/**
 * @param {object} entry
 * @param {number} modifier
 */
function attachRollTargetDisplay(entry, modifier) {
  const numericModifier = Number(modifier) || 0;
  if (!numericModifier) {
    entry.rollTargetDisplayClass = "";
    return;
  }

  entry.rollTargetDisplayClass =
    getRollTargetDisplayClassFromModifier(numericModifier);
}

/**
 * Sheet display for agent roll-target Active Effects (skills, stats x5, SAN).
 * @param {Actor} actor
 * @returns {void}
 */
export function prepareAgentRollTargetDisplay(actor) {
  if (actor.type !== "agent") return;

  const { system } = actor;
  const { rollTarget } = system;
  if (!rollTarget) return;

  const allSkillsMod = Number(rollTarget.allSkills) || 0;
  const sanityMod = Number(rollTarget.sanity) || 0;
  const statisticsMod = Number(rollTarget.statistics) || 0;

  for (const skill of Object.values(system.skills ?? {})) {
    attachRollTargetDisplay(skill, allSkillsMod);
  }

  for (const skill of Object.values(system.typedSkills ?? {})) {
    attachRollTargetDisplay(skill, allSkillsMod);
  }

  attachRollTargetDisplay(system.sanity, sanityMod);

  for (const stat of Object.values(system.statistics ?? {})) {
    attachRollTargetDisplay(stat, statisticsMod);
  }
}

/**
 * Attach sheet display classes comparing prepared data to persisted source (pre–AE).
 * @param {Actor} actor
 * @returns {void}
 */
export function prepareAgentActiveEffectDisplay(actor) {
  if (actor.type !== "agent") return;

  const { system } = actor;
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
    source.skills?.unnatural?.proficiency ??
    system.skills?.unnatural?.proficiency ??
    0;
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

  const { system } = actor;

  const sourceStatistics = actor._source?.system?.statistics;
  prepareStatisticsX5(system.statistics, sourceStatistics);
  prepareAgentRollTargetDisplay(actor);
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
