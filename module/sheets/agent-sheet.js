import DG, { BASE_TEMPLATE_PATH } from "../config.js";
import { packSkillGroupsIntoColumns } from "../utils/skill-layout.js";
import { createAgentResourceChatMessage } from "../utils/resource-chat.js";
import {
  createSkillImprovementChatMessage,
  evaluateSkillImprovementRolls,
  getSkillImprovementFormulaAsPercent,
} from "../roll/skill-improvement-roll.js";
import DGActorSheet from "./base-actor-sheet.js";
import ActorEditStatForm from "../applications/edit-stats.js";
import EffectsTabMixin from "./mixins/effects-tab-mixin.js";
import {
  applyStimulantEffect,
  clearStimulantEffects,
  getEffectiveSuppressExhaustion,
  hasActiveStimulantEffect,
} from "../utils/stimulant-effect.js";

const { DialogV2 } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;

const AgentSheetBase = EffectsTabMixin(DGActorSheet);

/** @extends {AgentSheetBase} */
export default class DGAgentSheet extends AgentSheetBase {
  /** @override */
  static DEFAULT_OPTIONS = /** @type {const} */ ({
    classes: ["agent-sheet"],
    position: { width: 978, height: 720 },
    actions: {
      // Resets.
      clearBondDamage: DGAgentSheet._clearBondDamage,
      resetBreakingPoint: DGAgentSheet._resetBreakingPoint,
      // Other actions.
      applySkillImprovements: DGAgentSheet._processSkillImprovements,
      openStatsEdit: DGAgentSheet._openStatsEdit,
      toggleCustomSkillsEdit: function toggleCustomSkillsEdit(event) {
        event.preventDefault();
        event.stopPropagation();
        this._customSkillsEditMode = !this._customSkillsEditMode;
        this._syncCustomSkillsEditModeUi();
        return this.render();
      },
      createEffect: AgentSheetBase.createEffect,
      openEffect: AgentSheetBase.openEffect,
      deleteEffect: AgentSheetBase.deleteEffect,
      toggleEffect: AgentSheetBase.toggleEffect,
      openEffectOrigin: AgentSheetBase.openEffectOrigin,
      toggleAcuteEpisode: DGAgentSheet._toggleAcuteEpisode,
      exhaustAgent: DGAgentSheet._exhaustAgent,
      restAgent: DGAgentSheet._restAgent,
      takeStimulants: DGAgentSheet._takeStimulants,
    },
  });

  /** @type {boolean} */
  _customSkillsEditMode = false;

  /** @override */
  static TABS = /** @type {const} */ ({
    primary: {
      initial: "skills",
      labelPrefix: "DG.Navigation.Agent",
      tabs: [
        { id: "skills" },
        { id: "combat" },
        { id: "motivations" },
        { id: "gear" },
        { id: "personal" },
        { id: "effects" },
        { id: "about", icon: "fas fa-question-circle", label: "" },
      ],
    },
    leftBarRestSanity: {
      initial: "rest",
      labelPrefix: "DG.Navigation.Agent.LeftBar",
      tabs: [{ id: "rest" }, { id: "sanity" }],
    },
  });

  /** @override */
  static PARTS = /** @type {const} */ ({
    leftBar: {
      template: `${this.TEMPLATE_PATH}/parts/left-bar.html`,
      templates: [
        `${this.TEMPLATE_PATH}/partials/sanity-partial.html`,
        `${this.TEMPLATE_PATH}/partials/left-bar-exhaustion-section.html`,
        `${this.TEMPLATE_PATH}/partials/left-bar-rest-tab.html`,
        `${this.TEMPLATE_PATH}/partials/left-bar-sanity-tab.html`,
      ],
    },
    tabs: this.BASE_PARTS.tabs,
    rightBar: {
      template: `${this.TEMPLATE_PATH}/parts/right-bar.html`,
      templates: [
        `${this.TEMPLATE_PATH}/parts/skills-tab-agent.html`,
        `${this.TEMPLATE_PATH}/parts/combat-tab-agent.html`,
        `${this.TEMPLATE_PATH}/parts/motivations-tab-agent.html`,
        `${this.TEMPLATE_PATH}/parts/gear-tab-agent.html`,
        `${this.TEMPLATE_PATH}/parts/personal-tab-agent.html`,
        `${this.TEMPLATE_PATH}/parts/effects-tab.html`,
        `${this.TEMPLATE_PATH}/parts/about-tab.html`,
        `${this.TEMPLATE_PATH}/partials/custom-skills-partial-agent.html`,
        `${this.TEMPLATE_PATH}/partials/bonds-section-partial.html`,
        `${this.TEMPLATE_PATH}/partials/weapons-section-partial.html`,
        `${this.TEMPLATE_PATH}/partials/armor-section-partial.html`,
        `${this.TEMPLATE_PATH}/partials/injuries-section-partial.html`,
        `${this.TEMPLATE_PATH}/partials/other-gear-section-partial.html`,
        `${this.TEMPLATE_PATH}/partials/notes-partial.html`,
      ],
    },
  });

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    if (!this.actor.limited) return;

