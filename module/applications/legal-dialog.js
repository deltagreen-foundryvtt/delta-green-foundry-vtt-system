import { BASE_TEMPLATE_PATH } from "../config/index.js";
import DGInfoDialog from "./info-dialog.js";

export default class DGLegalDialog extends DGInfoDialog {
  /** @override */
  static DEFAULT_OPTIONS = /** @type {const} */ ({
    id: "dg-legal-dialog",
    window: {
      title: "DG.About.LegalTitle",
      icon: "fa-solid fa-scale-balanced",
    },
  });

  /** @override */
  static PARTS = /** @type {const} */ ({
    legal: { template: `${BASE_TEMPLATE_PATH}/dialog/legal.html` },
  });
}
