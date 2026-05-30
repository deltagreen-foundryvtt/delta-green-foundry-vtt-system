import DG from "../../config/index.js";
import { getStatisticEffectiveValue } from "../../data/derived/actor-derived.js";

/**
 * Strip form values that match post–AE prepared numbers so persisted data stays at base values.
 * @param {Actor} actor
 * @param {object} data Update payload (mutated in place).
 * @returns {object}
 */
export function sanitizeActiveEffectBackedUpdateData(actor, data) {
  if (!data?.system) return data;

  const source = actor._source?.system;
  if (!source) return data;

  sanitizeStatisticValues(actor, data, source);

  return data;
}

/**
 * @param {Actor} actor
 * @param {object} data
 * @param {object} source
 */
function sanitizeStatisticValues(actor, data, source) {
  for (const key of DG.statistics) {
    const submitted = foundry.utils.getProperty(
      data,
      `system.statistics.${key}.value`,
    );
    if (submitted === undefined) continue;

    const sourceStat = source.statistics?.[key];
    const preparedStat = actor.system.statistics?.[key];
    if (!sourceStat || !preparedStat) continue;

    const base = sourceStat.value;
    const effective = getStatisticEffectiveValue(preparedStat, sourceStat);

    if (submitted === effective && submitted !== base) {
      foundry.utils.setProperty(data, `system.statistics.${key}.value`, base);
    }
  }
}
