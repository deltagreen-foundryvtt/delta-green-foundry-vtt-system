/* eslint-disable max-classes-per-file */
import DGUtils from "../other/utility-functions.js";
import DG from "../config.js";

const { renderTemplate } = foundry.applications.handlebars;

export class DGRoll extends Roll {
  /**
   * NOTE: This class will rarely be called on its own. It should generally be extended. Look to DGPercentileRoll as an example.
   *
   * Customize our roll with some useful information, passed in the `options` Object.
   *
   * @param {string}          formula            Unused - The string formula to parse (from Foundry)
   * @param {Object}          data               Unused - The data object against which to parse attributes within the formula
   * @param {Object}          [options]          Additional data which is preserved in the database
   * @param {Number}          [options.rollType] The type of roll (stat, skill, sanity, damage, etc).
   * @param {String}          [options.key]      The key of the skill, stat, etc. to use as a basis for this roll.
   * @param {DeltaGreenActor} [options.actor]    The actor that this roll originates from.
   * @param {DeltaGreenItem}  [options.item]     Optional - The item from which the roll originates.
   */
  constructor(formula, data = {}, options = {}) {
    super(formula, data, options);
    const { rollType, key, actor, item } = options;
    this.type = rollType;
    this.key = key;
    this.actor = actor;
    this.item = item;
    this.modifier = 0;
  }

  /**
   * Simple function that actually creates the message and sends it to chat.
   * We override this to have a little more control over certain aspects of the message,
   * right now, its `speaker` and `rollMode`.
   *
   * @override
   * The following `@param` descriptions comes from the Foundry VTT code.
   * @param {object} messageData          The data object to use when creating the message
   * @param {options} [options]           Additional options which modify the created message.
   * @param {string} [options.rollMode]   The template roll mode to use for the message from CONFIG.Dice.rollModes
   * @param {boolean} [options.create=true]   Whether to automatically create the chat message, or only return the
   *                                          prepared chatData object.
   * @returns {Promise<ChatMessage|object>} A promise which resolves to the created ChatMessage document if create is
   *                                        true, or the Object of prepared chatData otherwise.
   */
  async toMessage(messageData = {}, { rollMode, create = true } = {}) {
    // eslint-disable-next-line no-param-reassign
    messageData.speaker = ChatMessage.getSpeaker({ actor: this.actor });
    return super.toMessage(messageData, {
      rollMode: this.options.rollMode || rollMode,
      create,
    });
  }
}

export class DGPercentileRoll extends DGRoll {
  /**
   * Creates D100 rolls, the base die of the system.
   *
   * This constructor embeds the following info into the roll:
   *   1. Target number that the roll needs to beat.
   *   2. Localized name for the roll.
   *
   * Note: In order for all of our custom data to persist, our constructor must use the same parameters as its parent class.
   * So, even though percentile rolls will always have a formula of "1d100" and we don't use the `data` object,
   * we still have to keep them as parameters.
   *
   * @param {string}          formula            Unused - The string formula to parse (from Foundry) - Always "1d100" for percentile rolls.
   * @param {Object}          data               Unused - The data object against which to parse attributes within the formula
   * @param {Object}          [options]          Additional data which is preserved in the database
   * @param {Number}          [options.rollType] The type of roll (stat, skill, sanity, etc).
   * @param {String}          [options.key]      The key of the skill, stat, etc. to use as a basis for this roll.
   * @param {DeltaGreenActor} [options.actor]    The actor that this roll originates from.
   * @param {DeltaGreenItem}  [options.item]     Optional - The item from which the roll originates.
   * @param {DeltaGreenItem}  [options.specialTrainingName] Optional - Special training rolls have names that are different from the roll key.
   */
  // eslint-disable-next-line default-param-last, no-unused-vars
  constructor(formula = "1D100", data = {}, options) {
    super("1D100", {}, options);

    // Set roll info for Skill, Stat, Typed Skill, and non-custom Weapon Percentile rolls.
    const { target, localizedKey, skillPath } = this.getRollInfoFromKey(
      this.key,
      this.actor.system,
    );
    this.target = target;
    this.localizedKey = localizedKey;
    this.skillPath = skillPath;

    // Set roll info for other Percentile rolls
    switch (this.type) {
      case "special-training":
        this.specialTrainingName = options.specialTrainingName;
        this.localizedKey = `${this.specialTrainingName} - (${this.localizedKey})`;
        break;
      case "weapon":
        // If this weapon uses a custom target for rolls, we set that explicitly.
        if (this.key === "custom") {
          this.target = this.item.system.customSkillTarget;
          this.localizedKey = game.i18n.localize("DG.ItemWindow.Custom");
        }
        // Add a the weapon's internal modifier.
        this.modifier += this.item.system.skillModifier;
        break;
      case "sanity":
        this.target = this.actor.system.sanity.value;
        this.localizedKey = game.i18n.localize("DG.Attributes.SAN");
        break;
      case "luck":
        this.target = 50;
        this.localizedKey = game.i18n.localize("DG.Luck");
        break;
      default:
        break;
    }
  }

