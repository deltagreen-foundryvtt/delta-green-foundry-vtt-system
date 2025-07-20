import DGActorSheet from "./base-actor-sheet.js";

/** @extends {DGActorSheet} */
export default class DGAgentSheet extends DGActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = /** @type {const} */ ({
    actions: {
      // Toggles/resets.
      clearBondDamage: DGAgentSheet._clearBondDamage,
      toggleBondDamage: DGAgentSheet._toggleBondDamage,
      resetBreakingPoint: DGAgentSheet._resetBreakingPoint,
      // Other actions.
      applySkillImprovements: DGAgentSheet._applySkillImprovements,
    },
  });

  static TABS = /** @type {const} */ ({
    primary: {
      initial: "skills",
      labelPrefix: "DG.Navigation",
      tabs: [
        { id: "skills", label: "Skills" },
        { id: "physical", label: "Physical" },
        { id: "motivations", label: "Mental" },
        { id: "gear", label: "Gear" },
        { id: "bio", label: "CV" },
        { id: "bonds", label: "Contacts" },
        { id: "about", icon: "fas fa-question-circle", label: "" },
      ],
    },
  });

  static PARTS = /** @type {const} */ ({
    header: {
      template: `${this.TEMPLATE_PATH}/parts/header.html`,
    },
    tabs: super.PARTS.tabs,
    skills: {
      template: `${this.TEMPLATE_PATH}/parts/skills-tab.html`,
      templates: [`${this.TEMPLATE_PATH}/partials/custom-skills-partial.html`],
      scrollable: [""],
    },
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
    gear: {
      template: `${this.TEMPLATE_PATH}/parts/gear-tab.html`,
      scrollable: [""],
    },
    bio: {
      template: `${this.TEMPLATE_PATH}/parts/bio-tab.html`,
      templates: [`${this.TEMPLATE_PATH}/partials/cv-partial.html`],
      scrollable: [""],
    },
    bonds: {
      template: `${this.TEMPLATE_PATH}/parts/bonds-tab.html`,
      scrollable: [""],
    },
    about: {
      template: `${this.TEMPLATE_PATH}/parts/about-tab.html`,
      scrollable: [""],
    },
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

  static _applySkillImprovements(event, target) {
    const failedSkills = Object.entries(this.actor.system.skills).filter(
      (skill) => skill[1].failure,
    );
    const failedTypedSkills = Object.entries(
      this.actor.system.typedSkills,
    ).filter((skill) => skill[1].failure);
    if (failedSkills.length === 0 && failedTypedSkills.length === 0) {
      ui.notifications.warn("No Skills to Increase");
      return;
    }

    let htmlContent = "";
    let failedSkillNames = "";
    failedSkills.forEach(([skill], value) => {
      if (value === 0) {
        failedSkillNames += game.i18n.localize(`DG.Skills.${skill}`);
      } else {
        failedSkillNames += `, ${game.i18n.localize(`DG.Skills.${skill}`)}`;
      }
    });
    failedTypedSkills.forEach(([skillName, skillData], value) => {
      if (value === 0 && failedSkillNames === "") {
        failedSkillNames += `${game.i18n.localize(
          `DG.TypeSkills.${skillData.group.split(" ").join("")}`,
        )} (${skillData.label})`;
      } else {
        failedSkillNames += `, ${game.i18n.localize(
          `DG.TypeSkills.${skillData.group.split(" ").join("")}`,
        )} (${skillData.label})`;
      }
    });

    const baseRollFormula = game.settings.get(
      "deltagreen",
      "skillImprovementFormula",
    );

    htmlContent += `<div>`;
    htmlContent += `     <label>${game.i18n.localize(
      "DG.Skills.ApplySkillImprovementsDialogLabel",
    )} <b>+${baseRollFormula}%</b></label>`;
    htmlContent += `     <hr>`;
    htmlContent += `     <span> ${game.i18n.localize(
      "DG.Skills.ApplySkillImprovementsDialogEffectsFollowing",
    )} <b>${failedSkillNames}</b> </span>`;
    htmlContent += `</div>`;

    new Dialog({
      content: htmlContent,
      title:
        game.i18n.translations.DG?.Skills?.ApplySkillImprovements ??
        "Apply Skill Improvements",
      default: "add",
      buttons: {
        apply: {
          label: game.i18n.translations.DG?.Skills?.Apply ?? "Apply",
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

  static _toggleBondDamage(event, target) {
    const li = target.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    const value = target.checked;

    item.update({ "system.hasBeenDamagedSinceLastHomeScene": value });
  }

  static _clearBondDamage() {
    for (const i of this.actor.itemTypes.bond) {
      // eslint-disable-next-line no-continue
      if (!i.system.hasBeenDamagedSinceLastHomeScene) continue;
      i.update({ "system.hasBeenDamagedSinceLastHomeScene": false });
    }
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
    const resultList = [];
    let rollFormula;

    // Define the amount of dice being rolled, if any.
    switch (baseRollFormula) {
      case "1":
        rollFormula = 1;
        break;
      case "1d3":
        rollFormula = `${failedSkills.length + failedTypedSkills.length}d3`;
        break;
      case "1d4":
      case "1d4-1":
        rollFormula = `${failedSkills.length + failedTypedSkills.length}d4`;
        break;
      default:
    }

    let roll;
    if (rollFormula !== 1) {
      roll = new Roll(rollFormula, actorData);
      await roll.evaluate();
      // Put the results into a list.
      roll.terms[0].results.forEach((result) =>
        resultList.push(
          baseRollFormula === "1d4-1" ? result.result - 1 : result.result,
        ),
      );
    }

    // This will be end up being a list of skills and how much each were improved by. It gets modified in the following loops.
    let improvedSkillList = "";

    // Get copy of current system data, will update this and then apply all changes at once synchronously at the end.
    const updatedData = foundry.utils.duplicate(actorData);

    failedSkills.forEach(([skill], value) => {
      updatedData.skills[skill].proficiency += resultList[value] ?? 1; // Increase proficiency by die result or by 1 if there is no dice roll.
      updatedData.skills[skill].failure = false;

      // So we can record the regular skills improved and how much they were increased by in chat.
      // The if statement tells us whether to add a comma before the term or not.
      if (value === 0) {
        improvedSkillList += `${game.i18n.localize(
          `DG.Skills.${skill}`,
        )}: <b>+${resultList[value] ?? 1}%</b>`;
      } else {
        improvedSkillList += `, ${game.i18n.localize(
          `DG.Skills.${skill}`,
        )}: <b>+${resultList[value] ?? 1}%</b>`;
      }
    });

    failedTypedSkills.forEach(([skillName, skillData], value) => {
      // We must increase value in the following line by the length of failedSkills, so that we index the entire resultList.
      // Otherwise we would be adding the same die results to regular skills and typed skills.
      updatedData.typedSkills[skillName].proficiency +=
        resultList[value + failedSkills.length] ?? 1;
      updatedData.typedSkills[skillName].failure = false;

      // So we can record the typed skills improved and how much they were increased by in chat.
      // The if statement tells us whether to add a comma before the term or not.
      if (value === 0 && improvedSkillList === "") {
        improvedSkillList += `${game.i18n.localize(
          `DG.TypeSkills.${skillData.group.split(" ").join("")}`,
        )} (${skillData.label}): <b>+${
          resultList[value + failedSkills.length] ?? 1
        }%</b>`;
      } else {
        improvedSkillList += `, ${game.i18n.localize(
          `DG.TypeSkills.${skillData.group.split(" ").join("")}`,
        )} (${skillData.label}): <b>+${
          resultList[value + failedSkills.length] ?? 1
        }%</b>`;
      }
    });

    // Probably not worth triggering the update if the user didn't pick any skills
    if (improvedSkillList !== "") {
      await this.actor.update({ system: updatedData });
    }

    let html;
    html = `<div class="dice-roll">`;
    html += `  <div>${improvedSkillList}</div>`;
    html += `</div>`;

    const chatData = {
      speaker: ChatMessage.getSpeaker({
        actor: this.actor,
        token: this.token,
        alias: this.actor.name,
      }),
      content: html,
      flavor: `${game.i18n.localize(
        "DG.Skills.ApplySkillImprovementsChatFlavor",
      )} <b>+${baseRollFormula}%</b>:`,
      type: baseRollFormula === "1" ? 0 : 5, // 0 = CHAT_MESSAGE_TYPES.OTHER, 5 = CHAT_MESSAGE_TYPES.ROLL
      rolls: baseRollFormula === "1" ? [] : [roll], // If adding flat +1, there is no roll.
      rollMode: game.settings.get("core", "rollMode"),
    };

    // Create a message from this roll, if there is one.
    if (roll) return roll.toMessage(chatData);

    // If no roll, create a chat message directly.
    return ChatMessage.create(chatData, {});
  }
}
