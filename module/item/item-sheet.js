import {
  DGPercentileRoll,
  DGLethalityRoll,
  DGDamageRoll,
  DGSanityDamageRoll,
} from "../roll/roll.js";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class DeltaGreenItemSheet extends foundry.appv1.sheets
  .ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["deltagreen", "sheet", "item"],
      width: 520,
      height: 600,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "attributes",
        },
      ],
    });
  }

  /** @override */
  get template() {
    const path = "systems/deltagreen/templates/item";

    // unique item sheet by type, like `weapon-sheet.html`.
    return `${path}/item-${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const data = super.getData();

    data.enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.object.system.description,
        { async: true }
      );

    if (data.item.type === "tome" || data.item.type === "ritual") {
      data.enrichedHandlerNotes =
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.object.system.handlerNotes,
          { async: true }
        );
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  setPosition(options = {}) {
    const position = super.setPosition(options);
    const sheetBody = this.element.find(".sheet-body");
    const bodyHeight = position.height - 192;
    sheetBody.css("height", bodyHeight);
    return position;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    // eslint-disable-next-line no-useless-return
    if (!this.options.editable) return;

    // Rollable abilities - bind to everything with the 'Rollable' class
    html.find(".rollable").click(this._onRoll.bind(this));
    html.find(".rollable").contextmenu(this._onRoll.bind(this)); // this is for right-click, which triggers the roll modifier dialogue for most rolls

    // toggle whether information is shown to a player for a tome or not
    html.find(".tome-show-hide-info").click((event) => {
      event.preventDefault();

      this.item.system.revealed = !this.item.system.revealed;

      this.item.update({ "system.revealed": this.item.system.revealed });
    });
  }

  /**
   * Handle clickable rolls.
   *
   * @param {Event} event   The originating click event
   * @async
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const { dataset } = element;

    if (event && event.which === 2) {
      // probably don't want rolls to trigger from a middle mouse click so just kill it here
      return;
    }

    //const item = this.actor.items.get(dataset.iid);
    const rollOptions = {
      rollType: dataset.rolltype,
      key: dataset.key,
      //actor: this,
      specialTrainingName: dataset?.name || null, // Only applies to Special Training Rolls
      item: this,
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
        let combinedFormula;

        const { successLoss, failedLoss } = this.item.system.sanity;
        combinedFormula = `{${successLoss}, ${failedLoss}}`;

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
}