  /**
   * Shows a dialog that can modify the roll.
   *
   * @returns {Promise<Object|void>} - the results of the dialog.
   */
  async showDialog() {
    const privateSanSetting = game.settings.get(
      "deltagreen",
      "keepSanityPrivate",
    );

    let hideSanTarget = false;
    if (
      privateSanSetting &&
      (this.type === "sanity" || this.key === "ritual") &&
      !game.user.isGM
    ) {
      hideSanTarget = true;
    }

    let customModifierTarget = 20;

    if (this.actor != null) {
      try {
        customModifierTarget = parseInt(
          this.actor.system.settings.rolling.defaultPercentileModifier,
        );
      } catch {}
    }

    const backingData = {
      data: {
        label: this.localizedKey,
        originalTarget: this.target,
        targetModifier: customModifierTarget,
        hideTarget: hideSanTarget,
      },
    };

    const template =
      "systems/deltagreen/templates/dialog/modify-percentile-roll.html";
    const content = await renderTemplate(template, backingData);
    return new Promise((resolve, reject) => {
      new Dialog({
        content,
        title: DGUtils.localizeWithFallback(
          "DG.ModifySkillRollDialogue.Title",
          "Modify Roll",
        ),
        default: "roll",
        buttons: {
          roll: {
            label: DGUtils.localizeWithFallback("DG.Roll.Roll", "Roll"),
            callback: (html) => {
              try {
                let targetModifier = html.find("[name='targetModifier']").val(); // this is text as a heads up

                const rollMode = html.find("[name='rollMode']").val();

                const plusMinus = html.find("[name='plusOrMinus']").val();

                if (
                  targetModifier.trim() !== "" &&
                  !Number.isNaN(targetModifier)
                ) {
                  targetModifier = Math.abs(parseInt(targetModifier));

                  if (plusMinus === "-") {
                    targetModifier *= -1;
                  }

                  // update the custom target modifier so it 'persists' between dialogs
                  if (this.actor != null) {
                    this.actor.update({
                      "system.settings.rolling.defaultPercentileModifier":
                        targetModifier,
                    });
                  }
                }
                resolve({ targetModifier, rollMode });
              } catch (ex) {
                reject(console.log(ex));
              }
            },
          },
          roll40Negative: {
            label: "-40",
            callback: (html) => {
              try {
                const rollMode = html.find("[name='rollMode']").val();
                const targetModifier = -40;
                resolve({ targetModifier, rollMode });
              } catch (ex) {
                reject(console.log(ex));
              }
            },
          },
          roll20Negative: {
            label: "-20",
            callback: (html) => {
              try {
                const rollMode = html.find("[name='rollMode']").val();
                const targetModifier = -20;
                resolve({ targetModifier, rollMode });
              } catch (ex) {
                reject(console.log(ex));
              }
            },
          },
          roll20Positive: {
            label: "+20",
            callback: (html) => {
              try {
                const rollMode = html.find("[name='rollMode']").val();
                const targetModifier = 20;
                resolve({ targetModifier, rollMode });
              } catch (ex) {
                reject(console.log(ex));
              }
            },
          },
          roll40Positive: {
            label: "+40",
            callback: (html) => {
              try {
                const rollMode = html.find("[name='rollMode']").val();
                const targetModifier = 40;
                resolve({ targetModifier, rollMode });
              } catch (ex) {
                reject(console.log(ex));
              }
            },
          },
        },
      }).render(true);
    });
  }

