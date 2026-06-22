import DG from "../config/index.js";

const { DialogV2 } = foundry.applications.api;

/** @type {readonly string[]} */
export const DG_DIALOG_APP_CLASSES = ["deltagreen", "dg-dialog-app"];

/**
 * @returns {"program-style" | "cowboy-style" | "outlaw-style"}
 */
export function getCharacterSheetThemeClass() {
  const theme = game.settings.get(DG.ID, "characterSheetStyle");
  return `${theme}-style`;
}

/**
 * @param {DialogV2} dialog
 * @returns {HTMLElement | null}
 */
export function getDialogContentRoot(dialog) {
  return (
    dialog.element?.querySelector(".dialog-content") ??
    dialog.element?.querySelector(".dialog-form") ??
    null
  );
}

/**
 * @param {DialogV2} dialog
 * @returns {void}
 */
export function applyDialogTheme(dialog) {
  const windowContent = dialog.element?.querySelector("section.window-content");
  if (!windowContent) return;
  windowContent.classList.add(getCharacterSheetThemeClass());
}

/**
 * @param {string} [modifier]
 * @returns {string[]}
 */
export function buildDialogAppClasses(modifier) {
  const classes = [...DG_DIALOG_APP_CLASSES];
  if (modifier) classes.push(`dg-dialog-app--${modifier}`);
  return classes;
}

/**
 * @param {HTMLElement} root
 * @param {string} tabId
 * @returns {void}
 */
export function activateDialogTab(root, tabId) {
  root.querySelectorAll(".tabs [data-action='tab']").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === tabId);
  });
  root.querySelectorAll(".tab[data-tab]").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === tabId);
  });
}

/**
 * @param {HTMLElement} root
 * @returns {void}
 */
export function bindDialogTabs(root) {
  root.querySelectorAll(".tabs [data-action='tab']").forEach((tab) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      const tabId = tab.dataset.tab;
      if (tabId) activateDialogTab(root, tabId);
    });
  });
}

/**
 * @param {object} options — DialogV2.wait options plus DG extensions
 * @param {string} [options.modifier] — app class modifier: dg-dialog-app--{modifier}
 * @param {(dialog: DialogV2, event: Event) => void | Promise<void>} [options.onRender]
 * @param {string[]} [options.classes] — extra app classes merged after base
 * @returns {Promise<unknown>}
 */
export function showDgDialog(options) {
  const {
    modifier,
    onRender,
    classes: extraClasses = [],
    render: userRender,
    ...dialogOptions
  } = options;

  const classes = [...buildDialogAppClasses(modifier), ...extraClasses];

  return DialogV2.wait({
    ...dialogOptions,
    classes,
    render: async (event, dialog) => {
      applyDialogTheme(dialog);
      if (userRender) await userRender(event, dialog);
      if (onRender) await onRender(dialog, event);
    },
  });
}
