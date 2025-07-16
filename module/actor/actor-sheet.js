import DG from "../config.js";
import DGSheetMixin from "../base-sheet.js";
import {
  DGPercentileRoll,
  DGLethalityRoll,
  DGDamageRoll,
  DGSanityDamageRoll,
} from "../roll/roll.js";

const { ActorSheetV2 } = foundry.applications.sheets;

/** @extends {DGSheetMixin(ActorSheetV2)} */
export default class DeltaGreenActorSheet extends DGSheetMixin(ActorSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = /** @type {const} */ ({
    css: ["actor"],
    position: { width: 750, height: 770 },
    actions: {
      // Skill/Item actions.
      itemAction: DeltaGreenActorSheet._onItemAction,
      typedSkillAction: DeltaGreenActorSheet._onTypedSkillAction,
      specialTrainingAction: DeltaGreenActorSheet._onSpecialTrainingAction,
      roll: DeltaGreenActorSheet._onRoll,
      // Toggles/resets.
      clearBondDamage: DeltaGreenActorSheet._clearBondDamage,
      toggleBondDamage: DeltaGreenActorSheet._toggleBondDamage,
      toggleEquipped: DeltaGreenActorSheet._toggleEquipped,
      toggleItemSortMode: DeltaGreenActorSheet._toggleItemSortMode,
      toggleShowUntrained: DeltaGreenActorSheet._toggleShowUntrained,
      toggleLethality: DeltaGreenActorSheet._toggleLethality,
      resetBreakingPoint: DeltaGreenActorSheet._resetBreakingPoint,
      // Other actions.
      applySkillImprovements: DeltaGreenActorSheet._applySkillImprovements,
      browsePack: DeltaGreenActorSheet._browsePack,
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
      template: `${this.TEMPLATE_PATH}/actor/parts/header.html`,
    },
    tabs: {
      template: `templates/generic/tab-navigation.hbs`, // From FoundryVTT
    },
    skills: {
      template: `${this.TEMPLATE_PATH}/actor/parts/skills-tab.html`,
      templates: [
        `${this.TEMPLATE_PATH}/actor/partials/custom-skills-partial.html`,
      ],
      scrollable: [""],
    },
    physical: {
      template: `${this.TEMPLATE_PATH}/actor/parts/physical-tab.html`,
      templates: [
        `${this.TEMPLATE_PATH}/actor/partials/attributes-grid-partial.html`,
      ],
      scrollable: [""],
    },
    motivations: {
      template: `${this.TEMPLATE_PATH}/actor/parts/motivations-tab.html`,
    },
    gear: {
      template: `${this.TEMPLATE_PATH}/actor/parts/gear-tab.html`,
      scrollable: [""],
    },
    bio: {
      template: `${this.TEMPLATE_PATH}/actor/parts/bio-tab.html`,
      templates: [`${this.TEMPLATE_PATH}/actor/partials/cv-partial.html`],
      scrollable: [""],
    },
    bonds: {
      template: `${this.TEMPLATE_PATH}/actor/parts/bonds-tab.html`,
      scrollable: [""],
    },
    about: {
      template: `${this.TEMPLATE_PATH}/actor/parts/about-tab.html`,
      scrollable: [""],
    },
  });

  /* -------------------------------------------- */

  /** @override */
  get template() {
    if (this.actor !== null) {
      if (this.actor.type === "agent") {
        if (!game.user.isGM && this.actor.limited) {
          return "systems/deltagreen/templates/actor/limited-sheet.html";
        }

        return `systems/deltagreen/templates/actor/actor-sheet.html`;
      }
      if (this.actor.type === "unnatural") {
        return `systems/deltagreen/templates/actor/unnatural-sheet.html`;
      }
      if (this.actor.type === "npc") {
        return `systems/deltagreen/templates/actor/npc-sheet.html`;
      }
      if (this.actor.type === "vehicle") {
        return `systems/deltagreen/templates/actor/vehicle-sheet.html`;
      }

      return "systems/deltagreen/templates/actor/limited-sheet.html";
    }

    return "systems/deltagreen/templates/actor/limited-sheet.html";
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Prepare items.
    this._prepareCharacterItems(context);

    context.showHyperGeometrySection = this.shouldShowHyperGeometrySection(
      this.actor,
    );

    // Make it easy for the sheet handlebars to understand how to sort the skills.
    context.sortSkillsSetting = game.settings.get("deltagreen", "sortSkills");

    if (this.actor.type !== "vehicle") {
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
        const columnSortedSkills = this.reorderForColumnSorting(
          sortedSkills,
          3,
        );

        this.actor.system.sortedSkills = columnSortedSkills;
      } else {
        this.actor.system.sortedSkills = sortedSkills;
      }
    }
    // Prepare a simplified version of the special training for display on sheet.
    if (this.actor.type !== "vehicle") {
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
    }

    // try to make a combined array of both typed skills and special trainings,
    // so that it can be sorted together neatly on the sheet
    if (this.actor.type !== "vehicle") {
      const sortedCustomSkills = [];

      for (const [key, skill] of Object.entries(
        this.actor.system.typedSkills,
      )) {
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
    }

    switch (this.actor.type) {
      case "agent":
        context.enrichedDescription =
          await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            this.actor.system.physicalDescription,
            { async: true },
          );
        break;
      case "vehicle":
        context.enrichedDescription =
          await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            this.actor.system.description,
            { async: true },
          );
        break;
      case "npc":
      case "unnatural":
        context.enrichedDescription =
          await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            this.actor.system.notes,
            { async: true },
          );
        break;
      default:
    }

    return context;
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

  // Can add extra buttons to form header here if necessary
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    let label = "Roll Luck";
    let label2 = "Luck";

    try {
      label = game.i18n.translations.DG.RollLuck;
      label2 = game.i18n.translations.DG.Luck;
    } catch {
      console.error(
        "Missing translation key for either DG.RollLuck or DG.Luck key.",
      );
    }

    buttons = [
      {
        label,
        class: "test-extra-icon",
        icon: "fas fa-dice",
        onclick: (ev) => this.luckRollOnClick(ev, this.actor, label2),
      },
    ].concat(buttons);

    return buttons;
  }

  // This only exists to give a chance to activate the modifier dialogue if desired
  // Cannot seem to trigger the event on a right-click, so unfortunately only applies to a shift-click currently.
  async luckRollOnClick(event) {
    if (event && event.which === 2) {
      // probably don't want rolls to trigger from a middle mouse click so just kill it here
      return;
    }
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

  activeEffectTest(sheet) {
    console.log(sheet.actor.uuid);
    const owner = sheet.actor;

    const effect = ActiveEffect.create(
      {
        label: "Custom Effect",
        tint: "#008000",
        icon: "icons/svg/aura.svg",
        origin: owner.uuid,
        // duration: {"rounds": 1, "seconds": null, "startTime": null, "turns": null, "startRound": null, "startTurn": null},
        disabled: false,
        changes: [
          {
            key: "data.skills.firearms.proficiency", // "data.statistics.str.value", //"data.health.max",
            mode: 2, // 0 = custom, 1 = multiply, 2 = add, 3 = upgrade, 4 = downgrade, 5 = override
            value: -20,
            priority: "20",
          },
        ],
      },
      owner,
    ).create();
  }

  /* -------------------------------------------- */

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

  static _toggleItemSortMode(event, target) {
    const itemType = target.dataset.gearType;
    const propString = `${itemType}SortAlphabetical`;
    const targetProp = `system.settings.sorting.${propString}`;
    const currentValue = foundry.utils.getProperty(this.actor, targetProp);
    this.actor.update({
      [targetProp]: !currentValue,
    });
  }

  static toggleShowUntrained() {
    const targetProp = "system.showUntrainedSkills";
    const currentVal = foundry.utils.getProperty(this.actor, targetProp);
    this.actor.update({ [targetProp]: !currentVal });
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const { element } = this;
    element.addEventListener("contextmenu", (event) => {
      const target = event.target.closest("[data-action='roll']");
      if (!target) return;

      // Pass the correct information to the _onRoll function.
      DeltaGreenActorSheet._onRoll.call(this, event, target);
    });

    if (this.actor.isOwner) {
      const handler = (ev) => this._onDragStart(ev);
      element.querySelectorAll("li.item").forEach((li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
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

  static _toggleLethality(event, target) {
    const { itemId } = target.dataset;
    const isLethal = target.dataset.isLethal?.length === 0;
    const item = this.actor.items.get(itemId);
    item.update({ "system.isLethal": !isLethal });
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
        label:
          game.i18n.localize(`DG.TypeSkills.${skill.group}`) +
          ` (${skill.label})`,
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
      `DG.SpecialTraining.Dialog.${action}SpecialTraining`,
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

  static _toggleEquipped(event, target) {
    event.preventDefault();
    const { id } = target.dataset;
    const item = this.actor.items.get(id);

    const targetProp = "system.equipped";
    const currentVal = foundry.utils.getProperty(item, targetProp);
    item.update({ [targetProp]: !currentVal });
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

  activateEditor(target, editorOptions, initialContent) {
    editorOptions.content_css = "./systems/deltagreen/css/editor.css";
    return super.activateEditor(target, editorOptions, initialContent);
  }
}
