import { BASE_TEMPLATE_PATH } from "../config.js";
import DGSheetMixin from "./base-sheet.js";
import { createDGRollFromDataset, processDGRoll } from "../roll/roll.js";

const { ItemSheetV2 } = foundry.applications.sheets;
const ITEM_PARTS_PATH = `${BASE_TEMPLATE_PATH}/item/parts`;

/** Tab group id used by item sheet templates (`data-group="primary"`). */
const ITEM_TAB_GROUP = "primary";

/** Tab and part layout per item type. */
const ITEM_SHEET_LAYOUT = /** @type {const} */ ({
  weapon: {
    parts: {
      header: { template: `${ITEM_PARTS_PATH}/weapon-header.html` },
      description: {
        template: `${ITEM_PARTS_PATH}/weapon-description.html`,
        scrollable: [""],
      },
    },
  },
  gear: {
    parts: {
      header: { template: `${ITEM_PARTS_PATH}/gear-header.html` },
      description: {
        template: `${ITEM_PARTS_PATH}/gear-description.html`,
        scrollable: [""],
      },
    },
  },
  armor: {
    parts: {
      header: { template: `${ITEM_PARTS_PATH}/armor-header.html` },
      description: {
        template: `${ITEM_PARTS_PATH}/armor-description.html`,
        scrollable: [""],
      },
    },
  },
  bond: {
    parts: {
      header: { template: `${ITEM_PARTS_PATH}/bond-header.html` },
      description: {
        template: `${ITEM_PARTS_PATH}/bond-description.html`,
        scrollable: [""],
      },
    },
  },
  motivation: {
    parts: {
      header: { template: `${ITEM_PARTS_PATH}/motivation-header.html` },
      description: {
        template: `${ITEM_PARTS_PATH}/motivation-description.html`,
        scrollable: [""],
      },
    },
  },
  tome: {
    tabs: {
      initial: "description",
      tabs: [
        { id: "description", label: "DG.ItemWindow.Tome.Description" },
        {
          id: "handler",
          label: "DG.ItemWindow.Tome.HandlerOnlyTabHeader",
          gmOnly: true,
        },
      ],
    },
    parts: {
      header: { template: `${ITEM_PARTS_PATH}/tome-header.html` },
      tabs: { template: "templates/generic/tab-navigation.hbs" },
      description: {
        template: `${ITEM_PARTS_PATH}/tome-description.html`,
        scrollable: [""],
      },
      handler: {
        template: `${ITEM_PARTS_PATH}/tome-handler.html`,
        scrollable: [""],
      },
    },
  },
  ritual: {
    tabs: {
      initial: "description",
      tabs: [
        { id: "description", label: "DG.ItemWindow.Tome.Description" },
        {
          id: "handler",
          label: "DG.ItemWindow.Tome.HandlerOnlyTabHeader",
          gmOnly: true,
        },
      ],
    },
    parts: {
      header: { template: `${ITEM_PARTS_PATH}/ritual-header.html` },
      tabs: { template: "templates/generic/tab-navigation.hbs" },
      description: {
        template: `${ITEM_PARTS_PATH}/ritual-description.html`,
        scrollable: [""],
      },
      handler: {
        template: `${ITEM_PARTS_PATH}/ritual-handler.html`,
        scrollable: [""],
      },
    },
  },
});

/**
 * @extends {DGSheetMixin(ItemSheetV2)}
 */
export default class DGItemSheet extends DGSheetMixin(ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = /** @type {const} */ ({
    classes: ["item"],
    position: { width: 520, height: 600 },
    actions: {
      roll: DGItemSheet._onRoll,
      toggleTomeRevealed: DGItemSheet._toggleTomeRevealed,
    },
  });

  /** @inheritdoc */
  get item() {
    return this.document;
  }

  /** @inheritdoc */
  _configureRenderParts(options) {
    const layout = ITEM_SHEET_LAYOUT[this.item.type];
    if (!layout) return super._configureRenderParts(options);

    const parts = foundry.utils.deepClone(layout.parts);
    if (layout.tabs) {
      const tabIds = layout.tabs.tabs
        .filter((tab) => !tab.gmOnly || game.user.isGM)
        .map((tab) => tab.id);
      for (const partId of Object.keys(parts)) {
        if (partId === "tabs" || partId === "header") continue;
        if (!tabIds.includes(partId)) delete parts[partId];
      }
    }
    Object.values(parts).forEach((p) => {
      p.templates ??= [];
    });
    return parts;
  }

  /** @inheritdoc */
  _getTabsConfig(group) {
    const layout = ITEM_SHEET_LAYOUT[this.item.type];
    if (!layout?.tabs || group !== ITEM_TAB_GROUP) {
      return super._getTabsConfig(group);
    }

    const tabs = layout.tabs.tabs.filter((tab) => !tab.gmOnly || game.user.isGM);
    return { ...layout.tabs, tabs };
  }

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    if (partId === "tabs") partContext.tabClasses = "sheet-tabs";
    return partContext;
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const layout = ITEM_SHEET_LAYOUT[this.item.type];
    if (layout?.tabs) {
      const { initial } = layout.tabs;
      const tabIds = layout.tabs.tabs
        .filter((tab) => !tab.gmOnly || game.user.isGM)
        .map((tab) => tab.id);
      if (!tabIds.includes(this.tabGroups[ITEM_TAB_GROUP])) {
        this.tabGroups[ITEM_TAB_GROUP] = initial;
      }
      context.tabs = this._prepareTabs(ITEM_TAB_GROUP);
    }

    context.owner = this.document.isOwner;

    return context;
  }

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this._setRightClickListeners();
  }

  /**
   * Right-click on roll controls opens the modifier dialog.
   * @returns {void}
   */
  _setRightClickListeners() {
    this.element.addEventListener("contextmenu", (event) => {
      const target = event.target.closest("[data-action='roll']");
      if (!target) return;
      event.preventDefault();
      DGItemSheet._onRoll.call(this, event, target);
    });
  }

  /**
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onRoll(event, target) {
    if (event.which === 2) return;

    const roll = createDGRollFromDataset(target.dataset, {
      actor: this.actor,
      item: this.item,
      element: target,
      sanityDamageSource: "item",
    });
    await processDGRoll(event, roll);
  }

  /**
   * Toggle whether tome/ritual details are visible to players.
   * @param {PointerEvent} event
   */
  static _toggleTomeRevealed(event) {
    event.preventDefault();
    const revealed = !this.item.system.revealed;
    this.item.update({ "system.revealed": revealed });
  }
}
