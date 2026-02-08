import DG, { BASE_TEMPLATE_PATH } from "../config.js";

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
    classes: [DG.ID, "edit-stat-form"],
    window: { title: "Edit statistics form", resizable: true },
    position: { width: 400, height: 200 },
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
  async _prepareContext(options) {
    return {
      ...(await super._prepareContext(options)),
      actor: this.actor,
    };
  }

  static async formHandler(event, form, formData) {
    const data = formData.object;

    await this.actor.update(data);
  }
}
