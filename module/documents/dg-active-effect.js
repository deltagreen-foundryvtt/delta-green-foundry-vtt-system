/**
 * @param {ActiveEffect} effect
 * @returns {Item|undefined}
 */
function resolveTransferItem(effect) {
  const item = effect.parent;
  if (item?.documentName !== "Item") return undefined;

  const actor = item.actor;
  if (actor?.documentName === "Actor") {
    return actor.items.get(item.id) ?? item;
  }
  return item;
}

/**
 * @param {Item} item
 * @returns {{ inactive: boolean, reasonKey: string|null }}
 */
export function getTransferSuppressionState(item) {
  switch (item.type) {
    case "weapon":
    case "armor":
    case "gear":
      if (item.system.equipped !== true) {
        return {
          inactive: true,
          reasonKey: "DG.ActiveEffects.SuppressedNotEquipped",
        };
      }
      return { inactive: false, reasonKey: null };
    case "motivation":
      if (item.system.acuteEpisode !== true) {
        return {
          inactive: true,
          reasonKey: "DG.ActiveEffects.SuppressedAcuteEpisode",
        };
      }
      return { inactive: false, reasonKey: null };
    case "tome":
    case "ritual":
      return {
        inactive: true,
        reasonKey: "DG.ActiveEffects.SuppressedUnsupportedItem",
      };
    case "bond":
      return { inactive: false, reasonKey: null };
    default:
      return { inactive: false, reasonKey: null };
  }
}

/**
 * @param {Item} item
 * @returns {boolean} True when a transfer effect on this item should not apply.
 */
export function isTransferEffectInactive(item) {
  return getTransferSuppressionState(item).inactive;
}

/**
 * @param {ActiveEffect} effect
 * @returns {string|null} Localization key for why a transfer effect is inactive.
 */
export function getTransferSuppressionReasonKey(effect) {
  const item = resolveTransferItem(effect);
  if (!item || !effect.transfer) return null;
  return getTransferSuppressionState(item).reasonKey;
}

/** @extends {foundry.documents.ActiveEffect} */
export default class DGActiveEffect extends ActiveEffect {
  /** @override */
  get isSuppressed() {
    if (this.disabled || this.duration?.expired) return true;
    if (this.system?.isSuppressed) return true;
    if (!this.transfer) return false;

    const item = resolveTransferItem(this);
    if (!item) return false;

    return isTransferEffectInactive(item);
  }
}
