import { applyDialogTheme, buildDialogAppClasses } from "./dg-dialog.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Read-only info dialog base for the Settings sidebar About section. */
export default class DGInfoDialog extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  /** @override */
  static DEFAULT_OPTIONS = /** @type {const} */ ({
    classes: buildDialogAppClasses("info"),
    window: { resizable: false },
    position: { width: 480, height: "auto" },
  });

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    applyDialogTheme(this);
  }
}