  /**
   * Prepares data for a chat message and then passes that data
   * to a method that actually creates a ChatMessage.
   *
   * Lays out and styles message based on outcome of the roll.
   *
   * @returns {Promise<ChatMessage>} - the created chat message.
   */
  async toChat() {
    // if using private san rolls, must hide any SAN roll unless user is a GM
    const privateSanSetting = game.settings.get(
      "deltagreen",
      "keepSanityPrivate",
    );
    if (
      privateSanSetting &&
      (this.type === "sanity" || this.key === "ritual") &&
      !game.user.isGM
    ) {
      this.options.rollMode = "blindroll";
    }

    let label = this.createLabel();

    let resultString = "";
    let styleOverride = "";

    if (this.isSuccess) {
      if (this.isCritical) {
        resultString = `${game.i18n.localize("DG.Roll.CriticalSuccess")}`;
        resultString = `${resultString.toUpperCase()}`;
        styleOverride = "color: green";
      } else {
        resultString = `${game.i18n.localize("DG.Roll.Success")}`;
      }
    } else {
      if (this.isCritical) {
        resultString = `${game.i18n.localize("DG.Roll.CriticalFailure")}`;
        resultString = `${resultString.toUpperCase()}`;
        styleOverride = "color: red";
      } else {
        resultString = `${game.i18n.localize("DG.Roll.Failure")}`;
      }
    }

    const failureMark = !this.isSuccess && this.skillPath
      && !foundry.utils.getProperty(this.actor, `${this.skillPath}.failure`)
      && game.settings.get(DG.ID, "skillFailure");

    const { renderTemplate } = foundry.applications.handlebars;
    const html = await renderTemplate(
      "systems/deltagreen/templates/roll/percentile-roll.hbs",
      {
        styleOverride,
        resultString,
        formula: this.formula,
        total: this.total,
        failureMark
      });

    //TODO: add setting for it?
    if (failureMark) {
      const keyForUpdate = `${this.skillPath}.failure`;

      //TODO: auto-update actor or post icon with manual apply
      await this.actor.update({
        [keyForUpdate]: true
      })

      return this.toMessage({ flags: { deltagreen: {
        rollbacks: {
          [keyForUpdate]: false
        }
      } }, content: html, flavor: label });
    } else {
      return this.toMessage({ content: html, flavor: label });
    }
  }

  /**
   * Utility function, called in the DGPercentileRoll constructor.
   * If this roll key corresponds to a stat, skill,
   * or typedSkill, get pertinent info.
   *
   * This is used for Stat, Skill, Typed Skill, Weapon, and Special Training Rolls.
   *
   * @returns {Object} - Contains the roll target and localized version of the key.
   */
  getRollInfoFromKey() {
    const actorData = this.actor.system;
    const skillKeys = Object.keys(actorData.skills);
    const typedSkillKeys = Object.keys(actorData.typedSkills);
    const statKeys = Object.keys(actorData.statistics);

    let target = null;
    let localizedKey = null;
    let skillPath = null; // For optimization of failure checks
    if (statKeys.includes(this.key)) {
      target = actorData.statistics[this.key].x5;
      localizedKey = game.i18n.localize(`DG.Attributes.${this.key}`);
    }
    if (skillKeys.includes(this.key)) {
      // use calculated target proficiency (effects and etc like aim + 20%)
      target =
        actorData.skills[this.key].targetProficiency ||
        actorData.skills[this.key].proficiency;
      localizedKey = game.i18n.localize(`DG.Skills.${this.key}`);
      skillPath = `system.skills.${this.key}`;
    }
    if (typedSkillKeys.includes(this.key)) {
      const skill = actorData.typedSkills[this.key];
      target = skill.proficiency;
      localizedKey = `${skill.group} (${skill.label})`;
      skillPath = `system.typedSkills.${this.key}`;
    }
    if (this.key === "ritual") {
      target = actorData.sanity.ritual;
      localizedKey = game.i18n.localize(`DG.Skills.ritual`);
    }
    return { target, localizedKey, skillPath };
  }

  /**
   * Create label based on result of roll
   *
   * todo: do we want make isInhuman more similar to base label?
   *
   * @returns {string}
   */
  createLabel() {
    const startOfLabel = game.i18n.localize("DG.Roll.Rolling")
      + ` <b>${this.localizedKey}`
    const endOfLabel =`${game.i18n.localize("DG.Roll.Target")} ${this.effectiveTarget}`

    let label = this.isInhuman
      // "Inhuman" stat being rolled. See function for details.
      ? `${startOfLabel} [${game.i18n.localize("DG.Roll.Inhuman").toUpperCase()}]</b> ${endOfLabel}`
      : `${startOfLabel}</b><br> ${endOfLabel}%`;

    const {isExhausted, exhaustedCheckPenalty} = this.exhausted

    if (this.modifier || isExhausted) {
      label += ` (${this.target}%`;

      if (this.modifier) {
        label += `${DGUtils.formatStringWithLeadingPlus(this.modifier)}%`;
      }

      if (isExhausted) {
        label += `${DGUtils.formatStringWithLeadingPlus(
          exhaustedCheckPenalty,
        )}%`;
      }

      label += `)`;
    }

    return label;
  }

