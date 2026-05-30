/** @internal Import roll subclasses only from ../roll.js. */
/* eslint-disable import/prefer-default-export */
import DGUtils from "../../utils/utility-functions.js";
import DG from "../../config/index.js";
import { showPercentileRollModifyDialog } from "../roll-dialogs.js";
import {
  isDiceSoNiceAvailable,
  waitForDiceSoNiceMessageAnimation,
} from "../../integrations/dice-so-nice.js";
import {
  clampPercentileRollTarget,
  getRollTargetDisplayClassFromModifier,
} from "../../active-effect/runtime/derived.js";
import { DGRoll } from "./dg-roll.js";

const { renderTemplate } = foundry.applications.handlebars;

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
    const { target, localizedKey, skillPath } = this.getRollInfoFromKey();
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
      } catch {
        // do nothing
      }
    }

    const { rollTargetModifier } = this;
    const targetDisplayClass =
      getRollTargetDisplayClassFromModifier(rollTargetModifier);

    return showPercentileRollModifyDialog({
      label: this.localizedKey,
      target: this.target,
      targetDisplayClass,
      hideTarget: hideSanTarget,
      defaultModifier: customModifierTarget,
      actor: this.actor,
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
      this.options.messageMode = "blind";
    }

    const label = this.createLabel();

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
    } else if (this.isCritical) {
      resultString = `${game.i18n.localize("DG.Roll.CriticalFailure")}`;
      resultString = `${resultString.toUpperCase()}`;
      styleOverride = "color: red";
    } else {
      resultString = `${game.i18n.localize("DG.Roll.Failure")}`;
    }

    const failureMark =
      this.actor?.type === "agent" &&
      !this.isSuccess &&
      this.skillPath &&
      this.key !== "unnatural" &&
      !foundry.utils.getProperty(this.actor, `${this.skillPath}.failure`) &&
      game.settings.get(DG.ID, "skillFailure");

    const html = await renderTemplate(
      "systems/deltagreen/templates/roll/percentile-roll.hbs",
      {
        styleOverride,
        resultString,
        formula: this.formula,
        total: this.total,
        failureMark,
      },
    );

    // TODO: add setting for it?
    if (failureMark) {
      const keyForUpdate = `${this.skillPath}.failure`;
      const diceSoNice = isDiceSoNiceAvailable();

      const message = await this.toMessage({
        flags: {
          deltagreen: {
            rollbacks: {
              [keyForUpdate]: false,
            },
          },
        },
        content: html,
        label,
      });

      if (diceSoNice) {
        await waitForDiceSoNiceMessageAnimation(message.id);
      }

      // TODO: auto-update actor or post icon with manual apply
      await this.actor.update({
        [keyForUpdate]: true,
      });

      return message;
    }

    return this.toMessage({ content: html, label });
  }

  /**
   * Resolve roll target, localized label, and skill path from `this.key` and `this.actor`.
   *
   * Used for Stat, Skill, Typed Skill, Weapon, and Special Training Rolls.
   *
   * @returns {{ target: number|null, localizedKey: string|null, skillPath: string|null }}
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
      target = skill.targetProficiency ?? skill.proficiency;
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
    const startOfLabel = `<b>${this.localizedKey}`;
    const { rollTargetModifier } = this;
    const endOfLabel = `${game.i18n.localize("DG.Roll.Target")} ${
      this.effectiveTarget
    }`;

    let label = this.isInhuman
      ? // "Inhuman" stat being rolled. See function for details.
        `${startOfLabel} [${game.i18n
          .localize("DG.Roll.Inhuman")
          .toUpperCase()}]</b> ${endOfLabel}`
      : `${startOfLabel}</b><br> ${endOfLabel}%`;

    if (this.modifier || rollTargetModifier) {
      label += ` (${this.target}%`;

      if (this.modifier) {
        label += `${DGUtils.formatStringWithLeadingPlus(this.modifier)}%`;
      }

      if (rollTargetModifier) {
        label += `${DGUtils.formatStringWithLeadingPlus(rollTargetModifier)}%`;
      }

      label += `)`;
    }

    return label;
  }

  /**
   * Active Effect roll-target modifier for this roll type (excludes luck).
   * @returns {number}
   */
  get rollTargetModifier() {
    if (this.type === "luck") return 0;

    try {
      const { rollTarget } = this.actor.system;
      if (!rollTarget) return 0;

      if (this.type === "sanity") return Number(rollTarget.sanity) || 0;
      if (this.type === "stat") return Number(rollTarget.statistics) || 0;
      return Number(rollTarget.allSkills) || 0;
    } catch {
      return 0;
    }
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

    const { rollTargetModifier } = this;

    if (!this.target || Number.isNaN(this.target)) {
      return null;
    }

    target = parseInt(this.target);

    if (rollTargetModifier) {
      target = clampPercentileRollTarget(target, rollTargetModifier, {
        allowOver99: this.target > 99 && this.type === "stat",
      });
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
