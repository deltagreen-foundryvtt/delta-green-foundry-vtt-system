import DGUtils from "../utils/utility-functions.js";

const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;

const PERCENTILE_ROLL_DIALOG_TEMPLATE =
  "systems/deltagreen/templates/dialog/modify-percentile-roll.html";
const DAMAGE_ROLL_DIALOG_TEMPLATE =
  "systems/deltagreen/templates/dialog/modify-damage-roll.html";

/**
 * @param {object} options
 * @param {string} options.label
 * @param {number} options.target
 * @param {boolean} [options.hideTarget]
 * @param {number} [options.defaultModifier]
 * @param {Actor|null} [options.actor]
 * @returns {Promise<{ targetModifier: number, messageMode?: string }|void>}
 */
export function showPercentileRollModifyDialog({
  label,
  target,
  hideTarget = false,
  defaultModifier = 20,
  actor = null,
}) {
  const backingData = {
    data: {
      label,
      originalTarget: target,
      targetModifier: defaultModifier,
      hideTarget,
    },
  };

  return renderTemplate(PERCENTILE_ROLL_DIALOG_TEMPLATE, backingData).then(
    (content) =>
      new Promise((resolve, reject) => {
        const modButtons = [-40, -20, 20, 40].map((mod) => {
          const sign = mod > 0 ? "Positive" : "Negative";
          return {
            action: `roll${Math.abs(mod)}${sign}`,
            label: mod > 0 ? `+${mod}` : String(mod),
            callback: (event, button, dialog) => {
              try {
                const messageMode =
                  dialog.element.querySelector("[name='messageMode']")?.value;
                resolve({ targetModifier: mod, messageMode });
              } catch (ex) {
                reject(console.log(ex));
              }
            },
          };
        });

        new DialogV2({
          content,
          window: {
            title: DGUtils.localizeWithFallback(
              "DG.ModifySkillRollDialogue.Title",
              "Modify Roll",
            ),
          },
          buttons: [
            {
              default: true,
              action: "roll",
              label: DGUtils.localizeWithFallback("DG.Roll.Roll", "Roll"),
              callback: (event, button, dialog) => {
                try {
                  let targetModifier = dialog.element.querySelector(
                    "[name='targetModifier']",
                  )?.value;

                  const messageMode =
                    dialog.element.querySelector("[name='messageMode']")?.value;

                  const plusMinus = dialog.element.querySelector(
                    "[name='plusOrMinus']",
                  )?.value;

                  if (
                    targetModifier.trim() !== "" &&
                    !Number.isNaN(targetModifier)
                  ) {
                    targetModifier = Math.abs(parseInt(targetModifier, 10));

                    if (plusMinus === "-") {
                      targetModifier *= -1;
                    }

                    if (actor != null) {
                      actor.update({
                        "system.settings.rolling.defaultPercentileModifier":
                          targetModifier,
                      });
                    }
                  }
                  resolve({ targetModifier, messageMode });
                } catch (ex) {
                  reject(console.log(ex));
                }
              },
            },
            ...modButtons,
          ],
        }).render(true);
      }),
  );
}

/**
 * @param {object} options
 * @param {string} [options.itemName]
 * @param {string} options.formula
 * @returns {Promise<{ newFormula: string, messageMode?: string }|void>}
 */
export function showDamageRollModifyDialog({ itemName, formula }) {
  const backingData = {
    data: {
      label: itemName,
      originalFormula: formula,
      outerModifier: "2 * ",
      innerModifier: "+ 0",
    },
  };

  return renderTemplate(DAMAGE_ROLL_DIALOG_TEMPLATE, backingData).then(
    (content) =>
      new Promise((resolve, reject) => {
        new DialogV2({
          content,
          window: {
            title: game.i18n.localize("DG.ModifySkillRollDialogue.Title"),
          },
          buttons: [
            {
              default: true,
              label: game.i18n.translations.DG.Roll.Roll,
              action: "roll",
              callback: (event, button, dialog) => {
                try {
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

                  resolve({ newFormula, messageMode });
                } catch (ex) {
                  reject(console.log(ex));
                }
              },
            },
          ],
        }).render(true);
      }),
  );
}
