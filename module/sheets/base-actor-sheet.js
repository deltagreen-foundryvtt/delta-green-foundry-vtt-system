import DG from "../config.js";
import {
  DGDamageRoll,
  DGLethalityRoll,
  DGPercentileRoll,
  DGSanityDamageRoll,
} from "../roll/roll.js";
import DGSheetMixin from "./base-sheet.js";

const { ActorSheetV2 } = foundry.applications.sheets;

export default class DGActorSheet extends DGSheetMixin(ActorSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = /** @type {const} */ ({
    position: { width: 750, height: 770 },
    actions: {
      // Skill/Item actions.
      itemAction: this._onItemAction,
      typedSkillAction: this._onTypedSkillAction,
      specialTrainingAction: this._onSpecialTrainingAction,
      roll: this._onRoll,
      rollLuck: this._onRollLuck,
      // Toggles/resets.
      toggleEquipped: this._toggleEquipped,
      toggleItemSortMode: this._toggleItemSortMode,
      toggleShowUntrained: this._toggleShowUntrained,
      toggleLethality: this._toggleLethality,
      // Other actions.
      browsePack: this._browsePack,
    },
  });

  /** @override - Singular reference to the actor templates path */
  static TEMPLATE_PATH = /** @type {const} */ (`${super.TEMPLATE_PATH}/actor`);

  /** Holds base/shared parts of sheets for subclasses to reference. */
  static BASE_PARTS = /** @type {const} */ ({
    header: {
      template: `${this.TEMPLATE_PATH}/parts/header.html`,
    },
    tabs: {
      template: `templates/generic/tab-navigation.hbs`, // From FoundryVTT
    },
    skills: {
      template: `${this.TEMPLATE_PATH}/parts/skills-tab.html`,
      templates: [`${this.TEMPLATE_PATH}/partials/custom-skills-partial.html`],
      scrollable: [""],
    },
    gear: {
      template: `${this.TEMPLATE_PATH}/parts/gear-tab.html`,
      scrollable: [""],
    },
    about: {
      template: `${this.TEMPLATE_PATH}/parts/about-tab.html`,
      scrollable: [""],
    },
  });

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Prepare items.
    this._prepareCharacterItems(context);

    context.showHyperGeometrySection = this.shouldShowHyperGeometrySection(
      this.actor,
    );

    // Early return if this is a vehicle.
    if (this.actor.type === "vehicle") return context;

    // Make it easy for the sheet handlebars to understand how to sort the skills.
    context.sortSkillsSetting = game.settings.get("deltagreen", "sortSkills");

    // fill an array that is sorted based on the appropriate localized entry
    const sortedSkills = [];
    for (const [key, skill] of Object.entries(this.actor.system.skills)) {
      skill.key = key;

      if (game.i18n.lang === "ja") {
        skill.sortLabel = game.i18n.localize(`DG.Skills.ruby.${key}`);
      } else {
        skill.sortLabel = game.i18n.localize(`DG.Skills.${key}`);
      }

      if (skill.sortLabel === "" || skill.sortLabel === `DG.Skills.${key}`) {
        skill.sortLabel = skill.key;
      }

      // if the actor is an NPC or Unnatural, and they have 'hide untrained skills' active,
      // it will break the sorting logic, so we have to skip over these
      if (
        !(
          (this.actor.type === "npc" || this.actor.type === "unnatural") &&
          this.actor.system.showUntrainedSkills &&
          skill.proficiency < 1
        )
      ) {
        sortedSkills.push(skill);
      }
    }

    sortedSkills.sort((a, b) => {
      return a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang);
    });

    // if sorting by columns, re-arrange the array to be columns first, then rows
    if (game.settings.get("deltagreen", "sortSkills")) {
      const columnSortedSkills = this.reorderForColumnSorting(sortedSkills, 3);

      this.actor.system.sortedSkills = columnSortedSkills;
    } else {
      this.actor.system.sortedSkills = sortedSkills;
    }

    // Prepare a simplified version of the special training for display on sheet.
    const specialTraining = this.actor.system.specialTraining.map(
      (training) => {
        const simplifiedTraining = {
          name: training.name,
          id: training.id,
          key: training.attribute,
        };
        // Convert the machine-readable name to a human-readable one.
        switch (true) {
          // Stats
          case DG.statistics.includes(training.attribute):
            simplifiedTraining.attribute = `${training.attribute.toUpperCase()}x5`;
            simplifiedTraining.targetNumber =
              this.actor.system.statistics[training.attribute].x5;
            break;
          // Skills
          case DG.skills.includes(training.attribute):
            simplifiedTraining.attribute =
              this.actor.system.skills[training.attribute].label;
            simplifiedTraining.targetNumber =
              this.actor.system.skills[training.attribute].proficiency;
            break;
          // Typed Skills
          default:
            simplifiedTraining.attribute =
              this.actor.system.typedSkills[training.attribute].label;
            simplifiedTraining.targetNumber =
              this.actor.system.typedSkills[training.attribute].proficiency;
            break;
        }
        return simplifiedTraining;
      },
    );
    context.specialTraining = specialTraining;

    // try to make a combined array of both typed skills and special trainings,
    // so that it can be sorted together neatly on the sheet
    const sortedCustomSkills = [];

    for (const [key, skill] of Object.entries(this.actor.system.typedSkills)) {
      skill.type = "typeSkill";
      skill.key = key;
      skill.sortLabel = `${skill.group}.${skill.label}`;
      skill.sortLabel = skill.sortLabel.toUpperCase();
      skill.actorType = this.actor.type;

      if (skill.sortLabel === "" || skill.sortLabel === `DG.Skills.${key}`) {
        skill.sortLabel = skill.key;
      }

      sortedCustomSkills.push(skill);
    }

    for (let i = 0; i < context.specialTraining.length; i++) {
      const training = context.specialTraining[i];

      training.type = "training";
      training.sortLabel = training.name.toUpperCase();
      training.actorType = this.actor.type;

      sortedCustomSkills.push(training);
    }

    sortedCustomSkills.sort(function (a, b) {
      return a.sortLabel.localeCompare(b.sortLabel, game.i18n.lang);
    });

    if (game.settings.get("deltagreen", "sortSkills")) {
      const columnSortedSkills = this.reorderForColumnSorting(
        sortedCustomSkills,
        2,
      );

      this.actor.system.sortedCustomSkills = columnSortedSkills;
    } else {
      this.actor.system.sortedCustomSkills = sortedCustomSkills;
    }

    // Set sanity block per actor type.
    context.sanityInputs = await foundry.applications.handlebars.renderTemplate(
      `${DGActorSheet.TEMPLATE_PATH}/partials/sanity-${this.actor.type}.html`,
      context,
    );

    // Set title for Physical Attributes.
    context.physicalAttributesTitle = game.i18n.localize(
      "DG.Sheet.BlockHeaders.Attributes",
    );

    return context;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    const { element } = this;

    this._setRightClickListeners();

    if (this.actor.isOwner) {
      const handler = (ev) => this._onDragStart(ev);
      element.querySelectorAll("li.item").forEach((li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /** @override - Add buttons to the header controls. */
  _getHeaderControls() {
    const controls = super._getHeaderControls();
    controls.push({
      action: "rollLuck",
      label: "DG.RollLuck",
      icon: "fas fa-dice",
    });
    return controls;
  }

  /** @override */
  _onDragStart(event) {
    // Most of this is the standard Foundry implementation of _onDragStart
    const li = event.currentTarget;
    if (event.target.classList.contains("content-link")) return;

    // Create drag data
    let dragData;

    // Owned Items
    if (li.dataset.itemId) {
      const item = this.actor.items.get(li.dataset.itemId);
      dragData = item.toDragData();
    }

    // Active Effect
    if (li.dataset.effectId) {
      const effect = this.actor.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    if (!dragData) return;

    // this is custom, grab item data for creating item macros on the hotbar
    if (li.dataset.itemId) {
      const item = this.actor.items.get(li.dataset.itemId);
      dragData.itemData = item;
    }

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /** @override */
  async _onDrop(event) {
    super._onDrop(event);
    // If alt key is held down, we will delete the original document.
    if (event.altKey) {
      // This is from Foundry. It will get the item data from the event.
      const TextEditor = foundry.applications.ux.TextEditor.implementation;
      const dragData = TextEditor.getDragEventData(event);
      // Make sure that we are dragging an item, otherwise this doesn't make sense.
      if (dragData.type === "Item") {
        const item = fromUuidSync(dragData.uuid);
        await item.delete();
      }
    }
  }

  /** @override */
  activateEditor(target, editorOptions, initialContent) {
    editorOptions.content_css = "./systems/deltagreen/css/editor.css";
    return super.activateEditor(target, editorOptions, initialContent);
  }

  /**
   * Listens for right click events on the actor sheet and executes a regular roll,
   * or luck roll, depending on the action.
   *
   * @returns {void}
   */
  _setRightClickListeners() {
    const { element } = this;
    element.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const target = event.target.closest(
        "[data-action='roll'],[data-action='rollLuck']",
      );
      if (!target) return;

      // Call _onRollLuck if luckRoll is the dispatched action.
      if (target.dataset.action === "rollLuck") {
        DGActorSheet._onRollLuck.call(this, event, target);
        return;
      }

      // Otherwise, call _onRoll function.
      DGActorSheet._onRoll.call(this, event, target);
    });
  }

  // some handlers may wish to avoid leading players to think they should be seeking out magic
  // so control whether an actor sheet shows the hypergeometry (rituals and tomes) section
  shouldShowHyperGeometrySection(actor) {
    // always show for GM
    if (game.user.isGM) {
      return true;
    }

    // check system setting to see if it should always be shown
    if (
      game.settings.get(
        "deltagreen",
        "alwaysShowHypergeometrySectionForPlayers",
      )
    ) {
      return true;
    }

    // otherwise only show if an actor has an item of that type added to their sheet.
    for (const i of actor.items) {
      if (i.type === "tome" || i.type === "ritual") {
        return true;
      }
    }

    return false;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems() {
    const { actor } = this;

    // Initialize containers.
    const armor = [];
    const weapons = [];
    const gear = [];
    const tomes = [];
    const rituals = [];

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (const i of actor.items) {
      // Append to armor.
      if (i.type === "armor") {
        armor.push(i);
      }
      // Append to weapons.
      else if (i.type === "weapon") {
        weapons.push(i);
      } else if (i.type === "gear") {
        gear.push(i);
      } else if (i.type === "tome") {
        tomes.push(i);
      } else if (i.type === "ritual") {
        rituals.push(i);
      }
    }

    if (actor.system.settings.sorting.armorSortAlphabetical) {
      armor.sort((a, b) => {
        const x = a.name.toLowerCase();
        const y = b.name.toLowerCase();
        if (x < y) {
          return -1;
        }
        if (x > y) {
          return 1;
        }
        return 0;
      });
    } else {
      armor.sort((a, b) => {
        return a.sort - b.sort;
      });
    }

    if (actor.system.settings.sorting.weaponSortAlphabetical) {
      weapons.sort((a, b) => {
        const x = a.name.toLowerCase();
        const y = b.name.toLowerCase();
        if (x < y) {
          return -1;
        }
        if (x > y) {
          return 1;
        }
        return 0;
      });
    } else {
      weapons.sort((a, b) => {
        return a.sort - b.sort;
      });
    }

    if (actor.system.settings.sorting.gearSortAlphabetical) {
      gear.sort((a, b) => {
        const x = a.name.toLowerCase();
        const y = b.name.toLowerCase();
        if (x < y) {
          return -1;
        }
        if (x > y) {
          return 1;
        }
        return 0;
      });
    } else {
      gear.sort((a, b) => {
        return a.sort - b.sort;
      });
    }

    if (actor.system.settings.sorting.tomeSortAlphabetical) {
      tomes.sort((a, b) => {
        const x = a.name.toLowerCase();
        const y = b.name.toLowerCase();
        if (x < y) {
          return -1;
        }
        if (x > y) {
          return 1;
        }
        return 0;
      });
    } else {
      tomes.sort((a, b) => {
        return a.sort - b.sort;
      });
    }

    if (actor.system.settings.sorting.ritualSortAlphabetical) {
      rituals.sort((a, b) => {
        const x = a.name.toLowerCase();
        const y = b.name.toLowerCase();
        if (x < y) {
          return -1;
        }
        if (x > y) {
          return 1;
        }
        return 0;
      });
    } else {
      rituals.sort((a, b) => {
        return a.sort - b.sort;
      });
    }

    // Assign and return
    actor.armor = armor;
    actor.weapons = weapons;
    actor.gear = gear;
    actor.rituals = rituals;
    actor.tomes = tomes;
  }

  reorderForColumnSorting(arr, numCols) {
    const numRows = Math.ceil(arr.length / numCols); // Compute required rows
    const reordered = new Array(arr.length);

    // Determine how many elements each column gets
    const baseRowCount = Math.floor(arr.length / numCols); // Minimum rows per column
    const extraColumns = arr.length % numCols; // Some columns get an extra row

    const colHeights = new Array(numCols).fill(baseRowCount);
    for (let i = 0; i < extraColumns; i++) {
      colHeights[i] += 1; // Give extra elements to the first N columns
    }

    let index = 0; // move through alphabetical array, keeping track of what we've resorted already

    for (let col = 0; col < numCols; col++) {
      // need to check if this is a column that has more rows than the others or not
      const rowCount = colHeights[col];

      // loop down the column, filling out it's values from the alphabetical array
      for (let row = 0; row < rowCount; row++) {
        // calculate the new position for this value by column
        const newIndex = numCols * row + col;

        if (newIndex < arr.length) {
          reordered[newIndex] = arr[index];
          index += 1;
        }
      }
    }

    return reordered;
  }

  static _onItemAction(event, target) {
    const li = target.closest(".item");
    const { itemId } = li.dataset;
    const { actionType, itemType } = target.dataset;

    switch (actionType) {
      case "create":
        this._onItemCreate(itemType);
        break;
      case "edit": {
        const item = this.actor.items.get(itemId);
        item.sheet.render(true);
        break;
      }
      case "delete": {
        this.actor.deleteEmbeddedDocuments("Item", [itemId]);
        break;
      }
      default:
        break;
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {String} type   The originating click event
   * @private
   */
  _onItemCreate(type) {
    // Initialize a default name.
    const name = game.i18n.format(
      game.i18n.translations.DOCUMENT?.New || "DG.FallbackText.newItem",
      {
        type: game.i18n.localize(`TYPES.Item.${type}`),
      },
    );

    // Prepare the item object.
    const itemData = {
      name,
      type,
      system: {},
    };

    if (type === "weapon") {
      // itemData.system.skill = "firearms"; //default skill to firearms, since that will be most common
      // itemData.system.expense = "Standard";
    } else if (type === "armor") {
      // itemData.system.armor = 3;
      // itemData.system.expense = "Standard";
    } else if (type === "bond") {
      // try to default bonds for an agent to their current CHA
      itemData.system.score = this.actor.system.statistics.cha.value; // Can vary, but at character creation starting bond score is usually agent's charisma
      // itemData.img = "icons/svg/mystery-man.svg"
    }

    // create the item
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  static _onTypedSkillAction(event, target) {
    const { actionType, typedskill } = target.dataset;
    switch (actionType) {
      case "create":
        this._showNewTypeSkillDialog();
        break;
      case "edit":
        this._showNewEditTypeSkillDialog(typedskill);
        break;
      case "delete":
        this.actor.update({ [`system.typedSkills.-=${typedskill}`]: null });
        break;
      default:
        break;
    }
  }

  _showNewEditTypeSkillDialog(targetSkill) {
    // TO DO: BUILD DIALOG TO CAPTURE UPDATED DATA

    const { typedSkills } = this.actor.system;
    const currentLabel = typedSkills[targetSkill].label;
    const currentGroup = typedSkills[targetSkill].group;

    let htmlContent = `<div>`;
    htmlContent += `     <label>${
      game.i18n.translations.DG?.Skills?.SkillGroup ?? "Skill Group"
    }:</label>`;
    htmlContent += `     <select name="new-type-skill-group" />`;

    if (currentGroup === game.i18n.translations.DG?.TypeSkills?.Art ?? "Art") {
      htmlContent += `          <option value="Art" selected>${
        game.i18n.translations.DG?.TypeSkills?.Art ?? "Art"
      }</option>`;
    } else {
      htmlContent += `          <option value="Art">${
        game.i18n.translations.DG?.TypeSkills?.Art ?? "Art"
      }</option>`;
    }

    if (
      currentGroup === game.i18n.translations.DG?.TypeSkills?.Craft ??
      "Craft"
    ) {
      htmlContent += `          <option value="Craft" selected>${
        game.i18n.translations.DG?.TypeSkills?.Craft ?? "Craft"
      }</option>`;
    } else {
      htmlContent += `          <option value="Craft">${
        game.i18n.translations.DG?.TypeSkills?.Craft ?? "Craft"
      }</option>`;
    }

    if (
      currentGroup === game.i18n.translations.DG?.TypeSkills?.ForeignLanguage ??
      "Foreign Language"
    ) {
      htmlContent += `          <option value="ForeignLanguage" selected>${
        game.i18n.translations.DG?.TypeSkills?.ForeignLanguage ??
        "Foreign Language"
      }</option>`;
    } else {
      htmlContent += `          <option value="ForeignLanguage">${
        game.i18n.translations.DG?.TypeSkills?.ForeignLanguage ??
        "Foreign Language"
      }</option>`;
    }

    if (
      currentGroup === game.i18n.translations.DG?.TypeSkills?.MilitaryScience ??
      "Military Science"
    ) {
      htmlContent += `          <option value="MilitaryScience" selected>${
        game.i18n.translations.DG?.TypeSkills?.MilitaryScience ??
        "Military Science"
      }</option>`;
    } else {
      htmlContent += `          <option value="MilitaryScience">${
        game.i18n.translations.DG?.TypeSkills?.MilitaryScience ??
        "Military Science"
      }</option>`;
    }

    if (
      currentGroup === game.i18n.translations.DG?.TypeSkills?.Pilot ??
      "Pilot"
    ) {
      htmlContent += `          <option value="Pilot" selected>${
        game.i18n.translations.DG?.TypeSkills?.Pilot ?? "Pilot"
      }</option>`;
    } else {
      htmlContent += `          <option value="Pilot">${
        game.i18n.translations.DG?.TypeSkills?.Pilot ?? "Pilot"
      }</option>`;
    }

    if (
      currentGroup === game.i18n.translations.DG?.TypeSkills?.Science ??
      "Science"
    ) {
      htmlContent += `          <option value="Science" selected>${
        game.i18n.translations.DG?.TypeSkills?.Science ?? "Science"
      }</option>`;
    } else {
      htmlContent += `          <option value="Science">${
        game.i18n.translations.DG?.TypeSkills?.Science ?? "Science"
      }</option>`;
    }

    if (
      currentGroup === game.i18n.translations.DG?.TypeSkills?.Other ??
      "Other"
    ) {
      htmlContent += `          <option value="Other" selected>${
        game.i18n.translations.DG?.TypeSkills?.Other ?? "Other"
      }</option>`;
    } else {
      htmlContent += `          <option value="Other">${
        game.i18n.translations.DG?.TypeSkills?.Other ?? "Other"
      }</option>`;
    }

    htmlContent += `     </select>`;
    htmlContent += `</div>`;

    htmlContent += `<div>`;
    htmlContent += `     <label>${
      game.i18n.translations.DG?.Skills.SkillName ?? "Skill Name"
    }</label>`;
    htmlContent += `     <input type="text" name="new-type-skill-label" value="${currentLabel}" />`;
    htmlContent += `</div>`;

    new Dialog({
      content: htmlContent,
      title:
        game.i18n.translations.DG?.Skills?.EditTypedOrCustomSkill ??
        "Edit Typed or Custom Skill",
      default: "add",
      buttons: {
        add: {
          label: game.i18n.translations.DG?.Skills?.EditSkill ?? "Edit Skill",
          callback: (btn) => {
            const newTypeSkillLabel = btn
              .find("[name='new-type-skill-label']")
              .val();
            const newTypeSkillGroup = btn
              .find("[name='new-type-skill-group']")
              .val();
            this._updateTypedSkill(
              targetSkill,
              newTypeSkillLabel,
              newTypeSkillGroup,
            );
          },
        },
      },
    }).render(true);
  }

  _showNewTypeSkillDialog() {
    let htmlContent = "";

    htmlContent += `<div>`;
    htmlContent += `     <label>${
      game.i18n.translations.DG?.Skills?.SkillGroup ?? "Skill Group"
    }:</label>`;
    htmlContent += `     <select name="new-type-skill-group" />`;
    htmlContent += `          <option value="Art">${
      game.i18n.translations.DG?.TypeSkills?.Art ?? "Art"
    }</option>`;
    htmlContent += `          <option value="Craft">${
      game.i18n.translations.DG?.TypeSkills?.Craft ?? "Craft"
    }</option>`;
    htmlContent += `          <option value="ForeignLanguage">${
      game.i18n.translations.DG?.TypeSkills?.ForeignLanguage ??
      "Foreign Language"
    }</option>`;
    htmlContent += `          <option value="MilitaryScience">${
      game.i18n.translations.DG?.TypeSkills?.MilitaryScience ??
      "Military Science"
    }</option>`;
    htmlContent += `          <option value="Pilot">${
      game.i18n.translations.DG?.TypeSkills?.Pilot ?? "Pilot"
    }</option>`;
    htmlContent += `          <option value="Science">${
      game.i18n.translations.DG?.TypeSkills?.Science ?? "Science"
    }</option>`;
    htmlContent += `          <option value="Other">${
      game.i18n.translations.DG?.TypeSkills?.Other ?? "Other"
    }</option>`;
    htmlContent += `     </select>`;
    htmlContent += `</div>`;

    htmlContent += `<div>`;
    htmlContent += `     <label>${
      game.i18n.translations.DG?.Skills.SkillName ?? "Skill Name"
    }</label>`;
    htmlContent += `     <input type="text" name="new-type-skill-label" />`;
    htmlContent += `</div>`;

    new Dialog({
      content: htmlContent,
      title:
        game.i18n.translations.DG?.Skills?.AddTypedOrCustomSkill ??
        "Add Typed or Custom Skill",
      default: "add",
      buttons: {
        add: {
          label: game.i18n.translations.DG?.Skills?.AddSkill ?? "Add Skill",
          callback: (btn) => {
            const newTypeSkillLabel = btn
              .find("[name='new-type-skill-label']")
              .val();
            const newTypeSkillGroup = btn
              .find("[name='new-type-skill-group']")
              .val();
            this._addNewTypedSkill(newTypeSkillLabel, newTypeSkillGroup);
          },
        },
      },
    }).render(true);
  }

  _addNewTypedSkill(newSkillLabel, newSkillGroup) {
    const updatedData = foundry.utils.duplicate(this.actor.system);
    const { typedSkills } = updatedData;

    const d = new Date();

    const newSkillPropertyName =
      d.getFullYear().toString() +
      (d.getMonth() + 1).toString() +
      d.getDate().toString() +
      d.getHours().toString() +
      d.getMinutes().toString() +
      d.getSeconds().toString();
    // console.log(newSkillPropertyName);
    typedSkills[newSkillPropertyName] = {
      label: newSkillLabel,
      group: newSkillGroup,
      proficiency: 10,
      failure: false,
    };

    updatedData.typedSkills = typedSkills;

    this.actor.update({ system: updatedData });
  }

  _updateTypedSkill(targetSkill, newSkillLabel, newSkillGroup) {
    if (
      newSkillLabel !== null &&
      newSkillLabel !== "" &&
      newSkillGroup !== null &&
      newSkillGroup !== ""
    ) {
      const updatedData = foundry.utils.duplicate(this.actor.system);

      updatedData.typedSkills[targetSkill].label = newSkillLabel;
      updatedData.typedSkills[targetSkill].group = newSkillGroup;

      this.actor.update({ system: updatedData });
    }
  }

  static _onSpecialTrainingAction(event, target) {
    const { actionType, id } = target.dataset;
    switch (actionType) {
      case "delete":
        {
          const specialTrainingArray = foundry.utils.duplicate(
            this.actor.system.specialTraining,
          );

          // Get the index of the training to be deleted
          const index = specialTrainingArray.findIndex(
            (training) => training.id === id,
          );

          specialTrainingArray.splice(index, 1);
          this.actor.update({ "system.specialTraining": specialTrainingArray });
        }
        break;
      default:
        this._showSpecialTrainingDialog(actionType, id);
        break;
    }
  }

  async _showSpecialTrainingDialog(action, targetID) {
    const specialTraining = this.actor.system.specialTraining.find(
      (training) => training.id === targetID,
    );

    // Define the option groups for our drop-down menu.
    const optionGroups = {
      stats: game.i18n.localize(
        "DG.SpecialTraining.Dialog.DropDown.Statistics",
      ),
      skills: game.i18n.localize("DG.SpecialTraining.Dialog.DropDown.Skills"),
      typedSkills: game.i18n.localize(
        "DG.SpecialTraining.Dialog.DropDown.CustomSkills",
      ),
    };

    // Prepare simplified stat list
    const statList = Object.entries(this.actor.system.statistics).map(
      ([key, stat]) => ({
        value: key,
        group: optionGroups.stats,
        label: game.i18n.localize(`DG.Attributes.${key}`),
        targetNumber: stat.value * 5,
      }),
    );

    // Prepare simplified skill list
    const skillList = Object.entries(this.actor.system.skills).map(
      ([key, skill]) => ({
        value: key,
        group: optionGroups.skills,
        label: game.i18n.localize(`DG.Skills.${key}`),
        targetNumber: skill.proficiency,
      }),
    );

    // Prepare simplified typed/custom skill list
    const typedSkillList = Object.entries(this.actor.system.typedSkills).map(
      ([key, skill]) => ({
        value: key,
        group: optionGroups.typedSkills,
        label: `${game.i18n.localize(`DG.TypeSkills.${skill.group}`)} (${
          skill.label
        })`,
        targetNumber: skill.proficiency,
      }),
    );

    // Prepare the Select element
    const selectElement = foundry.applications.fields.createSelectInput({
      name: "special-training-skill",
      options: [...statList, ...skillList, ...typedSkillList],
      groups: Object.values(optionGroups),
    }).outerHTML;

    // Prepare the template to feed to Dialog.
    const { renderTemplate } = foundry.applications.handlebars;
    const content = await renderTemplate(
      "systems/deltagreen/templates/dialog/special-training.html",
      {
        name: specialTraining?.name || "",
        selectElement,
        currentAttribute: specialTraining?.attribute || "",
        statList,
        skillList,
        typedSkillList,
      },
    );

    const buttonLabel = game.i18n.localize(
      `DG.SpecialTraining.Dialog.${action.capitalize()}SpecialTraining`,
    );

    // Prepare and render dialog with above template.
    new Dialog({
      content,
      title: game.i18n.localize("DG.SpecialTraining.Dialog.Title"),
      default: "confirm",
      buttons: {
        confirm: {
          label: buttonLabel,
          callback: (btn) => {
            const specialTrainingLabel = btn
              .find("[name='special-training-label']")
              .val();
            const specialTrainingAttribute = btn
              .find("[name='special-training-skill']")
              .val();
            if (action === "create")
              this._createSpecialTraining(
                specialTrainingLabel,
                specialTrainingAttribute,
              );
            if (action === "edit")
              this._editSpecialTraining(
                specialTrainingLabel,
                specialTrainingAttribute,
                targetID,
              );
          },
        },
      },
    }).render(true);
  }

  _createSpecialTraining(label, attribute) {
    const specialTrainingArray = foundry.utils.duplicate(
      this.actor.system.specialTraining,
    );
    specialTrainingArray.push({
      name: label,
      attribute,
      id: foundry.utils.randomID(),
    });
    this.actor.update({ "system.specialTraining": specialTrainingArray });
  }

  _editSpecialTraining(label, attribute, id) {
    const specialTrainingArray = foundry.utils.duplicate(
      this.actor.system.specialTraining,
    );
    const specialTraining = specialTrainingArray.find(
      (training) => training.id === id,
    );
    specialTraining.name = label;
    specialTraining.attribute = attribute;
    this.actor.update({ "system.specialTraining": specialTrainingArray });
  }

  /**
   * Handle clickable rolls.
   *
   * @param {Event} event   The originating click event
   * @async
   * @private
   */
  static async _onRoll(event, target) {
    if (target.classList.contains("not-rollable") || event.which === 2) return;

    const { dataset } = target;
    const item = this.actor.items.get(dataset.iid);
    const rollOptions = {
      rollType: dataset.rolltype,
      key: dataset.key,
      actor: this.actor,
      specialTrainingName: dataset?.name || null, // Only applies to Special Training Rolls
      item,
    };

    // Create a default 1d100 roll just in case.
    let roll = new Roll("1d100", {});
    switch (dataset.rolltype) {
      case "stat":
      case "skill":
      case "sanity":
      case "special-training":
      case "weapon":
        roll = new DGPercentileRoll("1D100", {}, rollOptions);
        break;
      case "lethality":
        roll = new DGLethalityRoll("1D100", {}, rollOptions);
        break;
      case "damage": {
        let diceFormula = item.system.damage;
        const { skill } = item.system;
        if (
          this.actor.type === "agent" &&
          (skill === "unarmed_combat" || skill === "melee_weapons")
        ) {
          diceFormula +=
            this.actor.system.statistics.str.meleeDamageBonusFormula;
        }
        roll = new DGDamageRoll(diceFormula, {}, rollOptions);
        break;
      }
      case "sanity-damage": {
        const { successLoss, failedLoss } = this.actor.system.sanity;
        const combinedFormula = `{${successLoss}, ${failedLoss}}`;
        roll = new DGSanityDamageRoll(combinedFormula, {}, rollOptions);
        break;
      }
      default:
        break;
    }
    this.processRoll(event, roll, rollOptions);
  }

  // This only exists to give a chance to activate the modifier dialogue if desired
  // Cannot seem to trigger the event on a right-click, so unfortunately only applies to a shift-click currently.
  static async _onRollLuck(event) {
    // probably don't want rolls to trigger from a middle mouse click so just kill it here
    if (event.which === 2) return;

    const rollOptions = {
      rollType: "luck",
      key: "luck",
      actor: this.actor,
    };

    // Create a default 1d100 roll just in case.
    const roll = new DGPercentileRoll("1D100", {}, rollOptions);
    // Open dialog if user requests it.
    if (event.shiftKey || event.which === 3) {
      const dialogData = await roll.showDialog();
      if (!dialogData) return;
      roll.modifier += dialogData.targetModifier;
      roll.options.rollMode = dialogData.rollMode;
    }
    // Evaluate the roll.
    await roll.evaluate();
    // Send the roll to chat.
    roll.toChat();
  }

  /**
   * Show a dialog for the roll and then send to chat.
   * Broke this logic out from `_onRoll()` so that other files can call it,
   * namely the macro logic.
   *
   * TODO: Move this logic to the roll.js.
   *
   * @param {Event} event   The originating click event
   * @param {Event} roll   The roll to show a dialog for and then send to chat.
   * @async
   */
  async processRoll(event, roll) {
    // Open dialog if user requests it (no dialog for Sanity Damage rolls)
    if (
      (event.shiftKey || event.which === 3) &&
      !(roll instanceof DGSanityDamageRoll)
    ) {
      const dialogData = await roll.showDialog();
      if (!dialogData) return;
      if (dialogData.newFormula) {
        roll = new DGDamageRoll(dialogData.newFormula, {}, roll.options);
      }
      roll.modifier += dialogData.targetModifier;
      roll.options.rollMode = dialogData.rollMode;
    }
    // Evaluate the roll.
    await roll.evaluate();
    // Send the roll to chat.
    roll.toChat();
  }

  static _toggleItemSortMode(event, target) {
    const itemType = target.dataset.gearType;
    const propString = `${itemType}SortAlphabetical`;
    const targetProp = `system.settings.sorting.${propString}`;
    const currentValue = foundry.utils.getProperty(this.actor, targetProp);
    this.actor.update({
      [targetProp]: !currentValue,
    });
  }

  static _toggleShowUntrained() {
    const targetProp = "system.showUntrainedSkills";
    const currentVal = foundry.utils.getProperty(this.actor, targetProp);
    this.actor.update({ [targetProp]: !currentVal });
  }

  static _toggleLethality(event, target) {
    const { itemId } = target.dataset;
    const isLethal = target.dataset.isLethal?.length === 0;
    const item = this.actor.items.get(itemId);
    item.update({ "system.isLethal": !isLethal });
  }

  static _toggleEquipped(event, target) {
    event.preventDefault();
    const { id } = target.dataset;
    const item = this.actor.items.get(id);

    const targetProp = "system.equipped";
    const currentVal = foundry.utils.getProperty(item, targetProp);
    item.update({ [targetProp]: !currentVal });
  }

  static _browsePack(event, target) {
    const { packType } = target.dataset;
    switch (packType) {
      case "weapon": {
        new Dialog({
          title: "Select Compendium",
          buttons: {
            firearms: {
              icon: '<i class="fas fa-crosshairs"></i>',
              callback: () =>
                game.packs
                  .find((k) => k.collection === "deltagreen.firearms")
                  .render(true),
            },
            melee: {
              icon: '<i class="far fa-hand-rock"></i>',
              callback: () =>
                game.packs
                  .find(
                    (k) => k.collection === "deltagreen.hand-to-hand-weapons",
                  )
                  .render(true),
            },
          },
        }).render(true);
        break;
      }
      default:
        game.packs
          .find((k) => k.collection === `deltagreen.${packType}`)
          .render(true);
        break;
    }
  }
}
