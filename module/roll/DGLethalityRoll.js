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
    let label = `${game.i18n.localize("DG.Roll.Rolling")} <b>${game.i18n
      .localize("DG.Roll.Lethality")
      .toUpperCase()}</b> ${game.i18n.localize(
      "DG.Roll.For"
    )} <b>${this.item.name.toUpperCase()}</b> ${game.i18n.localize(
      "DG.Roll.Target"
    )} ${this.target + this.modifier}`;
    if (this.modifier) {
      label += ` (${DGUtils.formatStringWithLeadingPlus(this.modifier)}%)`;
    }

    let html = "";
    html += `<div class="dice-roll">`;
    html += `     <div class="dice-result">`;
    html += `     <div style="${styleOverride}" class="dice-formula">${resultString}</div>`;
    html += `     <div class="dice-tooltip">`;
    html += `          <section class="tooltip-part">`;
    html += `               <div class="dice">`;
    html += `                    <header class="part-header flexrow">`;
    html += `                         <span class="part-formula">`;
    html += `                              d100`;
    html += `                         </span>`;
    html += `                         <span class="part-total">`;
    html += `                              ${this.total}`;
    html += `                         </span>`;
    html += `                    </header>`;
    html += `                    <ol class="dice-rolls">`;
    html += `                         <li class="roll die d100">${this.total}`;
    html += `                    </ol>`;
    html += `                    <hr>`;
    html += `                    <header class="part-header flexrow">`;
    html += `                         <span class="part-formula">`;
    html += `                              2d10 (d10 + d10)`;
    html += `                         </span>`;
    html += `                         <span class="part-total">`;
    html += `                              ${nonLethalDamage.total}`;
    html += `                         </span>`;
    html += `                    </header>`;
    html += `                    <ol class="dice-rolls">`;
    html += `                         <li class="roll die d10">${nonLethalDamage.die1}</li>`;
    html += `                         <li class="roll die d10">${nonLethalDamage.die2}</li>`;
    html += `                    </ol>`;
    html += `               </div>`;
    html += `          </section>`;
    html += `     </div>`;
    html += `     <h4 class="dice-total">${this.total} (${
      nonLethalDamage.total
    } ${game.i18n.localize("DG.Roll.Damage")})</h4>`;
    html += `</div>`;

    return this.toMessage({ content: html, flavor: label });
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
