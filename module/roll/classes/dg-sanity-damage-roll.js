/** @internal Import roll subclasses only from ../roll.js. */
/* eslint-disable import/prefer-default-export */
import DGUtils from "../../utils/utility-functions.js";
import { DGRoll } from "./dg-roll.js";

const { renderTemplate } = foundry.applications.handlebars;

export class DGSanityDamageRoll extends DGRoll {
  /**
   * Prepares data for a chat message and then passes that data
   * to a method that actually creates a ChatMessage.
   *
   * @returns {Promise<ChatMessage>} - the created chat message.
   * @override
   */
  async toChat() {
    const [lowDie, highDie] = this.terms[0].terms.map((formula) => {
      return Roll.parse(formula)[0] || { faces: parseInt(formula), number: 1 };
    });

    const [lowResult, highResult] = this.damageResults;

    const rollLabel = `${game.i18n.localize(
      "DG.Roll.Rolling",
    )} <b>${DGUtils.localizeWithFallback(
      "DG.Generic.SanDamage",
      "SAN DAMAGE",
    )}</b>: ${game.i18n.localize("DG.Roll.For")} <b>${lowDie.formula} / ${
      highDie.formula
    }</b>`;

    const html = await renderTemplate(
      "systems/deltagreen/templates/roll/sanity-damage-roll.hbs",
      {
        lowFormula: lowDie.formula,
        highFormula: highDie.formula,
        lowFaces: lowDie.faces,
        highFaces: highDie.faces,
        lowResult,
        highResult,
      },
    );

    return this.toMessage({ content: html, rollLabel });
  }

  /**
   * Returns the two results for a sanity damage roll.
   *
   * Returns null if the roll has not been evaluated.
   *
   * @returns {null|Array<Number>} - Array of result numbers
   */
  get damageResults() {
    if (!this.total) return null;

    const [lowResult, highResult] = this.terms[0].results;
    return [lowResult?.result, highResult?.result];
  }
}
