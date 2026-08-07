import { BASE_TEMPLATE_PATH } from "../config/index.js";
import DGInfoDialog from "./info-dialog.js";

export default class DGSupportDialog extends DGInfoDialog {
  /** @override */
  static DEFAULT_OPTIONS = /** @type {const} */ ({
    id: "dg-support-dialog",
    window: {
      title: "DG.About.SupportTitle",
      icon: "fa-solid fa-life-ring",
    },
  });

  /** @override */
  static PARTS = /** @type {const} */ ({
    support: { template: `${BASE_TEMPLATE_PATH}/dialog/support.html` },
  });
}
