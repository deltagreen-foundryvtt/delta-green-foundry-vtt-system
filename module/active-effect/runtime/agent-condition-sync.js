import DG from "../../config/index.js";

/**
 * @param {Actor} actor
 * @returns {boolean}
 */
function hasActiveStimulantEffect(actor) {
  return (
    actor.effects?.some(
      (effect) => effect.getFlag(DG.ID, "stimulant") && !effect.isSuppressed,
    ) ?? false
  );
}

/**
 * Persisted manual suppress or an active stimulant AE.
 *
 * @param {Actor} actor
 * @returns {boolean}
 */
export default function getEffectiveSuppressExhaustion(actor) {
  const persisted =
    actor._source?.system?.physical?.suppressExhaustion ?? false;
  return Boolean(persisted) || hasActiveStimulantEffect(actor);
}
