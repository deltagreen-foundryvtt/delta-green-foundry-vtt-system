import { SUPPORTED_ITEM_TYPES } from "../../active-effect/effect-fields.js";
import { getTransferSuppressionReasonKey } from "../../active-effect/documents/dg-active-effect.js";

/** @param {typeof foundry.applications.api.ApplicationV2} Base */
export default function EffectsTabMixin(Base) {
  return class EffectsTabHost extends Base {
    /** @returns {Actor|Item} */
    get _effectsParent() {
      return this.document;
    }

    /**
     * @param {HTMLElement} target
     * @returns {ActiveEffect|undefined}
     */
    _getEffectDocument(target) {
      const effectId = target.closest("[data-effect-id]")?.dataset?.effectId;
      if (!effectId) return undefined;

      const parent = this._effectsParent;
      if (parent.documentName === "Actor") {
        if (target.closest("[data-parent-id]")?.dataset?.parentId) {
          const itemId = target.closest("[data-parent-id]").dataset.parentId;
          return parent.items.get(itemId)?.effects.get(effectId);
        }
        return parent.effects.get(effectId);
      }

      return parent.effects.get(effectId);
    }

    /** @returns {Promise<{ temporary: object[], permanent: object[] }>} */
    async _prepareSheetEffects() {
      const temporary = [];
      const permanent = [];
      const parent = this._effectsParent;

      const effects =
        parent.documentName === "Actor"
          ? parent.allApplicableEffects()
          : parent.effects;

      for (const effect of effects) {
        const entry = {
          id: effect.id,
          name: effect.name,
          img: effect.img,
          disabled: effect.disabled,
          active: effect.active,
          transfer: effect.transfer,
          suppressionReasonKey: getTransferSuppressionReasonKey(effect),
          duration: null,
          source: null,
        };

        if (effect.parent !== parent && parent.documentName === "Actor") {
          entry.source = {
            id: effect.parent.id,
            name: effect.parent.name,
          };
        }

        if (effect.isTemporary) {
          entry.duration = {
            label: effect.duration?.label ?? "",
          };
          temporary.push(entry);
        } else {
          permanent.push(entry);
        }
      }

      return { temporary, permanent };
    }

    /** @override */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      if (this._shouldPrepareSheetEffects()) {
        context.sheetEffects = await this._prepareSheetEffects();
        context.canManageEffects = this.isEditable;
      }
      return context;
    }

    /** @returns {boolean} */
    _shouldPrepareSheetEffects() {
      const parent = this._effectsParent;
      if (parent.documentName === "Actor") {
        return parent.type === "agent";
      }
      return SUPPORTED_ITEM_TYPES.has(parent.type);
    }

    /**
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async createEffect(_event, target) {
      const sheet = /** @type {EffectsTabHost} */ (this);
      const parent = sheet._effectsParent;
      const documentClass = getDocumentClass("ActiveEffect");

      const docData = {
        name: game.i18n.localize("DG.ActiveEffects.DefaultName"),
        img: "systems/deltagreen/assets/icons/magic-shield.svg",
        transfer: SUPPORTED_ITEM_TYPES.has(parent.type),
      };

      await documentClass.create(docData, {
        parent,
        renderSheet: true,
      });
    }

    /**
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static openEffect(_event, target) {
      const sheet = /** @type {EffectsTabHost} */ (this);
      sheet._getEffectDocument(target)?.sheet?.render({ force: true });
    }

    /**
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async deleteEffect(_event, target) {
      const sheet = /** @type {EffectsTabHost} */ (this);
      await sheet._getEffectDocument(target)?.deleteDialog();
    }

    /**
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static async toggleEffect(_event, target) {
      const sheet = /** @type {EffectsTabHost} */ (this);
      const effect = sheet._getEffectDocument(target);
      if (!effect) return;
      await effect.update({ disabled: !effect.disabled });
    }

    /**
     * @param {PointerEvent} _event
     * @param {HTMLElement} target
     */
    static openEffectOrigin(_event, target) {
      const sheet = /** @type {EffectsTabHost} */ (this);
      const itemId = target.closest("[data-parent-id]")?.dataset?.parentId;
      if (!itemId || sheet._effectsParent.documentName !== "Actor") return;
      const item = sheet._effectsParent.items.get(itemId);
      item?.sheet?.render({ force: true });
    }
  };
}
