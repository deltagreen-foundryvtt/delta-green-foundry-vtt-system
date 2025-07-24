import DGActorSheet from "./base-actor-sheet.js";

/** @extends {DGSheetMixin(ActorSheetV2)} */
export default class DGVehicleSheet extends DGActorSheet {
  /** @override */
  static TABS = /** @type {const} */ ({
    primary: {
      initial: "gear",
      labelPrefix: "DG.Navigation.Vehicle",
      tabs: [
        { id: "notes" },
        { id: "gear" },
        { id: "about", icon: "fas fa-question-circle", label: "" },
      ],
    },
  });

  /** @override */
  static PARTS = /** @type {const} */ ({
    header: this.BASE_PARTS.header,
    tabs: this.BASE_PARTS.tabs,
    notes: {
      template: `${this.TEMPLATE_PATH}/parts/notes-tab.html`,
    },
    gear: this.BASE_PARTS.gear,
    about: this.BASE_PARTS.about,
  });
}
