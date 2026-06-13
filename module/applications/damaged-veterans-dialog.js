import { BASE_TEMPLATE_PATH } from "../config/index.js";
import { getDialogContentRoot, showDgDialog } from "./dg-dialog.js";

const { renderTemplate } = foundry.applications.handlebars;

/** @typedef {'freshRecruit' | 'extremeViolence' | 'captivity' | 'hardExperience' | 'thingsMan'} DamagedVeteranPath */

const VETERAN_OPTIONS = /** @type {const} */ ([
  {
    value: "freshRecruit",
    labelKey: "DG.DamagedVeterans.Dialog.FreshRecruit.Label",
    bodyKey: "DG.DamagedVeterans.Dialog.FreshRecruit.Body",
  },
  {
    value: "extremeViolence",
    labelKey: "DG.DamagedVeterans.Dialog.ExtremeViolence.Label",
    bodyKey: "DG.DamagedVeterans.Dialog.ExtremeViolence.Body",
  },
  {
    value: "captivity",
    labelKey: "DG.DamagedVeterans.Dialog.Captivity.Label",
    bodyKey: "DG.DamagedVeterans.Dialog.Captivity.Body",
  },
  {
    value: "hardExperience",
    labelKey: "DG.DamagedVeterans.Dialog.HardExperience.Label",
    bodyKey: "DG.DamagedVeterans.Dialog.HardExperience.Body",
  },
  {
    value: "thingsMan",
    labelKey: "DG.DamagedVeterans.Dialog.ThingsMan.Label",
    bodyKey: "DG.DamagedVeterans.Dialog.ThingsMan.Body",
  },
]);

/**
 * @param {import("../profession/commit-character-creation.js").CharacterCreationPayload} payload
 * @param {object} [options]
 * @param {DamagedVeteranPath} [options.selectedPath]
 * @returns {Promise<{ outcome: 'submitted', path: DamagedVeteranPath } | { outcome: 'back' } | null>}
 */
export default async function showDamagedVeteransDialog(
  payload,
  { selectedPath } = {},
) {
  const defaultPath = selectedPath ?? "freshRecruit";
  const content = await renderTemplate(
    `${BASE_TEMPLATE_PATH}/dialog/damaged-veterans.html`,
    {
      options: VETERAN_OPTIONS.map((option) => ({
        ...option,
        checked: option.value === defaultPath,
      })),
    },
  );

  /** @type {{ outcome: 'submitted', path: DamagedVeteranPath } | { outcome: 'back' } | null} */
  let result = null;

  await showDgDialog({
    modifier: "damaged-veterans",
    content,
    window: {
      title: game.i18n.localize("DG.DamagedVeterans.Dialog.Title"),
    },
    position: { width: 720, height: "auto" },
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
          'input[name="damagedVeteranPath"]:checked',
        );
        if (submitBtn) submitBtn.disabled = !selected;
      };
      root
        .querySelectorAll('input[name="damagedVeteranPath"]')
        .forEach((input) => {
          input.addEventListener("change", updateSubmitState);
        });
      updateSubmitState();
    },
    buttons: [
      {
        action: "back",
        label: game.i18n.localize("DG.ProfessionSetup.GoBack"),
        callback: async (_event, _button, dialog) => {
          result = { outcome: "back" };
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
            'input[name="damagedVeteranPath"]:checked',
          );
          if (!selected) return false;

          const path = /** @type {DamagedVeteranPath} */ (selected.value);
          result = { outcome: "submitted", path };
          await dialog.close();
          return false;
        },
      },
    ],
  });

  return result;
}
