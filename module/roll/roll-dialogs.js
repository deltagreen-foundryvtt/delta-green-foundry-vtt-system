import DGUtils from "../utils/utility-functions.js";

const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;

const PERCENTILE_ROLL_DIALOG_TEMPLATE =
  "systems/deltagreen/templates/dialog/modify-percentile-roll.html";
const DAMAGE_ROLL_DIALOG_TEMPLATE =
  "systems/deltagreen/templates/dialog/modify-damage-roll.html";

const QUICK_MODIFIER_PRESETS = [
  {
    action: "modMinus40",
    mod: -40,
    label: "−40",
    explanationKey: "DG.ModifySkillRollDialogue.ModifierMuchHarder",
  },
  {
    action: "modMinus20",
    mod: -20,
    label: "−20",
    explanationKey: "DG.ModifySkillRollDialogue.ModifierHarder",
  },
  {
    action: "modPlus20",
    mod: 20,
    label: "+20",
    explanationKey: "DG.ModifySkillRollDialogue.ModifierEasier",
  },
  {
    action: "modPlus40",
    mod: 40,
    label: "+40",
    explanationKey: "DG.ModifySkillRollDialogue.ModifierMuchEasier",
  },
];

/**
 * @param {DialogV2} dialog
 * @returns {string|undefined}
 */
function readMessageMode(dialog) {
  return dialog.element.querySelector("[name='messageMode']")?.value;
}

/**
 * @param {object} options
 * @param {string} options.label
 * @param {number} options.target
 * @param {boolean} [options.hideTarget]
 * @param {number} [options.defaultModifier]
 * @param {Actor|null} [options.actor]
 * @returns {Promise<{ targetModifier: number, messageMode?: string }|void>}
 */
export async function showPercentileRollModifyDialog({
  label,
  target,
  hideTarget = false,
  defaultModifier = 20,
  actor = null,
}) {
  const quickModifiers = QUICK_MODIFIER_PRESETS.map((preset) => ({
    ...preset,
    explanation: game.i18n.localize(preset.explanationKey),
  }));

  const content = await renderTemplate(PERCENTILE_ROLL_DIALOG_TEMPLATE, {
    data: {
      label,
      originalTarget: target,
      targetModifier: defaultModifier,
      hideTarget,
    },
    quickModifiers,
  });

  /** @type {{ targetModifier: number, messageMode?: string } | null} */
  let dialogResult = null;

  /**
   * @param {DialogV2} dialog
   * @param {{ targetModifier: number, messageMode?: string }} result
   */
  const resolveAndClose = async (dialog, result) => {
    dialogResult = result;
    await dialog.close();
    return result;
  };

  // Footer buttons are callback-only; visible controls live in modify-percentile-roll.html.
  const hiddenFooterButton = { class: "hidden" };

  const presetButtons = QUICK_MODIFIER_PRESETS.map(({ action, mod }) => ({
    action,
    label: "",
    ...hiddenFooterButton,
    callback: async (_event, _button, dialog) =>
      resolveAndClose(dialog, {
        targetModifier: mod,
        messageMode: readMessageMode(dialog),
      }),
  }));

  return DialogV2.wait({
    content,
    classes: ["modify-roll-dialog-app"],
    form: { closeOnSubmit: false },
    position: { width: 420 },
    window: {
      title: DGUtils.localizeWithFallback(
        "DG.ModifySkillRollDialogue.Title",
        "Modify Roll",
      ),
    },
    close: () => dialogResult,
    buttons: [
      {
        default: true,
        action: "roll",
        label: "",
        ...hiddenFooterButton,
        callback: async (_event, _button, dialog) => {
          const raw =
            dialog.element
              .querySelector("[name='targetModifier']")
              ?.value?.trim() ?? "";
          const targetModifier = Number(raw);

          if (raw === "" || Number.isNaN(targetModifier)) {
            ui.notifications.warn(
              DGUtils.localizeWithFallback(
                "DG.ModifySkillRollDialogue.InvalidModifier",
                "Enter a valid modifier to roll.",
              ),
            );
            return false;
          }

          if (actor != null) {
            await actor.update({
              "system.settings.rolling.defaultPercentileModifier":
                targetModifier,
            });
          }

          return resolveAndClose(dialog, {
            targetModifier,
            messageMode: readMessageMode(dialog),
          });
        },
      },
      ...presetButtons,
    ],
  });
}

/**
 * @param {object} options
 * @param {string} [options.itemName]
 * @param {string} options.formula
 * @returns {Promise<{ newFormula: string, messageMode?: string }|void>}
 */
export async function showDamageRollModifyDialog({ itemName, formula }) {
  const content = await renderTemplate(DAMAGE_ROLL_DIALOG_TEMPLATE, {
    data: {
      label: itemName,
      originalFormula: formula,
      outerModifier: "2 * ",
      innerModifier: "+ 0",
    },
  });

  return DialogV2.wait({
    content,
    window: {
      title: game.i18n.localize("DG.ModifySkillRollDialogue.Title"),
    },
    close: () => null,
    buttons: [
      {
        default: true,
        label: game.i18n.translations.DG.Roll.Roll,
        action: "roll",
        callback: (_event, _button, dialog) => {
          const outerModifier = dialog.element.querySelector(
            "[name='outerModifier']",
          )?.value;
          let innerModifier = dialog.element.querySelector(
            "[name='innerModifier']",
          )?.value;
          const modifiedBaseRoll = dialog.element.querySelector(
            "[name='originalFormula']",
          )?.value;
          const messageMode = dialog.element.querySelector(
            "[name='targetRollMode']",
          )?.value;

          if (innerModifier.replace(" ", "") === "+0") {
            innerModifier = "";
          }

          let newFormula = "";
          if (outerModifier.trim() !== "") {
            newFormula += `${outerModifier}(${modifiedBaseRoll}${innerModifier.trim()})`;
          } else {
            newFormula += modifiedBaseRoll + innerModifier.trim();
          }

          return { newFormula, messageMode };
        },
      },
    ],
  });
}
