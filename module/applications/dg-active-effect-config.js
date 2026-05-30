import DG from "../config/index.js";
import {
  buildEffectFieldSelectOptions,
  getEffectFieldGroupsForDocument,
} from "../active-effect/effect-fields.js";

const { renderTemplate } = foundry.applications.handlebars;
const { ActiveEffectConfig } = foundry.applications.sheets;

const DG_CHANGE_TYPES = ["add", "subtract", "override"];

/** @extends {foundry.applications.sheets.ActiveEffectConfig} */
export default class DGActiveEffectConfig extends ActiveEffectConfig {
  /** @type {Record<string, string>|null} */
  #dgChangeTypes = null;

  /** @type {Array<object>|null} */
  #fieldGroups = null;

  /** @returns {Record<string, string>} */
  #getDgChangeTypes() {
    if (!this.#dgChangeTypes) {
      this.#dgChangeTypes = DG_CHANGE_TYPES.reduce((types, type) => {
        const label = ActiveEffect.CHANGE_TYPES[type]?.label;
        types[type] = label ? game.i18n.localize(label) : type;
        return types;
      }, {});
    }
    return this.#dgChangeTypes;
  }

  /** @returns {Array<object>} */
  #getFieldGroups() {
    if (!this.#fieldGroups) {
      const groups = getEffectFieldGroupsForDocument(this.document);
      this.#fieldGroups = buildEffectFieldSelectOptions(groups);
    }
    return this.#fieldGroups;
  }

  /** @override */
  _processChangeSubmission(change, index) {
    super._processChangeSubmission(change, index);
    if (!change.phase) change.phase = "final";
  }

  /** @override */
  async _renderChange(context) {
    const { change, index } = context;
    if (typeof change.value !== "string") {
      change.value = JSON.stringify(change.value);
    }
    if (!change.phase) change.phase = "final";

    Object.assign(
      change,
      ["key", "type", "value", "phase", "priority"].reduce((paths, fieldName) => {
        paths[`${fieldName}Path`] = `system.changes.${index}.${fieldName}`;
        return paths;
      }, {}),
    );

    return renderTemplate(
      `systems/${DG.ID}/templates/active-effect/change-row.html`,
      {
        ...context,
        fieldGroups: this.#getFieldGroups(),
        dgChangeTypes: this.#getDgChangeTypes(),
      },
    );
  }
}
