export class DGDamageRoll extends DGRoll {
  /**
   * Prepares data for a chat message and then passes that data
   * to a method that actually creates a ChatMessage.
   *
   * @returns {Promise<ChatMessage>} - the created chat message.
   * @override
   */
  async toChat() {
    let label = this.formula;
    try {
      label = `${game.i18n.localize("DG.Roll.Rolling")} <b>${game.i18n
        .localize("DG.Roll.Damage")
        .toUpperCase()}</b> ${game.i18n.localize("DG.Roll.For")} ${
        this.item.name
      } (<b>${
        this.item.system.armorPiercing
      } </b><img class="armor-piercing-chat-card-img" src="systems/deltagreen/assets/icons/supersonic-bullet.svg" alt="armor penetration"/>)`;
    } catch (ex) {
      // console.log(ex);
      label = `Rolling <b>DAMAGE</b> for <b>${label.toUpperCase()}</b>`;
    }
    return this.toMessage({ content: this.total, flavor: label });
  }

  async showDialog() {
    const template =
      "systems/deltagreen/templates/dialog/modify-damage-roll.html";
    const backingData = {
      data: {
        label: this.item?.name,
        originalFormula: this.formula,
        outerModifier: "2 * ",
        innerModifier: "+ 0",
      },
    };

    const content = await renderTemplate(template, backingData);
    return new Promise((resolve, reject) => {
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
                  "[name='outerModifier']"
                )?.value; // this is text as a heads up
                let innerModifier = dialog.element.querySelector(
                  "[name='innerModifier']"
                )?.value; // this is text as a heads up
                const modifiedBaseRoll = dialog.element.querySelector(
                  "[name='originalFormula']"
                )?.value; // this is text as a heads up
                const rollMode = dialog.element.querySelector(
                  "[name='targetRollMode']"
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

                resolve({ newFormula, rollMode });
              } catch (ex) {
                reject(console.log(ex));
              }
            },
          },
        ],
      }).render(true);
    });
  }
}
