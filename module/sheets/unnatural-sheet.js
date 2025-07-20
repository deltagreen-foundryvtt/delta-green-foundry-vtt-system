import DGActorSheet from "./base-actor-sheet.js";

/** @extends {DGSheetMixin(ActorSheetV2)} */
export default class DGUnnaturalSheet extends DGActorSheet {
  /** @override */
  static TABS = /** @type {const} */ ({
    primary: {
      initial: "skills",
      labelPrefix: "DG.Navigation",
      tabs: [
        { id: "skills", label: "Skills" },
        { id: "physical", label: "Physical" },
        { id: "gear", label: "Gear" },
        { id: "about", icon: "fas fa-question-circle", label: "" },
      ],
    },
  });

  /** @override */
  static PARTS = /** @type {const} */ ({
    header: {
      template: `${this.TEMPLATE_PATH}/actor/parts/header.html`,
    },
    tabs: {
      template: `templates/generic/tab-navigation.hbs`, // From FoundryVTT
    },
    skills: {
      template: `${this.TEMPLATE_PATH}/actor/parts/skills-tab.html`,
      templates: [
        `${this.TEMPLATE_PATH}/actor/partials/custom-skills-partial.html`,
      ],
      scrollable: [""],
    },
    physical: {
      template: `${this.TEMPLATE_PATH}/actor/parts/physical-tab.html`,
      templates: [
        `${this.TEMPLATE_PATH}/actor/partials/attributes-grid-partial.html`,
      ],
      scrollable: [""],
    },
    gear: {
      template: `${this.TEMPLATE_PATH}/actor/parts/gear-tab.html`,
      scrollable: [""],
    },
    about: {
      template: `${this.TEMPLATE_PATH}/actor/parts/about-tab.html`,
      scrollable: [""],
    },
  });

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.actor.system.notes,
        { async: true },
      );

    return context;
  }
}
