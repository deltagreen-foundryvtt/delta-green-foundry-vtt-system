import { BASE_TEMPLATE_PATH } from "../config/index.js";
import { DISORDER_OPTIONS } from "../profession/disorders.js";
import { getDialogContentRoot, showDgDialog } from "./dg-dialog.js";

const { renderTemplate } = foundry.applications.handlebars;

/**
 * @typedef {object} ThingsDisorderDialogState
 * @property {string} [disorder]
 */

/**
 * @param {ThingsDisorderDialogState} [state]
 * @returns {Promise<{ outcome: 'submitted', path: 'thingsMan', disorder: string } | { outcome: 'back' } | null>}
 */
export default async function showThingsDisorderDialog(state = {}) {
  const defaultDisorder = state.disorder ?? "amnesia";
  const content = await renderTemplate(
    `${BASE_TEMPLATE_PATH}/dialog/things-disorder.html`,
    {
      disorders: DISORDER_OPTIONS.map(({ id, labelKey }) => ({
        value: id,
        labelKey,
        checked: id === defaultDisorder,
      })),
    },
  );

  /** @type {{ outcome: 'submitted', path: 'thingsMan', disorder: string } | { outcome: 'back' } | null} */
  let result = null;

  await showDgDialog({
    modifier: "things-disorder",
    content,
    window: {
      title: game.i18n.localize("DG.DamagedVeterans.ThingsMan.Dialog.Title"),
    },
    position: { width: 560, height: "auto" },
    form: { closeOnSubmit: false },
    close: () => result,
    onRender: (dialog) => {
      const root = getDialogContentRoot(dialog);
      if (!root) return;
      const submitBtn = dialog.element?.querySelector(
        'button[data-action="submit"]',
      );
      const updateSubmitState = () => {
        const selected = root.querySelector(
          'input[name="thingsDisorder"]:checked',
        );
        if (submitBtn) submitBtn.disabled = !selected;
      };
      root.querySelectorAll('input[name="thingsDisorder"]').forEach((input) => {
        input.addEventListener("change", updateSubmitState);
      });
      updateSubmitState();
    },
    buttons: [
      {
        action: "back",
        label: game.i18n.localize("DG.ProfessionSetup.GoBack"),
        callback: async (_event, _button, dialog) => {
          const root = getDialogContentRoot(dialog);
          const selected = root?.querySelector(
            'input[name="thingsDisorder"]:checked',
          );
          result = {
            outcome: "back",
            disorder: selected?.value,
          };
          await dialog.close();
          return false;
        },
      },
      {
        action: "submit",
        label: game.i18n.localize("DG.Profession.Dialog.Submit"),
        default: true,
        disabled: false,
        callback: async (_event, _button, dialog) => {
          const root = getDialogContentRoot(dialog);
          const selected = root?.querySelector(
            'input[name="thingsDisorder"]:checked',
          );
          if (!selected) return false;

          result = {
            outcome: "submitted",
            path: "thingsMan",
            disorder: selected.value,
          };
          await dialog.close();
          return false;
        },
      },
    ],
  });

  return result;
}
