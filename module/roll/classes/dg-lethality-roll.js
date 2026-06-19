/** @internal Import roll subclasses only from ../roll.js. */
/* eslint-disable import/prefer-default-export */
import { buildRollTargetDisplayHtml } from "../../utils/roll-target-tooltip.js";
import { DGPercentileRoll } from "./dg-percentile-roll.js";

const { renderTemplate } = foundry.applications.handlebars;

export class DGLethalityRoll extends DGPercentileRoll {
  /**
   * See constructor for DGPercentileRoll. This theoretically could be done in the parent class'
   * constructor, but since Lethality rolls needs its own class for custom methods anyway,
   * we will set the target and localized key here.
   *
   * @param {String} formula
   * @param {Object} data
   * @param {Object} options
   */
  constructor(formula, data, options) {
    super(formula, data, options);
    this.target = options.item.system.lethality;
    this.localizedKey = game.i18n.localize("DG.ItemWindow.Weapons.Lethality");
  }

  /**
   * Prepares data for a chat message and then passes that data
   * to a method that actually creates a ChatMessage.
   *
   * Lays out and styles message based on outcome of the roll.
   *
   * Overrides `DGPercentileRoll.toChat()`
   *
   * @returns {Promise<ChatMessage>} - the created chat message.
   * @override
   */
  async toChat() {
    let resultString = "";
    let styleOverride = "";
    if (this.total <= this.target) {
      resultString = `${game.i18n.localize("DG.Roll.Lethal").toUpperCase()}`;
      styleOverride = "color: red";
    } else {
      resultString = `${game.i18n.localize("DG.Roll.Failure")}`;
    }

    const { nonLethalDamage } = this;
    const { rollLabel } = this.createChatHeader();

    const html = await renderTemplate(
      "systems/deltagreen/templates/roll/lethality-roll.hbs",
      {
        styleOverride,
        resultString,
        total: this.total,
        die1: nonLethalDamage.die1,
        die2: nonLethalDamage.die2,
        nonLethalTotal: nonLethalDamage.total,
        damageLabel: game.i18n.localize("DG.Roll.Damage"),
      },
    );

    return this.toMessage({ content: html, rollLabel });
  }

  /**
   * @returns {{ rollLabel: string }}
   */
  createChatHeader() {
    const base = Number(this.target) || 0;
    const manualModifier = Number(this.modifier) || 0;
    const effectiveTarget = base + manualModifier;
    const targetLine = buildRollTargetDisplayHtml({
      targetValue: `${effectiveTarget}%`,
      base,
      manualModifier,
      finalTarget: effectiveTarget,
    });

    const title = `${game.i18n.localize("DG.Roll.Rolling")} <b>${game.i18n
      .localize("DG.Roll.Lethality")
      .toUpperCase()}</b> ${game.i18n.localize(
      "DG.Roll.For",
    )} <b>${this.item.name.toUpperCase()}</b>`;

    return {
      rollLabel: `${title}: ${targetLine}`,
    };
  }

  /**
   * Calculates the damage for when a lethality roll fails.
   * If roll has not been evaluated, return null.
   *
   * See full rules on page 57 of agent's handbook.
   *
   * Note, this getter does not actually care if the roll has failed.
   *
   * @returns {null|Object} - return data about the non-lethal damage.
   */
  get nonLethalDamage() {
    if (!this.total) {
      return null;
    }

    // Try to determine what the d100 result would be as if it was two d10's being rolled.
    const totalString = this.total.toString();
    const digits = totalString.length;
    let die1;
    let die2;
    switch (digits) {
      case 1:
        // If one digit in the result, one die is a 10, and the other is the result.
        [die1, die2] = [10, this.total];
        break;
      case 2:
        // If two digits in the result, each die is the value of one of the digits. If one of those digits is 0, make it 10.
        [die1, die2] = totalString
          .split("")
          .map((digit) => parseInt(digit))
          .map((digit) => digit || 10);
        break;
      case 3:
        // If three digits in the result (aka result === 100), each die is a 10.
        [die1, die2] = [10, 10];
        break;
      default:
        break;
    }

    const total = die1 + die2;
    return { die1, die2, total };
  }
}
