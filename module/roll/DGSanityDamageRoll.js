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

    const flavor = `Rolling <b>${DGUtils.localizeWithFallback(
      "DG.Generic.SanDamage",
      "SAN DAMAGE"
    )}</b> For <b>${lowDie.formula} / ${highDie.formula}</b>`;

    let html = "";
    html += `<div class="dice-roll">`;
    html += `     <div class="dice-result">`;
    html += `     <div class="dice-formula">${lowDie.formula} / ${highDie.formula}</div>`;
    html += `     <div class="dice-tooltip">`;
    html += `          <section class="tooltip-part">`;
    html += `               <div class="dice">`;
    html += `                    <header class="part-header flexrow">`;
    html += `                         <span class="part-formula">`;
    html += `                              ${lowDie.formula}`;
    html += `                         </span>`;
    html += `                         <span class="part-total">`;
    html += `                              ${lowResult}`;
    html += `                         </span>`;
    html += `                    </header>`;
    html += `                    <ol class="dice-rolls">`;
    html += `                         <li class="roll die d${lowDie.faces}">${lowResult}`;
    html += `                    </ol>`;
    html += `                    <hr>`;
    html += `                    <header class="part-header flexrow">`;
    html += `                         <span class="part-formula">`;
    html += `                               ${highDie.formula}`;
    html += `                         </span>`;
    html += `                         <span class="part-total">`;
    html += `                               ${highResult}`;
    html += `                         </span>`;
    html += `                    </header>`;
    html += `                    <ol class="dice-rolls">`;
    html += `                         <li class="roll die d${highDie.faces}">${highResult}</li>`;
    html += `                    </ol>`;
    html += `               </div>`;
    html += `          </section>`;
    html += `     </div>`;
    html += `     <h4 class="dice-total">${lowResult} / ${highResult}</h4>`;
    html += `</div>`;
    return this.toMessage({ content: html, flavor });
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
