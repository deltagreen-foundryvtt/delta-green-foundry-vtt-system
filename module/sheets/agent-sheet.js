import { DG, BASE_TEMPLATE_PATH } from "../config.js";
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
      applySkillImprovements: DGAgentSheet._applySkillImprovements,
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

  static async _applySkillImprovements() {
    const { skills, typedSkills } = this.actor.system;

    const failedSkills = Object.values(skills).filter((data) => data.failure);

    const failedTypedSkills = Object.values(typedSkills).filter(
      (data) => data.failure,
    );

    const localizedFailedSkills = failedSkills.map((skill) =>
      game.i18n.localize(`DG.Skills.${skill.key}`),
    );

    const localizedFailedTypedSkills = failedTypedSkills.map((skill) => {
      const groupKey = `DG.TypeSkills.${skill.group.replace(/\s+/g, "")}`;
      const groupLabel = game.i18n.localize(groupKey);
      return `${groupLabel} (${skill.label})`;
    });

    if (failedSkills.length === 0 && failedTypedSkills.length === 0) {
      ui.notifications.warn("DG.Skills.ApplySkillImprovements.Warning", {
        localize: true,
      });
      return;
    }

    const failedSkillNames = [
      ...localizedFailedSkills,
      ...localizedFailedTypedSkills,
    ].join(", ");

    const baseRollFormula = game.settings.get(DG.ID, "skillImprovementFormula");

    const content = await renderTemplate(
      `${BASE_TEMPLATE_PATH}/dialog/apply-skill-improvements.html`,
      { failedSkillNames, baseRollFormula },
    );

    new Dialog({
      content,
      title: game.i18n.localize("DG.Skills.ApplySkillImprovements.Title"),
      default: "add",
      buttons: {
        apply: {
          label: game.i18n.localize("DG.Skills.Apply"),
          callback: (btn) => {
            this._applySkillImprovements(
              baseRollFormula,
              failedSkills,
              failedTypedSkills,
            );
          },
        },
      },
    }).render(true);
  }

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

    let currentBreakingPoint = 0;

    currentBreakingPoint =
      this.actor.system.sanity.value - this.actor.system.statistics.pow.value;

    if (currentBreakingPoint < 0) {
      currentBreakingPoint = 0;
    }

    const updatedData = foundry.utils.duplicate(this.actor.system);

    updatedData.sanity.currentBreakingPoint = currentBreakingPoint;

    this.actor.update({ system: updatedData });
  }

  // For any skills a user has checked off as failed, roll the improvement and update the agent's skills to their new values
  async _applySkillImprovements(
    baseRollFormula,
    failedSkills,
    failedTypedSkills,
  ) {
    const actorData = this.actor.system;
    const totalFailures = failedSkills.length + failedTypedSkills.length;
    const resultList = [];

    // Determine roll formula
    let rollFormula;
    switch (baseRollFormula) {
      case "1":
        rollFormula = 1;
        break;
      case "1d3":
      case "1d4":
      case "1d4-1":
        rollFormula = `${totalFailures}${baseRollFormula.replace(/-.*/, "")}`;
        break;
      default:
        throw new Error(`Unknown baseRollFormula: ${baseRollFormula}`);
    }

    let roll;
    if (rollFormula !== 1) {
      roll = new Roll(rollFormula, actorData);
      await roll.evaluate();

      const modifier = baseRollFormula === "1d4-1" ? -1 : 0;
      resultList.push(
        ...roll.terms[0].results.map((result) => result.result + modifier),
      );
    }

    const updatedSkills = foundry.utils.duplicate(actorData.skills);
    const updatedTypedSkills = foundry.utils.duplicate(actorData.typedSkills);

    const applyImprovements = (skillsArray, updatedTarget, offset = 0) => {
      return skillsArray.map((skill, i) => {
        const index = i + offset;
        const increment = resultList[index] ?? 1;
        updatedTarget[skill.key].proficiency += increment;
        updatedTarget[skill.key].failure = false;

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

    const failedSkillTexts = applyImprovements(failedSkills, updatedSkills);
    const failedTypedSkillTexts = applyImprovements(
      failedTypedSkills,
      updatedTypedSkills,
      failedSkills.length,
    );

    const content = [...failedSkillTexts, ...failedTypedSkillTexts].join(", ");

    const flavor = game.i18n.format(
      "DG.Skills.ApplySkillImprovements.ChatFlavor",
      { formula: rollFormula },
    );

    const chatData = {
      speaker: ChatMessage.getSpeaker({
        actor: this.actor,
        token: this.token,
        alias: this.actor.name,
      }),
      content,
      flavor,
      type: roll
        ? CONST.CHAT_MESSAGE_TYPES.ROLL
        : CONST.CHAT_MESSAGE_TYPES.OTHER,
      rolls: roll ? [roll] : [],
      rollMode: game.settings.get("core", "rollMode"),
    };

    if (roll) {
      await roll.toMessage(chatData);
    } else {
      await ChatMessage.create(chatData);
    }

    return this.actor.update({
      system: {
        skills: updatedSkills,
        typedSkills: updatedTypedSkills,
      },
    });
  }
}
