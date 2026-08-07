import DGActorSheet from "./base-actor-sheet.js";

/** @extends {DGActorSheet} */
export default class DGNPCSheet extends DGActorSheet {
  /** @override */
  static TABS = /** @type {const} */ ({
    primary: {
      initial: "skills",
      labelPrefix: "DG.Navigation.NPC",
      tabs: [{ id: "skills" }, { id: "gear" }],
    },
  });

  /** @override */
  static PARTS = /** @type {const} */ ({
    header: this.BASE_PARTS.header,
    statistics: {
      template: `${this.TEMPLATE_PATH}/partials/attributes-grid-partial.html`,
    },
    tabs: this.BASE_PARTS.tabs,
    skills: this.BASE_PARTS.skills,
    gear: this.BASE_PARTS.gear,
  });

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Override physical attribute title.
    context.physicalAttributesTitle = game.i18n.localize(
      "DG.Sheet.BlockHeaders.Statistics",
    );

    return context;
  }
}
