import DG from "../config.js";
import { syncExhaustionEffect } from "./exhaustion-effect.js";

/**
 * @param {Actor} actor
 * @returns {ActiveEffect[]}
 */
function getStimulantEffects(actor) {
  return (
    actor.effects?.filter((effect) => effect.getFlag(DG.ID, "stimulant")) ?? []
  );
}

/**
 * @param {Actor} actor
 * @returns {ActiveEffect|undefined}
 */
function getStimulantEffect(actor) {
  return getStimulantEffects(actor).find((effect) => !effect.isSuppressed);
}

/**
 * @param {Actor} actor
 * @returns {boolean}
 */
export function hasActiveStimulantEffect(actor) {
  return getStimulantEffects(actor).some((effect) => !effect.isSuppressed);
}

/**
 * @param {ActiveEffect} effect
 * @returns {number}
 */
function getStimulantRemainingHours(effect) {
  effect.updateDuration();
  const { remaining, secondsRemaining, units } = effect.duration ?? {};
  if (Number.isFinite(remaining) && remaining > 0 && units === "hours") {
    return Math.ceil(remaining);
  }
  if (Number.isFinite(secondsRemaining) && secondsRemaining > 0) {
    const { calendar } = game.time;
    const components = calendar.difference(
      game.time.worldTime + secondsRemaining,
      game.time.worldTime,
    );
    const hours = calendar.componentsToUnit(components, "hour", {
      roundFn: "ceil",
    });
    return Math.max(0, Math.ceil(Math.abs(hours)));
  }
  return 0;
}

/**
 * Persisted manual suppress or an active stimulant AE.
 * @param {Actor} actor
 * @returns {boolean}
 */
export function getEffectiveSuppressExhaustion(actor) {
  const persisted =
    actor._source?.system?.physical?.suppressExhaustion ?? false;
  return Boolean(persisted) || hasActiveStimulantEffect(actor);
}

/**
 * @param {number} hours
 * @returns {object}
 */
function buildStimulantEffectData(hours) {
  return {
    name: game.i18n.localize("DG.Physical.StimulantsEffectName"),
    img: "systems/deltagreen/assets/icons/tablet.svg",
    transfer: false,
    disabled: false,
    start: { time: game.time.worldTime },
    duration: {
      value: hours,
      units: "hours",
    },
    changes: [],
    flags: { [DG.ID]: { stimulant: true } },
  };
}

/**
 * Create or refresh the stimulant AE; duration is max(remaining, newHours).
 * @param {Actor} actor
 * @param {number} newHours
 * @returns {Promise<number>} Hours applied on the stimulant AE.
 */
export async function applyStimulantEffect(actor, newHours) {
  if (actor.type !== "agent") return 0;

  const rolledHours = Math.max(1, Math.ceil(Number(newHours) || 0));
  const existing = getStimulantEffect(actor);
  const remainingHours = existing ? getStimulantRemainingHours(existing) : 0;
  const hours = Math.max(remainingHours, rolledHours);

  const data = buildStimulantEffectData(hours);

  if (existing) {
    await existing.update({
      start: data.start,
      duration: data.duration,
      changes: data.changes,
      disabled: false,
    });
    return hours;
  }

  const documentClass = getDocumentClass("ActiveEffect");
  await documentClass.create(data, { parent: actor });
  return hours;
}

/**
 * @param {Actor} actor
 * @returns {ActiveEffect[]}
 */
function getExpiredStimulantEffects(actor) {
  return getStimulantEffects(actor).filter(
    (effect) => effect.duration?.expired,
  );
}

/**
 * Remove stimulant AEs that have expired.
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export async function pruneExpiredStimulantEffects(actor) {
  if (actor.type !== "agent") return;
  const expired = getExpiredStimulantEffects(actor);
  if (!expired.length) return;
  await actor.deleteEmbeddedDocuments(
    "ActiveEffect",
    expired.map((effect) => effect.id),
  );
}

/**
 * Delete all stimulant AEs on the actor (e.g. after a full rest).
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export async function clearStimulantEffects(actor) {
  if (actor.type !== "agent") return;
  const effects = getStimulantEffects(actor);
  if (!effects.length) return;
  await actor.deleteEmbeddedDocuments(
    "ActiveEffect",
    effects.map((effect) => effect.id),
  );
}

/**
 * @returns {Promise<void>}
 */
export async function pruneAllAgentsExpiredStimulants() {
  if (!game.user.isActiveGM) return;
  for (const actor of game.actors) {
    if (actor.type !== "agent") continue;
    await pruneExpiredStimulantEffects(actor);
    await syncExhaustionEffect(actor);
  }
}
