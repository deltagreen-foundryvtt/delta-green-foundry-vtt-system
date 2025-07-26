import DG, { BASE_TEMPLATE_PATH } from "../config.js";

const HbsAppMixin = foundry.applications.api.HandlebarsApplicationMixin;

const DGSheetMixin = (Base) => {
  return class DGDocumentSheet extends HbsAppMixin(Base) {
    /** @inheritdoc */
    static DEFAULT_OPTIONS = /** @type {const} */ ({
      window: { resizable: true },
      classes: [DG.ID, "sheet"],
      form: { submitOnChange: true },
    });

    static TEMPLATE_PATH = BASE_TEMPLATE_PATH;

    static get THEME() {
      return game.settings.get(DG.ID, "characterSheetStyle");
    }

    get THEME() {
      return this.constructor.THEME;
    }

    /** @inheritdoc */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const docName = this.document.documentName.toLowerCase();

      // Add the document to the context under a descriptive name (i.e. "actor", "item")
      context[docName] = this.document;

      return context;
    }
    /** @inheritdoc */

    async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);

      const html = this.element;
      html
        .querySelector(".window-content")
        .classList.add(`${this.THEME}-style`);
    }

    /** @inheritdoc */
    async _onRender(context, options) {
      await super._onRender(context, options);

      const html = this.element;

      // Double-click resize handle to reset sheet to original size.
      html
        .querySelector(".window-resize-handle")
        .addEventListener("dblclick", () => {
          this.resetPosition();
        });
    }

    /**
     * Resets the window's position to its default, as specified in the Sheet's options.
     * @returns {void}
     */
    resetPosition() {
      this.setPosition(this.options.position);
    }
  };
};

export default DGSheetMixin;
