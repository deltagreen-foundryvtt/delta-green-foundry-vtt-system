import DGAgentSheet from "./agent-sheet.js";
import ActorEditStatForm from "./edit-stats.js";

/** @extends {DGAgentSheet} */
export default class DGAgentSheetV2 extends DGAgentSheet {
  static DEFAULT_OPTIONS = /** @type {const} */ ({
    classes: ["actor-sheet-v2"],
    position: { width: 958, height: 700 },
    actions: {
      openStatsEdit: this._openStatsEdit,
      toggleCustomSkillsEdit: function toggleCustomSkillsEdit(event) {
        event.preventDefault();
        event.stopPropagation();
        this._customSkillsEditMode = !this._customSkillsEditMode;
        this._syncCustomSkillsEditModeUi();
        return this.render();
      },
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
        { id: "about", icon: "fas fa-question-circle", label: "" },
      ],
    },
  });

  /** @override */
  static PARTS = /** @type {const} */ ({
    leftBar: {
      template: `${this.TEMPLATE_PATH}/parts/left-bar.html`,
      templates: [`${this.TEMPLATE_PATH}/partials/sanity-partial.html`],
    },
    tabs: this.BASE_PARTS.tabs,
    rightBar: {
      template: `${this.TEMPLATE_PATH}/parts/right-bar.html`,
      templates: [
        `${this.TEMPLATE_PATH}/parts/skills-tab-v2.html`,
        `${this.TEMPLATE_PATH}/parts/combat-tab-v2.html`,
        `${this.TEMPLATE_PATH}/parts/motivations-tab-v2.html`,
        `${this.TEMPLATE_PATH}/parts/gear-tab-v2.html`,
        `${this.TEMPLATE_PATH}/parts/personal-tab-v2.html`,
        `${this.TEMPLATE_PATH}/parts/about-tab.html`,
        `${this.TEMPLATE_PATH}/partials/custom-skills-partial-v2.html`,
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

    if (!this.actor.limited || this.actor.type !== "agent") return tabs;

    return {
      personal: { ...tabs.personal, active: true, cssClass: "active" },
    };
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    if (this.actor.type !== "agent") return context;

    context.typedSkillColumns = this._prepareTypedSkillColumns();
    context.customSkillsEditMode = this._customSkillsEditMode;

    return context;
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
   * Packs skill groups into columns without splitting a group across columns.
   * Respects the world "Sort Skills By Column" setting (same as core skills).
   *
   * @param {object[]} groups - Skill groups with skills and rowCount (sorted A–Z).
   * @param {number} numCols - Number of columns.
   * @returns {object[][]} Column arrays of render blocks.
   */
  _packSkillGroupsIntoColumns(groups, numCols) {
    const sortByColumn = game.settings.get("deltagreen", "sortSkills");
    if (sortByColumn) {
      return this._packSkillGroupsByColumn(groups, numCols);
    }
    return this._packSkillGroupsByRow(groups, numCols);
  }

  /**
   * @param {object} column
   * @param {object} group
   * @returns {void}
   */
  _appendSkillGroupToColumn(column, group) {
    column.blocks.push({
      type: "groupHeader",
      group: group.group,
      label: group.label,
      ...(group.isSpecialTraining ? { isSpecialTraining: true } : {}),
    });

    const skillType = group.isSpecialTraining ? "training" : "typedSkill";
    for (const skill of group.skills) {
      column.blocks.push({ ...skill, type: skillType });
    }

    column.height += group.rowCount;
  }

  /**
   * Column-first packing (read down each column, then the next).
   *
   * @param {object[]} groups
   * @param {number} numCols
   * @returns {object[][]}
   */
  _packSkillGroupsByColumn(groups, numCols) {
    const columns = Array.from({ length: numCols }, () => ({
      blocks: [],
      height: 0,
    }));

    if (groups.length === 0) {
      return columns.map((col) => col.blocks);
    }

    const totalHeight = groups.reduce((sum, group) => sum + group.rowCount, 0);
    const targetHeight = totalHeight / numCols;
    let colIndex = 0;

    for (const group of groups) {
      const col = columns[colIndex];

      if (
        colIndex < numCols - 1 &&
        col.blocks.length > 0 &&
        col.height + group.rowCount > targetHeight
      ) {
        colIndex += 1;
      }

      this._appendSkillGroupToColumn(columns[colIndex], group);
    }

    return columns.map((col) => col.blocks);
  }

  /**
   * Row-first packing (groups round-robin across columns, like core skill row sort).
   *
   * @param {object[]} groups
   * @param {number} numCols
   * @returns {object[][]}
   */
  _packSkillGroupsByRow(groups, numCols) {
    const columns = Array.from({ length: numCols }, () => ({
      blocks: [],
      height: 0,
    }));

    for (let i = 0; i < groups.length; i++) {
      this._appendSkillGroupToColumn(columns[i % numCols], groups[i]);
    }

    return columns.map((col) => col.blocks);
  }

  /**
   * Builds grouped typed-skill columns for the V2 skills tab.
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

    return this._packSkillGroupsIntoColumns(groups, 3);
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
}
