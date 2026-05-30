import DG from "../../config/index.js";
import { ROLL_TARGET_FIELD_KEYS } from "../effect-fields.js";
import getEffectiveSuppressExhaustion from "./agent-condition-sync.js";

/** @type {WeakMap<Actor, Promise<void>>} */
const syncLocks = new WeakMap();

/**
 * @param {Actor} actor
 * @returns {ActiveEffect[]}
 */
function getExhaustionEffects(actor) {
  return (
    actor.effects?.filter((effect) => effect.getFlag(DG.ID, "exhaustion")) ?? []
  );
}

/**
 * @param {Actor} actor
 * @returns {ActiveEffect|undefined}
 */
function getExhaustionEffect(actor) {
  return getExhaustionEffects(actor)[0];
}

/**
 * @param {number} penalty
 * @returns {object[]}
 */
function buildExhaustionChanges(penalty) {
  const value = String(penalty);
  return ROLL_TARGET_FIELD_KEYS.map((key) => ({
    key,
    type: "add",
    value,
    phase: "final",
  }));
}

/**
 * @param {ActiveEffect} effect
 * @param {number} penalty
 * @param {boolean} suppressExhaustion
 * @returns {boolean}
 */
function effectMatchesState(effect, penalty, suppressExhaustion) {
  if (Boolean(effect.disabled) !== Boolean(suppressExhaustion)) return false;
  const changes = effect.system?.changes ?? [];
  if (changes.length !== ROLL_TARGET_FIELD_KEYS.length) return false;
  return changes.every(
    (change) =>
      ROLL_TARGET_FIELD_KEYS.includes(change.key) &&
      change.type === "add" &&
      String(change.value) === String(penalty),
  );
}

/**
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function pruneDuplicateExhaustionEffects(actor) {
  const effects = getExhaustionEffects(actor);
  if (effects.length <= 1) return;
  for (const effect of effects.slice(1)) {
    await effect.delete();
  }
}

/**
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
async function syncExhaustionEffectInner(actor) {
  if (actor.type !== "agent") return;

  await pruneDuplicateExhaustionEffects(actor);

  const { exhausted, exhaustedPenalty } = actor.system.physical;
  const suppressExhaustion = getEffectiveSuppressExhaustion(actor);
  const effect = getExhaustionEffect(actor);
  const penalty = exhausted ? -1 * Math.abs(Number(exhaustedPenalty) || 0) : 0;

  if (!exhausted) {
    if (effect) await effect.delete();
    return;
  }

  const changes = buildExhaustionChanges(penalty);
  const disabled = Boolean(suppressExhaustion);

  if (effect) {
    if (effectMatchesState(effect, penalty, suppressExhaustion)) return;
    await effect.update({ changes, disabled });
    return;
  }

  const documentClass = foundry.utils.getDocumentClass("ActiveEffect");
  await documentClass.create(
    {
      name: game.i18n.localize("DG.Physical.ExhaustionEffectName"),
      img: "systems/deltagreen/assets/icons/magic-shield.svg",
      transfer: false,
      disabled,
      changes,
      flags: { [DG.ID]: { exhaustion: true } },
    },
    { parent: actor },
  );
}

/**
 * Keeps the embedded exhaustion Active Effect aligned with physical exhaustion data.
 *
 * @param {Actor} actor
 * @returns {Promise<void>}
 */
export async function syncExhaustionEffect(actor) {
  const pending = syncLocks.get(actor);
  if (pending) return pending;

  const promise = syncExhaustionEffectInner(actor).finally(() => {
    if (syncLocks.get(actor) === promise) syncLocks.delete(actor);
  });
  syncLocks.set(actor, promise);
  return promise;
}

/**
 * @param {object} data Actor update payload.
 * @returns {boolean}
 */
export function updateTouchesExhaustionPhysical(data) {
  if (!data) return false;

  const physical = foundry.utils.getProperty(data, "system.physical");
  if (physical) {
    if (
      "exhausted" in physical ||
      "exhaustedPenalty" in physical ||
      "suppressExhaustion" in physical
    ) {
      return true;
    }
  }

  return [
    "system.physical.exhausted",
    "system.physical.exhaustedPenalty",
    "system.physical.suppressExhaustion",
  ].some((key) => foundry.utils.hasProperty(data, key));
}