  get exhausted() {
    let isExhausted = false;
    let exhaustedCheckPenalty = -20;

    try {
      // I suspect (but am not entirely certain) that being tired doesn't make you less lucky)
      if (this.type !== "luck") {
        isExhausted = this.actor.system.physical.exhausted;
        exhaustedCheckPenalty = this.actor.system.physical.exhaustedPenalty;
        exhaustedCheckPenalty = -1 * Math.abs(exhaustedCheckPenalty);
      }
    } catch {
      isExhausted = false;
      exhaustedCheckPenalty = -20;
    }

    return {isExhausted, exhaustedCheckPenalty};
  }

  /**
   * "Inhuman" stat being rolled, logic is different per page 188 of the Handler's Guide.
   * Note - originally implemented by Uriele, but my attempt at merging conficts went poorly, so re-implementing.
   * For an inhuman check, the roll succeeds except on a roll of 100 which fails AND fumbles.
   * If the roll is a matching digit roll, it is a critical as normal.
   * Also, if the roll is below the regular (non-x5) value of the stat, it is a critical.  E.g. a CON of 25, a d100 roll of 21 would be a critical.
   *
   * @returns {Boolean}
   */
  get isInhuman() {
    /* 
      Changing this to only consider the base x5 stat target for whether something is 'inhuman'
      because I do not think the intent was an Agent with a high strength getting a +40% bonus to be considered 'inhuman' 
      and therefore benefit from the increased crit threshold, although could be wrong about this.
    */
    if (this.target > 99 && this.type === "stat") {
      return true;
    }
    return false;
  }

  /**
   * Determines if a roll result is critical.
   * If roll has not been evaluated, return null.
   *
   * @returns {null|Boolean}
   */
  get isCritical() {
    // If roll isn't evaluated, return null.
    if (!this.total) {
      return null;
    }
    let isCritical = false;

    // 1, 100, or any matching dice are a crit, i.e. 11, 22, 33...99.
    if (this.total === 1 || this.total === 100 || this.total % 11 === 0) {
      // really good, or reeaaaally bad
      isCritical = true;
    }

    // If inhuman and the roll is below the regular (non-x5) value of the stat, it is a critical.
    // E.g. a CON of 25, a d100 roll of 21 would be a critical.
    if (this.isInhuman && this.total <= this.target / 5) {
      isCritical = true;
    }

    return isCritical;
  }

  /**
   * Determines if a roll succeeded.
   * If roll has not been evaluated, return null.
   *
   * @returns {null|Boolean}
   */
  get isSuccess() {
    // If roll isn't evaluated, return null.
    if (!this.total) {
      return null;
    }

    // A roll of 100 always (critically) fails, even for inhuman rolls.
    if (this.total === 100) return false;
    return this.total <= this.effectiveTarget;
  }

  /**
   * Actual target for the roll accounting for modifier if present.
   * Floored to 1 if a negative modifier would bring it below 1.
   * Capped at 99 unless it is an inhuman stat test.
   * Also worth noting, per page 47 of the Agent's Handbook, Exhaustion penalties
   * affect not only skill and stat tests, but SAN tests as well...
   *
   * @returns {null|integer}
   */
  get effectiveTarget() {
    let target = 1;

    let {isExhausted, exhaustedCheckPenalty} = this.exhausted

    if (!this.target || Number.isNaN(this.target)) {
      return null;
    }

    target = parseInt(this.target);

    if (isExhausted) {
      target += exhaustedCheckPenalty;
    }

    if (this.modifier && !Number.isNaN(this.modifier)) {
      const modifier = parseInt(this.modifier);

      target += modifier;

      // per agent's handbook (pg.43), a negative modifier can't lower a target below 1%
      target = Math.max(target, 1);
    }

    // an 'inhuman' stat test can exceed 99% as a target, but skill tests otherwise cannot (agents handbook pg.43)
    if (!this.isInhuman) {
      target = Math.min(target, 99);
    }

    return target;
  }
}

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
      "DG.Roll.For",
    )} <b>${this.item.name.toUpperCase()}</b> ${game.i18n.localize(
      "DG.Roll.Target",
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
      new Dialog({
        content,
        title: game.i18n.localize("DG.ModifySkillRollDialogue.Title"),
        default: "roll",
        buttons: {
          roll: {
            label: game.i18n.translations.DG.Roll.Roll,

            callback: (html) => {
              try {
                const outerModifier = html.find("[name='outerModifier']").val(); // this is text as a heads up
                let innerModifier = html.find("[name='innerModifier']").val(); // this is text as a heads up
                const modifiedBaseRoll = html
                  .find("[name='originalFormula']")
                  .val(); // this is text as a heads up
                const rollMode = html.find("[name='targetRollMode']").val();

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
        },
      }).render(true);
    });
  }
}

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
      "SAN DAMAGE",
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