    options.parts = ["leftBar", "tabs", "rightBar"];
  }

  /** @override */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);

    if (!this.actor.limited || this.actor.type !== "agent" || group !== "primary") {
      return tabs;
    }

    return {
      personal: { ...tabs.personal, active: true, cssClass: "active" },
    };
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.tabs = this._prepareTabs("primary");
    context.leftBarRestSanityTabs = this._prepareTabs("leftBarRestSanity");

    if (this.actor.type !== "agent") return context;

    context.typedSkillColumns = this._prepareTypedSkillColumns();
    context.customSkillsEditMode = this._customSkillsEditMode;
    context.physicalUi = this._preparePhysicalUi();

    return context;
  }

  /** @returns {object} */
  _preparePhysicalUi() {
    const { physical } = this.actor.system;
    const isExhausted = DGAgentSheet._isActorExhausted(this.actor);
    const stimulantActive = hasActiveStimulantEffect(this.actor);
    const suppressExhaustion = getEffectiveSuppressExhaustion(this.actor);
    return {
      isExhausted,
      displayPenalty: isExhausted ? physical.exhaustedPenalty : 0,
      suppressExhaustionInactive: !isExhausted,
      suppressExhaustionInputDisabled: !isExhausted || stimulantActive,
      suppressExhaustionChecked: isExhausted && suppressExhaustion,
    };
  }

  /** @override */
  _sortCustomSkills() {
    // Agent sheet uses typedSkillColumns instead of sortedCustomSkills.
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this._syncCustomSkillsEditModeUi();
  }

  /** @returns {void} */
  _syncCustomSkillsEditModeUi() {
    this.element?.classList.toggle(
      "custom-skills-edit-mode",
      Boolean(this._customSkillsEditMode),
    );
  }

  /**
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _toggleAcuteEpisode(event, target) {
    event.preventDefault();
    const itemId =
      target.dataset.itemId ?? target.closest("[data-item-id]")?.dataset?.itemId;
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "motivation") return;
    await item.update({
      "system.acuteEpisode": !item.system.acuteEpisode,
    });
  }

  static _clearBondDamage() {
    for (const bond of this.actor.itemTypes.bond) {
      if (!bond.system.hasBeenDamagedSinceLastHomeScene) continue;
      bond.update({ "system.hasBeenDamagedSinceLastHomeScene": false });
    }
  }

  /**
   * Resets the actor's current breaking point by recalculating it as the difference
   * between the actor's sanity value and POW value, ensuring it is non-negative,
   * and updates the actor's system with this new breaking point.
   *
   * @returns {void}
   */
  static _resetBreakingPoint() {
    const pow =
      this.actor.system.statistics.pow.effectiveValue ??
      this.actor.system.statistics.pow.value;
    const currentBreakingPoint = Math.max(
      this.actor.system.sanity.value - pow,
      0,
    );

    const dataToUpdate = {
      "system.sanity.currentBreakingPoint": currentBreakingPoint,
    };
    if (!this.actor.system.sanity.adaptations.violence.isAdapted) {
      dataToUpdate["system.sanity.adaptations.violence.incident1"] = false;
      dataToUpdate["system.sanity.adaptations.violence.incident2"] = false;
      dataToUpdate["system.sanity.adaptations.violence.incident3"] = false;
    }
    if (!this.actor.system.sanity.adaptations.helplessness.isAdapted) {
      dataToUpdate["system.sanity.adaptations.helplessness.incident1"] = false;
      dataToUpdate["system.sanity.adaptations.helplessness.incident2"] = false;
      dataToUpdate["system.sanity.adaptations.helplessness.incident3"] = false;
    }

    this.actor.update(dataToUpdate);
  }

  /**
   * Builds grouped typed-skill columns for the skills tab.
   *
   * @returns {object[][]}
   */
  _prepareTypedSkillColumns() {
    const groupsMap = new Map();

    for (const [key, skill] of Object.entries(this.actor.system.typedSkills)) {
      const groupKey = skill.group;
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          group: groupKey,
          label: game.i18n.localize(`DG.TypeSkills.${groupKey}`),
          skills: [],
          rowCount: 0,
        });
      }

      groupsMap.get(groupKey).skills.push({
        ...skill,
        key,
        actorType: this.actor.type,
      });
    }

    const groups = [...groupsMap.values()].map((group) => {
      group.skills.sort((a, b) =>
        a.label.localeCompare(b.label, game.i18n.lang),
      );
      group.rowCount = 1 + group.skills.length;
      return group;
    });

    groups.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));

    const trainings = this._prepareSpecialTrainingBlocks();
    if (trainings.length > 0) {
      groups.push({
        group: "specialTraining",
        isSpecialTraining: true,
        label: game.i18n.localize("DG.Sheet.BlockHeaders.SpecialTraining"),
        skills: trainings,
        rowCount: 1 + trainings.length,
      });
    }

    return packSkillGroupsIntoColumns(
      groups,
      3,
      game.settings.get("deltagreen", "sortSkills"),
    );
  }

  /**
   * Sorted special-training blocks for the skills tab (single-column list).
   *
   * @returns {object[]}
   */
  _prepareSpecialTrainingBlocks() {
    const trainings = this._prepareSpecialTrainings().map((training) => ({
      ...training,
      sortLabel: training.name.toUpperCase(),
      actorType: this.actor.type,
    }));

    trainings.sort((a, b) =>
      a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang),
    );

    return trainings;
  }

  static _openStatsEdit() {
    const form = new ActorEditStatForm({
      actor: this.actor,
    });
    form.render(true);
  }

  /**
   * @param {number} raw
   * @returns {number}
   */
  static _normalizeExhaustionPenalty(raw) {
    const value = Number(raw);
    if (Number.isNaN(value) || value === 0) return -20;
    return value > 0 ? -1 * Math.abs(value) : value;
  }

  static async _exhaustAgent() {
    const actor = this.actor;
    const content = await renderTemplate(
      `${BASE_TEMPLATE_PATH}/dialog/exhaust-agent.html`,
      {
        penalty: actor.system.physical.exhaustedPenalty ?? -20,
      },
    );

    let penalty = null;
    const confirmed = await DialogV2.wait({
      content,
      window: {
        title: game.i18n.localize("DG.Physical.ExhaustDialogTitle"),
      },
      buttons: [
        {
          action: "rollWpLoss",
          label: game.i18n.localize("DG.Physical.RollWillpowerLoss"),
          default: true,
          icon: "fas fa-dice",
          callback: (_event, _button, dialog) => {
            const input = dialog.element.querySelector('[name="exhaustionPenalty"]');
            penalty = DGAgentSheet._normalizeExhaustionPenalty(input?.value);
            return true;
          },
        },
      ],
    });

    if (!confirmed || penalty === null) return;

    const wpRoll = await new Roll("1d6").evaluate();
    const loss = wpRoll.total;
    const currentWp = Number(actor.system.wp.value) || 0;
    const maxWp = Number(actor.system.wp.max) || 0;
    const newWp = Math.max(0, currentWp - loss);

    await actor.update({
      "system.physical.exhausted": true,
      "system.physical.exhaustedPenalty": penalty,
      "system.wp.value": newWp,
    });

    await createAgentResourceChatMessage({
      actor,
      token: this.token,
      contentKey: "DG.Physical.Chat.Exhausted",
      i18nData: {
        name: actor.name,
        loss,
        current: newWp,
        max: maxWp,
      },
    });
  }

  static async _restAgent() {
    const actor = this.actor;

    if (getEffectiveSuppressExhaustion(actor)) {
      ui.notifications.warn(
        game.i18n.format("DG.Physical.RestBlockedWhileSuppressed", {
          name: actor.name,
        }),
      );
      return;
    }

    const wpRoll = await new Roll("1d6").evaluate();
    const gain = wpRoll.total;
    const currentWp = Number(actor.system.wp.value) || 0;
    const maxWp = Number(actor.system.wp.max) || 0;
    const newWp = Math.min(maxWp, currentWp + gain);

    await clearStimulantEffects(actor);

    await actor.update({
      "system.physical.exhausted": false,
      "system.physical.suppressExhaustion": false,
      "system.wp.value": newWp,
    });

    await createAgentResourceChatMessage({
      actor,
      token: this.token,
      contentKey: "DG.Physical.Chat.Rested",
      i18nData: {
        name: actor.name,
        gain,
        current: newWp,
        max: maxWp,
      },
    });
  }

  /**
   * @param {Actor} actor
   * @returns {boolean}
   */
  static _isActorExhausted(actor) {
    return Boolean(actor._source?.system?.physical?.exhausted);
  }

  static async _takeStimulants() {
    const actor = this.actor;

    if (!DGAgentSheet._isActorExhausted(actor)) {
      ui.notifications.info(
        game.i18n.format("DG.Physical.StimulantsNotExhaustedWarning", {
          name: actor.name,
        }),
      );
      return;
    }

    const content = await renderTemplate(
      `${BASE_TEMPLATE_PATH}/dialog/take-stimulants.html`,
      {},
    );

    const choice = await DialogV2.wait({
      content,
      window: {
        title: game.i18n.localize("DG.Physical.StimulantsDialogTitle"),
      },
      classes: ["stimulants-dialog-app"],
      buttons: [
        {
          action: "regular",
          label: game.i18n.localize("DG.Physical.StimulantsRegular"),
          default: true,
          callback: () => "regular",
        },
        {
          action: "hard",
          label: game.i18n.localize("DG.Physical.StimulantsHard"),
          callback: () => "hard",
        },
      ],
    });

    if (!choice) return;

    const formula = choice === "hard" ? "2d6" : "1d6";
    const hoursRoll = await new Roll(formula).evaluate();
    const hours = hoursRoll.total;
    const contentKey =
      choice === "hard"
        ? "DG.Physical.Chat.StimulantsHard"
        : "DG.Physical.Chat.StimulantsRegular";

    const appliedHours = await applyStimulantEffect(actor, hours);

    await createAgentResourceChatMessage({
      actor,
      token: this.token,
      contentKey,
      i18nData: {
        name: actor.name,
        hours: appliedHours,
      },
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

    const failedSkills = Object.values(skills).filter(
      (skill) => skill.failure && !skill.cannotBeImprovedByFailure,
    );
    const failedTypedSkills = Object.values(typedSkills).filter(
      (skill) => skill.failure && !skill.cannotBeImprovedByFailure,
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

    const resultObj = await evaluateSkillImprovementRolls(
      this.actor,
      baseRollFormula,
      failedSkills,
      failedTypedSkills,
    );

    await createSkillImprovementChatMessage({
      actor: this.actor,
      token: this.token,
      baseFormula: baseRollFormula,
      failedSkills,
      failedTypedSkills,
      resultObj,
    });

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
        baseFormula: getSkillImprovementFormulaAsPercent(baseFormula),
      },
    );

    return foundry.applications.api.DialogV2.wait({
      content,
      window: {
        title: game.i18n.localize("DG.Skills.ApplySkillImprovements.Title"),
      },
      buttons: [
        {
          default: true,
          action: "apply",
          label: game.i18n.localize("DG.Skills.Apply"),
          icon: "<i class='fas fa-check'></i>",
        },
      ],
    });
  }

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
