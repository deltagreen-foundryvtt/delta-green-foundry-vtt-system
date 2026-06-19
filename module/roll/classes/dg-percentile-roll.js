/** @internal Import roll subclasses only from ../roll.js. */
/* eslint-disable import/prefer-default-export */
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
import { formatProfessionSkillLabel } from "../../profession/index.js";
import { buildRollTargetDisplayHtml } from "../../utils/roll-target-tooltip.js";
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

    const { rollLabel } = this.createChatHeader();

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
        rollLabel,
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

    return this.toMessage({ content: html, rollLabel });
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
      localizedKey = formatProfessionSkillLabel({
        kind: "typed",
        group: skill.group,
        label: skill.label,
      });
      skillPath = `system.typedSkills.${this.key}`;
    }
    if (this.key === "ritual") {
      target = actorData.sanity.ritual;
      localizedKey = game.i18n.localize(`DG.Skills.ritual`);
    }
    return { target, localizedKey, skillPath };
  }

  /**
   * i18n key for a user-facing warning when this roll must not be made, or null if allowed.
   * @returns {string|null}
   */
  get blockedRollMessage() {
    if (this.type !== "stat") return null;

    const x5 = Number(this.target);
    if (!Number.isFinite(x5) || x5 < 1) {
      return "DG.Roll.CannotRollStat";
    }
    return null;
  }

  /**
   * Active-effect roll target field for this roll type (excludes luck).
   * @returns {"system.rollTarget.allSkills"|"system.rollTarget.sanity"|"system.rollTarget.statistics"|null}
   */
  get rollTargetFieldKey() {
    if (this.type === "luck") return null;
    if (this.type === "sanity") return "system.rollTarget.sanity";
    if (this.type === "stat") return "system.rollTarget.statistics";
    return "system.rollTarget.allSkills";
  }

  /**
   * Create the roll label shown below the card header.
   *
   * @returns {{ rollLabel: string }}
   */
  createChatHeader() {
    let displayKey = this.localizedKey;
    if (
      this.type === "weapon" &&
      this.item?.name &&
      this.key !== "unarmed_combat"
    ) {
      displayKey = `${this.localizedKey} (${this.item.name})`;
    }

    const title = this.isInhuman
      ? `<b>${displayKey} [${game.i18n
          .localize("DG.Roll.Inhuman")
          .toUpperCase()}]</b>`
      : `<b>${displayKey}</b>`;

    const targetValue = this.isInhuman
      ? `${this.effectiveTarget}`
      : `${this.effectiveTarget}%`;

    const base = Number(this.target) || 0;
    const targetLine = buildRollTargetDisplayHtml({
      targetValue,
      actor: this.actor,
      rollTargetFieldKey: this.rollTargetFieldKey,
      base,
      manualModifier: this.modifier,
      finalTarget: this.effectiveTarget,
      allowOver99: this.target > 99 && this.type === "stat",
    });

    return { rollLabel: `${title}: ${targetLine}` };
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
   * Actual target for the roll accounting for Active Effects and manual modifiers.
   * All modifiers are summed on the base target, then clamped to 1–99 (or above 99 for inhuman stats).
   *
   * @returns {null|integer}
   */
  get effectiveTarget() {
    if (this.target == null || Number.isNaN(this.target)) {
      return null;
    }

    const base = parseInt(this.target);
    const rollTargetModifier = Number(this.rollTargetModifier) || 0;
    const manualModifier =
      this.modifier && !Number.isNaN(this.modifier)
        ? parseInt(this.modifier)
        : 0;
    const totalModifier = rollTargetModifier + manualModifier;

    if (!totalModifier) return base;

    return clampPercentileRollTarget(base, totalModifier, {
      allowOver99: this.target > 99 && this.type === "stat",
    });
  }
}
