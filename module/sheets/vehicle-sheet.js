import DGActorSheet from "./base-actor-sheet.js";

/** @extends {DGSheetMixin(ActorSheetV2)} */
export default class DGVehicleSheet extends DGActorSheet {
  /** @override */
  static TABS = /** @type {const} */ ({
    primary: {
      initial: "gear",
      labelPrefix: "DG.Navigation",
      tabs: [
        { id: "gear", label: "Gear" },
        { id: "about", icon: "fas fa-question-circle", label: "" },
      ],
    },
  });

  /** @override */
  static PARTS = /** @type {const} */ ({
    main: {
      template: `${this.TEMPLATE_PATH}/vehicle-sheet.html`,
    },
    tabs: super.PARTS.tabs,
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

    context.enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.actor.system.description,
        { async: true },
      );

    return context;
  }
}
