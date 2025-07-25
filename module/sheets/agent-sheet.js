import DG, { BASE_TEMPLATE_PATH } from "../config.js";
import DGActorSheet from "./base-actor-sheet.js";

const { renderTemplate } = foundry.applications.handlebars;

/** @extends {DGActorSheet} */
export default class DGAgentSheet extends DGActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = /** @type {const} */ ({
    actions: {
      // Resets.
      clearBondDamage: DGAgentSheet._clearBondDamage,
      resetBreakingPoint: DGAgentSheet._resetBreakingPoint,
      // Other actions.
      applySkillImprovements: DGAgentSheet._processSkillImprovements,
    },
  });

  static TABS = /** @type {const} */ ({
    primary: {
      initial: "skills",
      labelPrefix: "DG.Navigation.Agent",
      tabs: [
        { id: "skills" },
        { id: "physical" },
        { id: "motivations" },
        { id: "gear" },
        { id: "bio" },
        { id: "bonds" },
        { id: "about", icon: "fas fa-question-circle", label: "" },
      ],
    },
  });

  /** @override */
  static PARTS = /** @type {const} */ ({
    header: this.BASE_PARTS.header,
    tabs: this.BASE_PARTS.tabs,
    skills: this.BASE_PARTS.skills,
    physical: {
      template: `${this.TEMPLATE_PATH}/parts/physical-tab.html`,
      templates: [
        `${this.TEMPLATE_PATH}/partials/attributes-grid-partial.html`,
      ],
      scrollable: [""],
    },
    motivations: {
      template: `${this.TEMPLATE_PATH}/parts/motivations-tab.html`,
    },
    gear: this.BASE_PARTS.gear,
    bio: {
      template: `${this.TEMPLATE_PATH}/parts/bio-tab.html`,
      templates: [`${this.TEMPLATE_PATH}/partials/notes-partial.html`],
      scrollable: [""],
    },
    bonds: {
      template: `${this.TEMPLATE_PATH}/parts/bonds-tab.html`,
      scrollable: [""],
    },
    about: this.BASE_PARTS.about,
  });

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.actor.system.physicalDescription,
        {
          rollData: this.document.getRollData(),
          relativeTo: this.document,
        },
      );
    const { HTMLProseMirrorElement } = foundry.applications.elements;
    context.descriptionField = HTMLProseMirrorElement.create({
      name: "system.physicalDescription",
      value: this.actor.system.physicalDescription,
      enriched: enrichedDescription,
      toggled: true,
    }).outerHTML;

    return context;
  }

  /* -------------------------------------------- */

  /** Resets the actor's current breaking point based on their sanity and POW statistics. */
  static _resetBreakingPoint() {
    const systemData = this.actor.system;

    const newBreakingPoint =
      systemData.sanity.value - systemData.statistics.pow.value;

    const updatedData = foundry.utils.duplicate(systemData);
    updatedData.sanity.currentBreakingPoint = newBreakingPoint;
    this.actor.update({ system: updatedData });
  }

  _resetBreakingPoint(event) {
    event.preventDefault();

    const currentBreakingPoint = Math.max(
      this.actor.system.sanity.value - this.actor.system.statistics.pow.value,
      0,
    );

    this.actor.update({
      "system.sanity.currentBreakingPoint": currentBreakingPoint,
    });
  }

  /**
   * Runs through the whole process of improving skills,
   * i.e., prompting the user, rolling, and creating the chat card.
   *
   * @returns {Promise<void>}
   */
  static async _processSkillImprovements() {
    const { skills, typedSkills } = this.actor.system;

    const failedSkills = Object.values(skills).filter((skill) => skill.failure);
    const failedTypedSkills = Object.values(typedSkills).filter(
      (skill) => skill.failure,
    );

    if (failedSkills.length + failedTypedSkills.length === 0) {
      ui.notifications.warn("DG.Skills.ApplySkillImprovements.Warning", {
        localize: true,
      });
      return null;
    }

    const baseRollFormula = game.settings.get(DG.ID, "skillImprovementFormula");

    const prompt = await DGAgentSheet._createSkillImprovementDialog(
      baseRollFormula,
      failedSkills,
      failedTypedSkills,
    );

    if (!prompt) return null;

    const { roll, resultObj } = await this._createSkillImprovementRolls(
      baseRollFormula,
      failedSkills,
      failedTypedSkills,
    );

    await this._createSkillImprovementChatCard(
      failedSkills,
      failedTypedSkills,
      roll,
      resultObj,
    );

    return this._applySkillImprovements(
      failedSkills,
      failedTypedSkills,
      resultObj,
    );
  }

  /**
   * A map of skill keys -> number to improve them by
   * @typedef {Object<string, number>} ResultObj
   */

  /**
   * @typedef {Object} FailedSkill
   */

  /**
   * @typedef {FailedSkill} FailedTypedSkill
   */

  /**
   * The formula used to calculate skill improvements
   * Note. There is not a leading number of dice here, just 1 or dX-Y.
   * @typedef {"1"|"d3"|"d4"|"d4-1"} SkillImprovementFormula
   */

  /**
   * Creates and displays a dialog to approve applying skill improvements to failed skills.
   *
   * @param {SkillImprovementFormula} baseFormula - The formula used to calculate skill improvements.
   * @param {FailedSkill[]} failedSkills - An array of failed skills.
   * @param {FailedTypedSkill[]} failedTypedSkills - An array of failed typed skills.
   *
   * @returns {Promise<Boolean>} - A promise that resolves to `true` if accepted, `false` otherwise.
   */
  static async _createSkillImprovementDialog(
    baseFormula,
    failedSkills,
    failedTypedSkills,
  ) {
    const localizedFailedSkills = failedSkills.map((skill) =>
      game.i18n.localize(`DG.Skills.${skill.key}`),
    );

    const localizedFailedTypedSkills = failedTypedSkills.map((skill) => {
      const groupKey = `DG.TypeSkills.${skill.group.replace(/\s+/g, "")}`;
      const groupLabel = game.i18n.localize(groupKey);
      return `${groupLabel} (${skill.label})`;
    });

    const failedSkillNames = [
      ...localizedFailedSkills,
      ...localizedFailedTypedSkills,
    ].join(", ");

    const content = await renderTemplate(
      `${BASE_TEMPLATE_PATH}/dialog/apply-skill-improvements.html`,
      {
        failedSkillNames,
        baseFormula: `${baseFormula === "1" ? "1" : `1${baseFormula}`}%`,
      },
    );

    return Dialog.wait({
      content,
      title: game.i18n.localize("DG.Skills.ApplySkillImprovements.Title"),
      default: "apply",
      buttons: {
        apply: {
          label: game.i18n.localize("DG.Skills.Apply"),
          icon: "<i class='fas fa-check'></i>",
        },
      },
    });
  }

  /**
   * Generates and evaluates the rolls for skill improvements based on failed skills.
   *
   * @param {SkillImprovementFormula} baseFormula - The formula used to calculate skill improvements.
   * @param {FailedSkill[]} failedSkills - An array of failed skills.
   * @param {FailedTypedSkill[]} failedTypedSkills - An array of failed typed skills.
   *
   * @returns {Promise<{roll: Roll|undefined, resultObj: ResultObj}>} - An object containing the roll result and a map of skill keys to improvement values.
   *
   * @throws {Error} - Throws an error if the baseFormula is unknown.
   */
  async _createSkillImprovementRolls(
    baseFormula,
    failedSkills,
    failedTypedSkills,
  ) {
    const totalFailures = failedSkills.length + failedTypedSkills.length;

    if (!Object.keys(DG.skillImprovementFormulas).includes(baseFormula)) {
      throw new Error(`Unknown roll formula: ${baseFormula}`);
    }

    const rollFormula =
      baseFormula === "1" ? "1" : `${totalFailures}${baseFormula}`;

    let roll;
    const resultObj = {};
    if (rollFormula !== "1") {
      roll = await new Roll(rollFormula, this.actor.system).evaluate();
      [...failedSkills, ...failedTypedSkills].forEach((skill, index) => {
        const { result } = roll.terms[0].results[index];
        resultObj[skill.key] = result;
      });
    }

    return { roll, resultObj };
  }

  /**
   * Create a chat card to record skill improvements.
   *
   * @param {FailedSkill[]} failedSkills - array of failed skills
   * @param {FailedTypedSkill[]} failedTypedSkills - array of failed typed skills
   * @param {Roll|undefined} roll - the improvement roll
   * @param {ResultObj} resultObj
   *
   * @returns {Promise<ChatMessage>}
   */
  _createSkillImprovementChatCard(
    failedSkills,
    failedTypedSkills,
    roll,
    resultObj,
  ) {
    const localizeFailedSkills = (skillsArray) => {
      return skillsArray.map((skill) => {
        const increment = resultObj[skill.key] ?? 1;
        const label =
          skill.label ?? game.i18n.localize(`DG.Skills.${skill.key}`); // fallback for regular skills
        const groupLabel = skill.group
          ? `${game.i18n.localize(
              `DG.TypeSkills.${skill.group.replace(/\s+/g, "")}`,
            )} (${label})`
          : label;

        return `${groupLabel}: <b>+${increment}%</b>`;
      });
    };

    const failedSkillNames = localizeFailedSkills(failedSkills);
    const failedTypedSkillNames = localizeFailedSkills(failedTypedSkills);

    // Prepare chat data
    const content = [...failedSkillNames, ...failedTypedSkillNames].join(", ");
    const flavor = game.i18n.format(
      "DG.Skills.ApplySkillImprovements.ChatFlavor",
      { formula: `${roll.formula?.replace(/^.*d/, "1d") ?? "1"}%` }, // formula = 1, otherwise 1dX-Y (i.e. 1d3, 1d4, 1d4-1)
    );
    const type = roll
      ? CONST.CHAT_MESSAGE_TYPES.ROLL
      : CONST.CHAT_MESSAGE_TYPES.OTHER;

    const chatData = {
      speaker: ChatMessage.getSpeaker({
        actor: this.actor,
        token: this.token,
        alias: this.actor.name,
      }),
      content,
      flavor,
      type,
      rolls: roll ? [roll] : [],
      rollMode: game.settings.get("core", "rollMode"),
    };

    if (roll) return roll.toMessage(chatData);
    return ChatMessage.create(chatData);
  }

  /**
   * Updates the actor's skills / typed skills with the improvements,
   * persisting the changes to the database.
   *
   * @param {FailedSkill[]} failedSkills - array of failed skills that need to be updated
   * @param {FailedTypedSkill[]} failedTypedSkills - array of failed skills that need to be updated
   * @param {ResultObj} resultObj
   * @returns {Promise<DeltaGreenActor>} - the update promise
   */
  _applySkillImprovements(failedSkills, failedTypedSkills, resultObj) {
    const updateSkills = (skillsArray, updatedTarget) => {
      skillsArray.forEach((skill) => {
        const increment = resultObj[skill.key] ?? 1;
        updatedTarget[skill.key].proficiency += increment;
        updatedTarget[skill.key].failure = false;
      });
    };

    const actorData = this.actor.system;
    // Get data and update it.
    const updatedSkills = foundry.utils.duplicate(actorData.skills);
    const updatedTypedSkills = foundry.utils.duplicate(actorData.typedSkills);
    updateSkills(failedSkills, updatedSkills);
    updateSkills(failedTypedSkills, updatedTypedSkills);

    // Send updates to database.
    return this.actor.update({
      system: { skills: updatedSkills, typedSkills: updatedTypedSkills },
    });
  }
}
