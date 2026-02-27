import DGAgentSheet from "./agent-sheet.js";

/** @extends {DGAgentSheet} */
export default class DGAgentSheetV2 extends DGAgentSheet {
  static DEFAULT_OPTIONS = /** @type {const} */ ({
    classes: ["actor-sheet-v2"],
    position: { width: 950, height: 750 },
  });

  /** @override */
  static PARTS = /** @type {const} */ ({
    leftBar: {
      template: `${this.TEMPLATE_PATH}/parts/left-bar.html`,
      templates: [`${this.TEMPLATE_PATH}/partials/sanity-partial.html`],
    },
    rightBar: {
      template: `${this.TEMPLATE_PATH}/parts/right-bar.html`,
      templates: [
        `${this.TEMPLATE_PATH}/parts/skills-tab.html`,
        `${this.TEMPLATE_PATH}/parts/physical-tab-v2.html`,
        `${this.TEMPLATE_PATH}/parts/motivations-tab-v2.html`,
        `${this.TEMPLATE_PATH}/parts/gear-tab.html`,
        `${this.TEMPLATE_PATH}/parts/bio-tab-v2.html`,
        `${this.TEMPLATE_PATH}/parts/bonds-tab.html`,
        `${this.TEMPLATE_PATH}/parts/about-tab.html`,
        `${this.TEMPLATE_PATH}/partials/custom-skills-partial.html`,
        `${this.TEMPLATE_PATH}/partials/notes-partial.html`,
      ],
    },
    tabs: this.BASE_PARTS.tabs,
  });
}
