import DG, { BASE_TEMPLATE_PATH } from "../config/index.js";
import { applyDialogTheme } from "./dg-dialog.js";

export default class ActorEditStatForm extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor(params) {
    super();
    this.actor = params.actor;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: [DG.ID, "edit-stat-form", "dg-dialog-app"],
    window: {
      title: "DG.EditStats.Title",
      resizable: true,
      contentClasses: ["standard-form"],
    },
    position: { width: 600, height: "auto" },
    actions: {},
    form: {
      handler: this.formHandler,
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static PARTS = /** @type {const} */ ({
    stats: {
      template: `${BASE_TEMPLATE_PATH}/actor/edit-stats.html`,
    },
  });

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    applyDialogTheme(this);
  }

  /** @override */
  async _prepareContext(options) {
    return {
      ...(await super._prepareContext(options)),
      actor: this.actor,
      statKeys: DG.statistics,
      sourceStatistics:
        this.actor._source?.system?.statistics ?? this.actor.system.statistics,
    };
  }

  static async formHandler(event, form, formData) {
    const data = formData.object;

    await this.actor.update(data);
  }
}
