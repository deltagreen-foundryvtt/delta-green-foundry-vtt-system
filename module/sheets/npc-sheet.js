import DGActorSheet from "./base-actor-sheet.js";

/** @extends {DGActorSheet} */
export default class DGNPCSheet extends DGActorSheet {
  /** @override */
  static TABS = /** @type {const} */ ({
    primary: {
      initial: "skills",
      labelPrefix: "DG.Navigation",
      tabs: [
        { id: "skills", label: "Skills" },
        { id: "gear", label: "Gear" },
        { id: "about", icon: "fas fa-question-circle", label: "" },
      ],
    },
  });

  /** @override */
  static PARTS = /** @type {const} */ ({
    header: {
      template: `${this.TEMPLATE_PATH}/parts/header.html`,
    },
    physical: {
      template: `${this.TEMPLATE_PATH}/partials/attributes-grid-partial.html`,
    },
    tabs: super.PARTS.tabs,
    skills: {
      template: `${this.TEMPLATE_PATH}/parts/skills-tab.html`,
      templates: [`${this.TEMPLATE_PATH}/partials/custom-skills-partial.html`],
      scrollable: [""],
    },
    gear: {
      template: `${this.TEMPLATE_PATH}/parts/gear-tab.html`,
      scrollable: [""],
    },
    about: {
      template: `${this.TEMPLATE_PATH}/parts/about-tab.html`,
      scrollable: [""],
    },
  });

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Override physical attribute title.
    context.physicalAttributesTitle = game.i18n.localize(
      "DG.Sheet.BlockHeaders.Statistics",
    );

    context.enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.actor.system.notes,
        { async: true },
      );

    return context;
  }
}
