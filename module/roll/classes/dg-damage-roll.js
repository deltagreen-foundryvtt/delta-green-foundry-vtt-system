/** @internal Import roll subclasses only from ../roll.js. */
/* eslint-disable import/prefer-default-export */
import { showDamageRollModifyDialog } from "../roll-dialogs.js";
import { DGRoll } from "./dg-roll.js";

const { renderTemplate } = foundry.applications.handlebars;

export class DGDamageRoll extends DGRoll {
  /**
   * @returns {{ rollLabel: string }}
   */
  createChatHeader() {
    try {
      const armorPiercingTooltip = game.i18n.localize("DG.Gear.ArmorPiercing");
      const subtitle = `<span class="dg-chat-card__armor-piercing" data-tooltip-text="${foundry.utils.escapeHTML(
        armorPiercingTooltip,
      )}">(<b>${
        this.item.system.armorPiercing
      }</b><img class="armor-piercing-chat-card-img" src="systems/deltagreen/assets/icons/supersonic-bullet.svg" alt=""/>)</span>`;

      const title = `${game.i18n.localize("DG.Roll.Rolling")} <b>${game.i18n
        .localize("DG.Roll.Damage")
        .toUpperCase()}</b> ${game.i18n.localize("DG.Roll.For")} <b>${
        this.item.name
      }</b>`;

      return {
        rollLabel: `${title}: ${subtitle}`,
      };
    } catch (ex) {
      return {
        rollLabel: `${game.i18n.localize(
          "DG.Roll.RollingDamageFor",
        )} <b>${this.formula.toUpperCase()}</b>`,
      };
    }
  }

  /**
   * Prepares data for a chat message and then passes that data
   * to a method that actually creates a ChatMessage.
   *
   * @returns {Promise<ChatMessage>} - the created chat message.
   * @override
   */
  async toChat() {
    const { rollLabel } = this.createChatHeader();
    const html = await renderTemplate(
      "systems/deltagreen/templates/roll/damage-roll.hbs",
      {
        formula: this.formula,
        total: this.total,
      },
    );

    return this.toMessage({ content: html, rollLabel });
  }

  async showDialog() {
    return showDamageRollModifyDialog({
      itemName: this.item?.name,
      formula: this.formula,
    });
  }
}
