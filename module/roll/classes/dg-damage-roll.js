/** @internal Import roll subclasses only from ../roll.js. */
/* eslint-disable import/prefer-default-export */
import { showDamageRollModifyDialog } from "../roll-dialogs.js";
import { DGRoll } from "./dg-roll.js";

const { renderTemplate } = foundry.applications.handlebars;

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
      label = `<b>${game.i18n
        .localize("DG.Roll.Damage")
        .toUpperCase()}</b> ${game.i18n.localize("DG.Roll.For")} ${
        this.item.name
      } (<b>${
        this.item.system.armorPiercing
      } </b><img class="armor-piercing-chat-card-img" src="systems/deltagreen/assets/icons/supersonic-bullet.svg" alt="armor penetration"/>)`;
    } catch (ex) {
      // console.log(ex);
      label = `<b>DAMAGE</b> for <b>${label.toUpperCase()}</b>`;
    }
    const html = await renderTemplate(
      "systems/deltagreen/templates/roll/damage-roll.hbs",
      {
        formula: this.formula,
        total: this.total,
      },
    );

    return this.toMessage({ content: html, label });
  }

  async showDialog() {
    return showDamageRollModifyDialog({
      itemName: this.item?.name,
      formula: this.formula,
    });
  }
}
